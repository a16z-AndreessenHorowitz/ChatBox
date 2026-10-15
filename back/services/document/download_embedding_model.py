import os
import shutil
from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForFeatureExtraction, ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig

MODEL_ID = "intfloat/multilingual-e5-small"
SAVE_DIR = os.path.join(os.path.dirname(__file__), "models", "e5-small-onnx")

def download_and_export_onnx():
    # Xóa folder cũ bị nặng nếu có
    if os.path.exists(SAVE_DIR):
        shutil.rmtree(SAVE_DIR)
        
    print(f"Đang tải mô hình gốc {MODEL_ID}...")
    os.makedirs(SAVE_DIR, exist_ok=True)
    
    # 1. Tải và lưu Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    tokenizer.save_pretrained(SAVE_DIR)

    # 2. Export bản FP32 tạm thời
    model = ORTModelForFeatureExtraction.from_pretrained(MODEL_ID, export=True)
    
    # 3. Nén Quantize sang INT8 (Giúp giảm dung lượng từ ~120MB xuống ~30MB)
    print("Đang nén mô hình sang INT8 Quantized (Siêu nhẹ)...")
    quantizer = ORTQuantizer.from_pretrained(model)
    dqconfig = AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
    
    # Lưu file đã nén thành model_quantized.onnx
    quantizer.quantize(save_dir=SAVE_DIR, quantization_config=dqconfig)
    
    # 4. Dọn dẹp: Đổi tên file quantized thành model.onnx chính và xóa file nặng FP32
    fp32_file = os.path.join(SAVE_DIR, "model.onnx")
    quant_file = os.path.join(SAVE_DIR, "model_quantized.onnx")
    
    if os.path.exists(quant_file):
        if os.path.exists(fp32_file):
            os.remove(fp32_file)  # Xóa file FP32 nặng (~118MB)
        os.rename(quant_file, fp32_file)  # Đổi file int8 nhẹ thành file chính

    print(f" Đã tải và nén thành công! Kiểm tra lại dung lượng tại: {SAVE_DIR}")

if __name__ == "__main__":
    download_and_export_onnx()