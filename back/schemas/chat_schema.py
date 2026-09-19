from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class Source(BaseModel):
  document: str
  page: Optional[int] = None

class ChatRequest(BaseModel):
  message: str
  session_id: Optional[UUID] = None

class ChatResponse(BaseModel):
  session_id: UUID
  answer: str
  sources: list[Source] = Field(default_factory=list)