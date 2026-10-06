from uuid import UUID
from fastapi import HTTPException
from google import genai
from core.chat import GEMINI_API_KEY, GEMINI_MODEL
from schemas.chat_schema import ChatRequest, ChatResponse
import repositories.chat_repository as chat_repo
import repositories.user_repository as user_repo

client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """
Bạn là chatbot tư vấn tuyển sinh đại học.

Vai trò:
- Bạn là trợ lý AI chuyên tư vấn tuyển sinh đại học.
- Hỗ trợ học sinh tìm hiểu về ngành học, phương thức xét tuyển, tổ hợp môn,
  điểm chuẩn, học phí, học bổng, chương trình đào tạo và các thông tin liên quan
  đến tuyển sinh.

Phạm vi:
- Chỉ tập trung vào các câu hỏi liên quan đến tuyển sinh và lựa chọn ngành/trường.
- Nếu người dùng hỏi ngoài phạm vi tuyển sinh, hãy lịch sự thông báo rằng bạn
  chỉ hỗ trợ tư vấn tuyển sinh.

Cách trả lời:
- Trả lời bằng tiếng Việt, rõ ràng, dễ hiểu và thân thiện.
- Trả lời trực tiếp vào câu hỏi, không dài dòng không cần thiết.
- Sử dụng Markdown phù hợp: đoạn văn, danh sách, bảng so sánh hoặc tiêu đề khi cần.
- Không sử dụng HTML.

Độ chính xác:
- Không được tự bịa hoặc suy đoán thông tin.
- Nếu không chắc chắn về thông tin, hãy nói rõ rằng bạn không chắc chắn.
- Nếu không có đủ dữ liệu để trả lời, hãy nói rằng bạn chưa có đủ thông tin và
  không tự tạo ra câu trả lời.
- Không khẳng định các thông tin tuyển sinh nếu không có cơ sở đáng tin cậy.
- Khi hệ thống RAG được tích hợp, chỉ sử dụng thông tin được cung cấp từ nguồn
  dữ liệu tuyển sinh để trả lời các thông tin cần xác thực.
"""


async def generate_answer(message: str) -> str:
  # Tạo một phiên chat mới với system instruction
  chat= client.chats.create(
    model=GEMINI_MODEL,
    config={
      "system_instruction": SYSTEM_PROMPT,
    }
  )
  # Gửi tin nhắn qua chat.send_message theo đúng chuẩn khuyến nghị
  response= chat.send_message(message)
  return response.text 


async def handle_chat(request: ChatRequest, user_id_from_token: int | None = None) -> ChatResponse:
  # Xác định user_id (ưu tiên từ token, sau đó từ request.user_id hoặc request.account)
  user_id = user_id_from_token or request.user_id
  if not user_id and request.account:
    user_id = user_repo.get_user_id_by_account(request.account)

  # Nếu người dùng chưa đăng nhập (khách vãng lai): chỉ trả lời, không tạo session_id và không lưu vào database
  if not user_id:
    answer = await generate_answer(request.message)
    return ChatResponse(
      session_id=None,
      answer=answer,
      sources=[],
    )

  # Nếu người dùng đã đăng nhập:
  # 1. Nếu chưa có session_id thì tạo conversation mới gắn với user_id
  session_id = request.session_id
  if session_id is None:
    session_id = chat_repo.create_chat_session(
      user_id=user_id,
      title=request.message[:100],
    )

  # 2. Lưu câu hỏi của user vào database
  chat_repo.save_chat_message(
    session_id=session_id,
    role="user",
    content=request.message,
  )

  # 3. Gọi Gemini API
  answer = await generate_answer(request.message)

  # 4. Lưu câu trả lời của bot vào database
  chat_repo.save_chat_message(
    session_id=session_id,
    role="bot",
    content=answer,
  )

  return ChatResponse(
    session_id=session_id,
    answer=answer,
    sources=[],
  )


def get_chat_history_service(session_id: UUID, user_id: int) -> dict:
  session = chat_repo.get_chat_session(session_id)
  if not session or session["user_id"] != user_id:
    raise HTTPException(
      status_code=404,
      detail="Phiên trò chuyện không tồn tại hoặc không có quyền truy cập.",
    )
  messages = chat_repo.get_chat_history(session_id)
  return {
    "session_id": session_id,
    "messages": messages,
  }


def get_chat_sessions_service(user_id: int) -> list[dict]:
  return chat_repo.get_all_chat_sessions(user_id)

