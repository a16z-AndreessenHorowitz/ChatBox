from __future__ import annotations
from datetime import datetime, timedelta, timezone
import jwt

from core.config import (
  JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
  JWT_ALGORITHM,
  JWT_SECRET_KEY,
  JWT_REFRESH_SECRET_KEY,
  JWT_REFRESH_TOKEN_EXPIRE_DAYS,
)


class InvalidTokenError(Exception):
  def __init__(self, message: str = "Token không hợp lệ hoặc đã hết hạn.", status_code: int = 401):
    self.message = message
    self.status_code = status_code
    super().__init__(message)


def create_access_token(user_id: int, role: str) -> str:
  expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
  payload = {
    "sub": str(user_id),
    "role": role,
    "exp": expires_at,
  }
  token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
  return token


def decode_access_token(token: str) -> dict:
  try:
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    return payload
  except jwt.ExpiredSignatureError:
    raise InvalidTokenError("Token đã hết hạn.", 401)
  except jwt.PyJWTError:
    raise InvalidTokenError("Token không hợp lệ.", 401)


def create_refresh_token(user_id: int, role: str) -> str:
  expires_at = datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
  return jwt.encode(
    {"sub": str(user_id), "role": role, "type": "refresh", "exp": expires_at},
    JWT_REFRESH_SECRET_KEY,
    algorithm=JWT_ALGORITHM,
  )


def decode_refresh_token(token: str) -> dict:
  try:
    payload = jwt.decode(token, JWT_REFRESH_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    if payload.get("type") != "refresh":
      raise InvalidTokenError()
    return payload
  except jwt.ExpiredSignatureError:
    raise InvalidTokenError("Refresh token đã hết hạn.", 401)
  except jwt.PyJWTError:
    raise InvalidTokenError("Refresh token không hợp lệ.", 401)
