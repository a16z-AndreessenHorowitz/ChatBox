import os
import torch
import torch.nn.functional as F
from typing import Any, Dict, List
from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForFeatureExtraction

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "e5-small-onnx")

# Biến global lưu model/tokenizer đã nạp vào bộ nhớ (Singleton Pattern dạng Functional)
_TOKENIZER = None
_MODEL = None


def _load_model_if_needed() -> None:
    """Nạp Tokenizer và ONNX Model vào RAM nếu chưa được nạp (Lazy Loading)."""
    global _TOKENIZER, _MODEL
    if _TOKENIZER is None or _MODEL is None:
        if not os.path.exists(MODEL_DIR):
            raise FileNotFoundError(
                f"Chưa tìm thấy mô hình ONNX tại {MODEL_DIR}. "
                "Vui lòng chạy lệnh `python -m services.document.download_embedding_model` trước!"
            )
        print(f"Đang nạp Embedding Model ONNX từ: {MODEL_DIR}")
        _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_DIR)
        _MODEL = ORTModelForFeatureExtraction.from_pretrained(MODEL_DIR)
        print("Nạp Embedding Model thành công (100% Offline).")


def _mean_pooling(model_output, attention_mask: torch.Tensor) -> torch.Tensor:
    """Tính trung bình các token embeddings kết hợp attention mask."""
    token_embeddings = model_output[0]
    input_mask_expanded = (
        attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    )
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(
        input_mask_expanded.sum(1), min=1e-9
    )


def _encode(texts: List[str]) -> List[List[float]]:
    """Hàm lõi thực hiện tokenization, chạy ONNX inference và chuẩn hóa vector L2."""
    _load_model_if_needed()
    encoded_input = _TOKENIZER(
        texts,
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="pt",
    )
    outputs = _MODEL(**encoded_input)
    embeddings = _mean_pooling(outputs, encoded_input["attention_mask"])
    embeddings = F.normalize(embeddings, p=2, dim=1)
    return embeddings.tolist()


def embed_documents(chunks: List[str]) -> List[List[float]]:
    """
    Tạo danh sách vector 384 chiều cho các đoạn văn bản (PDF chunks) ở Backend.
    Tự động thêm tiền tố 'passage: ' theo quy ước chuẩn của mô hình E5.
    """
    if not chunks:
        return []
    formatted_chunks = [f"passage: {chunk}" for chunk in chunks]
    return _encode(formatted_chunks)


def add_embeddings_to_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Gắn embedding vào từng chunk để repository có thể lưu xuống pgvector."""
    if not chunks:
        return chunks

    embeddings = embed_documents([chunk["content"] for chunk in chunks])
    if len(embeddings) != len(chunks):
        raise RuntimeError(
            f"Số lượng embedding ({len(embeddings)}) không khớp số lượng chunks ({len(chunks)})."
        )

    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding
    return chunks


def embed_query(query: str) -> List[float]:
    """
    Tạo vector 384 chiều cho 1 câu hỏi (Dự phòng ở Backend nếu Client không tự nhúng).
    Tự động thêm tiền tố 'query: ' theo quy ước chuẩn của mô hình E5.
    """
    if not query:
        return []
    formatted_query = f"query: {query}"
    return _encode([formatted_query])[0]


if __name__ == "__main__":
    # Test thử trực tiếp file embedding_service
    sample_texts = [
        "Ngành Công nghệ thông tin lấy điểm chuẩn 25.10 điểm.",
        "Trường xét tuyển thẳng các thí sinh có chứng chỉ IELTS từ 6.0.",
    ]
    print("\n--- Testing embed_documents ---")
    doc_vectors = embed_documents(sample_texts)
    print(f"Số lượng vectors: {len(doc_vectors)}")
    print(f"Số chiều của vector: {len(doc_vectors[0]) if doc_vectors else 0}")

    print("\n--- Testing embed_query ---")
    query_vector = embed_query("Điểm chuẩn ngành CNTT?")
    print(f"Số chiều vector câu hỏi: {len(query_vector)}")
