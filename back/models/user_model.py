from typing import TypedDict
from datetime import datetime


class UserDict(TypedDict):
  id: int
  password_hash: str


class OtpChallengeDict(TypedDict):
  code_hash: str
  expires_at: datetime


class VerificationTokenDict(TypedDict):
  account: str
  expires_at: datetime
