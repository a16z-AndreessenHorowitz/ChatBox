from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from schemas.chat_schema import ChatRequest, ChatResponse
from services.auth_service import get_current_user, get_current_user_optional
from services.chat_service import (
  handle_chat,
  get_chat_history_service,
  get_chat_sessions_service,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(
  request: ChatRequest,
  current_user: dict | None = Depends(get_current_user_optional),
):
  if not request.message:
    raise HTTPException(status_code=400, detail="Message không được để trống")
  try:
    user_id = int(current_user["sub"]) if current_user and "sub" in current_user else None
    return await handle_chat(request, user_id_from_token=user_id)
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

