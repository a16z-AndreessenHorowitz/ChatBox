from typing import TypedDict, Optional
from uuid import UUID
from datetime import datetime


class ChatMessageDict(TypedDict, total=False):
  id: UUID
  role: str
  content: str
  sources: Optional[list]
  response_time_ms: Optional[int]
  feedback: Optional[int]
  feedback_comment: Optional[str]
  created_at: datetime


class ChatSessionDict(TypedDict):
  id: UUID
  title: Optional[str]
  created_at: datetime
  updated_at: datetime
