from services.chat_history_service import save_chat_message
from services.chat_history_service import create_chat_session
from services.chat_history_service import get_chat_history
from uuid import UUID
from fastapi import APIRouter, HTTPException
from schemas.chat_schema import (
  ChatRequest,
  ChatResponse,
)
from services.chat_service import generate_answer

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("",response_model=ChatResponse)
async def chat(request: ChatRequest):
  if not request.message:
    raise HTTPException(status_code=400, detail="Message không được để trống")
  try:
    #1 Nếu chưa có session_id thì tạo consevation mới
    session_id= request.session_id

    if session_id is None:
      session_id=create_chat_session(
        title=request.message[:100]
      )

    #2 Lưu câu hỏi của user vào database
    save_chat_message(
      session_id=session_id,
      role="user",
      content=request.message 
    )

    #3 Gọi Gemini API
    answer = await generate_answer(request.message)
    
    #4 Lưu câu trả lời của bot vào database
    save_chat_message(
      session_id=session_id,
      role="bot",
      content=answer
    )
    
    return ChatResponse(
      session_id=session_id,
      answer=answer,
      sources=[]
    )
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Không thể gọi Gemini API: {str(e)}")

@router.get("/history/{session_id}")
def get_history(session_id: UUID):

  rows= get_chat_history(session_id)
  
  messages=[]

  for row in rows:
    messages.append({
      "id": row[0],
      "role": row[1],
      "content": row[2],
      "sources": row[3],
      "response_time_ms": row[4],
      "feedback": row[5],
      "feedback_comment": row[6],
      "created_at": row[7],
    })
  
  return {
    "session_id": session_id,
    "messages": messages
  }

from services.chat_history_service import get_all_chat_sessions

@router.get("/sessions")
def get_sessions():
  rows = get_all_chat_sessions()
  sessions = []
  for row in rows:
    sessions.append({
      "id": row[0],
      "title": row[1],
      "created_at": row[2],
      "updated_at": row[3]
    })
  return sessions
