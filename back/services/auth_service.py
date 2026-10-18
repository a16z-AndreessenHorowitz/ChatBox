from __future__ import annotations
import hashlib
import hmac
import re
import secrets
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr

import psycopg

from core.config import (
  OTP_TTL_SECONDS,
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_USERNAME,
  VERIFICATION_TTL_SECONDS,
)
import repositories.user_repository as user_repo


PASSWORD_ITERATIONS = 310_000


class AuthServiceError(Exception):
  def __init__(self, message: str, status_code: int = 400):
    self.message = message
    self.status_code = status_code
    super().__init__(message)


def normalize_account(account: str) -> str:
  return str(account).strip().lower()


def _validate_password(password: str, confirm_password: str):
  if password != confirm_password:
    raise AuthServiceError("Mật khẩu xác nhận không khớp.")
  if not re.search(r"[A-Z]", password) or not re.search(r"\d", password):
    raise AuthServiceError("Mật khẩu phải có ít nhất 1 chữ hoa và 1 chữ số.")


def _hash_password(password: str) -> str:
  salt = secrets.token_bytes(16)
  digest = hashlib.pbkdf2_hmac(
    "sha256",
    password.encode("utf-8"),
    salt,
    PASSWORD_ITERATIONS,
  )
  return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
  try:
    algorithm, iterations_text, salt_hex, digest_hex = stored_hash.split("$", 3)
    if algorithm != "pbkdf2_sha256":
      return False
    iterations = int(iterations_text)
    salt = bytes.fromhex(salt_hex)
    expected_digest = bytes.fromhex(digest_hex)
  except (ValueError, TypeError):
    return False

  actual_digest = hashlib.pbkdf2_hmac(
    "sha256",
    password.encode("utf-8"),
    salt,
    iterations,
  )
  return hmac.compare_digest(actual_digest, expected_digest)


def send_otp_email(account: str, code: str):
  if not SMTP_USERNAME or not SMTP_PASSWORD or not SMTP_FROM_EMAIL:
    raise AuthServiceError(
      "Thiếu cấu hình Gmail SMTP trong file back/.env.",
      503,
    )

  message = EmailMessage()
  message["Subject"] = "Mã xác thực đăng ký TS"
  message["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
  message["To"] = account
  message.set_content(
    f"Mã xác thực đăng ký tài khoản TS của bạn là: {code}\n\n"
    f"Mã có hiệu lực trong {OTP_TTL_SECONDS // 60} phút."
  )

  try:
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
      smtp.starttls()
      smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
      smtp.send_message(message)
  except (OSError, smtplib.SMTPException) as error:
    raise AuthServiceError(
      "Không thể gửi email OTP. Kiểm tra Gmail App Password và SMTP.",
      502,
    ) from error


def send_otp_service(account: str) -> dict:
  normalized_account = normalize_account(account)
  if user_repo.user_exists(normalized_account):
    raise AuthServiceError("Tài khoản này đã được đăng ký.", 409)

  code = f"{secrets.randbelow(1_000_000):06d}"
  send_otp_email(normalized_account, code)

  code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
  expires_at = datetime.now(timezone.utc).timestamp() + OTP_TTL_SECONDS
  user_repo.upsert_otp_challenge(normalized_account, code_hash, expires_at)

  return {
    "ok": True,
    "message": "Đã gửi mã OTP qua email.",
    "expiresIn": OTP_TTL_SECONDS,
  }


def verify_otp_service(account: str, code: str) -> dict:
  normalized_account = normalize_account(account)
  challenge = user_repo.get_otp_challenge(normalized_account)

  if challenge is None:
    raise AuthServiceError("Vui lòng yêu cầu mã OTP mới.")

  code_hash = challenge["code_hash"]
  expires_at = challenge["expires_at"]
  now = datetime.now(timezone.utc)
  # thời gian hết hạn
  if expires_at < now:
    user_repo.delete_otp_challenge(normalized_account)
    raise AuthServiceError("Mã OTP đã hết hạn.")

  # nếu chưa hêt hạn hash otp 
  submitted_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
  if not hmac.compare_digest(code_hash, submitted_hash):
    raise AuthServiceError("Mã OTP không chính xác.")

  temp_token = secrets.token_urlsafe(32)
  # thời gian hết hạn của token xác thực đăng ký
  token_expires_at = datetime.fromtimestamp(
    datetime.now(timezone.utc).timestamp() + VERIFICATION_TTL_SECONDS,
    timezone.utc,
  )
  # xoá mã otp đã xác thực thành công
  user_repo.delete_otp_challenge(normalized_account)
  # lưu temp token vào bảng verification_tokens
  user_repo.save_verification_token(temp_token, normalized_account, token_expires_at)

  return {"ok": True, "token": temp_token}


def complete_register_service(
  temp_token: str,
  password: str,
  confirm_password: str,
) -> dict:
  _validate_password(password, confirm_password)

  verification = user_repo.get_verification_token(temp_token)
  if verification is None:
    raise AuthServiceError("Phiên đăng ký không hợp lệ hoặc đã hết hạn.")

  account = verification["account"]
  expires_at = verification["expires_at"]
  if expires_at < datetime.now(timezone.utc):
    user_repo.delete_verification_token(temp_token)
    raise AuthServiceError("Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.")

  try:
    user_id = user_repo.create_user(account, _hash_password(password))
  except psycopg.errors.UniqueViolation as error:
    raise AuthServiceError("Tài khoản này đã được đăng ký.", 409) from error

  user_repo.delete_verification_token(temp_token)

  return {
    "ok": True,
    "message": "Đăng ký thành công.",
    "user_id": user_id,
    "account": account,
  }


from services.auth_token import create_access_token, create_refresh_token, decode_access_token, decode_refresh_token

def login_service(account: str, password: str) -> dict:
  normalized_account = normalize_account(account)
  user = user_repo.get_user_by_account(normalized_account)

  if user is None or not _verify_password(password, user["password_hash"]):
    raise AuthServiceError("Email hoặc mật khẩu không đúng.", 401)

  role = user.get("role", "user")
  token = create_access_token(user_id=user["id"], role=role)
  refresh_token = create_refresh_token(user_id=user["id"], role=role)

  return {
    "ok": True,
    "user_id": user["id"],
    "role": role,
    "token": token,
    "refresh_token": refresh_token,
    "account": normalized_account,
    "email": normalized_account,
  }


def refresh_access_token_service(refresh_token: str) -> dict:
  try:
    payload = decode_refresh_token(refresh_token)
  except InvalidTokenError as error:
    raise AuthServiceError(error.message, 401) from error
  user = user_repo.get_user_by_id(int(payload["sub"]))
  if user is None:
    raise AuthServiceError("Tài khoản không còn tồn tại.", 401)
  role = user.get("role", "user")
  return {"ok": True, "token": create_access_token(user["id"], role),
          "user_id": user["id"], "role": role, "email": user["account"]}


def get_user_id_by_account(account: str) -> int | None:
  if not account:
    return None
  normalized_account = normalize_account(account)
  return user_repo.get_user_id_by_account(normalized_account)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_token import InvalidTokenError

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def get_current_user(
  credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
  try:
    return decode_access_token(credentials.credentials)
  except InvalidTokenError as error:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail=error.message,
      headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user_optional(
  credentials: HTTPAuthorizationCredentials | None = Depends(security_optional),
) -> dict | None:
  if not credentials:
    return None
  try:
    return decode_access_token(credentials.credentials)
  except InvalidTokenError:
    return None
