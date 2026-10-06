"""
Deprecated: use repositories.chat_repository instead.
This module is kept for backward compatibility.
"""
from repositories.chat_repository import (
  create_chat_session,
  save_chat_message,
  get_chat_history,
  get_all_chat_sessions,
)

__all__ = [
  "create_chat_session",
  "save_chat_message",
  "get_chat_history",
  "get_all_chat_sessions",
]