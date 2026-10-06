from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class Source(BaseModel):
  document: str
  page: Optional[int] = None

class ChatRequest(BaseModel):
  message: str
  session_id: Optional[UUID] = None
  user_id: Optional[int] = None
  account: Optional[str] = None

class ChatResponse(BaseModel):
  session_id: Optional[UUID] = None
  answer: str
  sources: list[Source] = Field(default_factory=list)