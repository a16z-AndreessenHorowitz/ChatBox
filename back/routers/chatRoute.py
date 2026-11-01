from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from google.genai.errors import ClientError, ServerError
from schemas.chat_schema import ChatRequest, ChatResponse
from services.auth_service import get_current_user
from services.chat_service import (
  handle_chat,
  stream_chat,
  get_chat_history_service,
  get_chat_sessions_service,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/stream")
async def chat_stream(
  request: ChatRequest,
  current_user: dict = Depends(get_current_user),
):
  if not request.message:
    raise HTTPException(status_code=400, detail="Message không được để trống")
  user_id = int(current_user["sub"])
  print(
    "[ChatRoute] Nhận stream request:",
    {
      "message": request.message,
      "embedding_dimensions": len(request.embedding),
      "session_id": str(request.session_id) if request.session_id else None,
      "user_id": user_id,
    },
    flush=True,
  )
  return StreamingResponse(
    stream_chat(request, user_id),
    media_type="text/event-stream",
    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
  )


@router.post("", response_model=ChatResponse)
async def chat(
  request: ChatRequest,
  current_user: dict = Depends(get_current_user),
):
  if not request.message:
    raise HTTPException(status_code=400, detail="Message không được để trống")
  try:
    user_id = int(current_user["sub"])

    print(
      "[ChatRoute] Nhận request từ frontend:",
      {
        "message": request.message,
        "embedding_dimensions": len(request.embedding),
        "session_id": str(request.session_id) if request.session_id else None,
        "user_id": user_id,
      },
      flush=True,
    )

    return await handle_chat(request, user_id_from_token=user_id)
  except HTTPException:
    raise
  except (ClientError, ServerError) as e:
    status_code = getattr(e, "code", None) or getattr(e, "status_code", None)
    if status_code == 503:
      raise HTTPException(
        status_code=503,
        detail="Các model Gemini đang quá tải. Vui lòng thử gửi lại sau ít phút.",
      ) from e
    if status_code == 429:
      raise HTTPException(
        status_code=429,
        detail="Gemini đang giới hạn số lượt gọi. Vui lòng chờ một chút rồi thử lại.",
      ) from e
    raise HTTPException(
      status_code=502,
      detail="Các model Gemini hiện chưa xử lý được yêu cầu. Vui lòng thử lại sau.",
    ) from e
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Không thể gọi Gemini API: {str(e)}")


@router.get("/history/{session_id}")
def get_history(
  session_id: UUID,
  current_user: dict = Depends(get_current_user),
):
  user_id = int(current_user["sub"])
  return get_chat_history_service(session_id, user_id)


@router.get("/sessions")
def get_sessions(
  current_user: dict = Depends(get_current_user),
):
  user_id = int(current_user["sub"])
  return get_chat_sessions_service(user_id)

