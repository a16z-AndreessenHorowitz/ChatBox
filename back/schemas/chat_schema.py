from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class Source(BaseModel):
  document: str
  page: Optional[int] = None

class ChatRequest(BaseModel):
  message: str
  embedding: list[float] = Field(min_length=384, max_length=384)
  session_id: Optional[UUID] = None

class ChatResponse(BaseModel):
  session_id: Optional[UUID] = None
  answer: str
  sources: list[Source] = Field(default_factory=list)
