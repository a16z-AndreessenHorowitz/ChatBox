import hashlib
import hmac
import re
import secrets
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr

import psycopg2

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
from database.connection import DatabaseConnectionError, get_connection
from database.auth import initialize_auth_database


PASSWORD_ITERATIONS = 310_000


class AuthServiceError(Exception):
  def __init__(self, message: str, status_code: int = 400):
    self.message = message
    self.status_code = status_code
    super().__init__(message)


def _get_connection():
  try:
    initialize_auth_database()
    return get_connection()
  except DatabaseConnectionError as error:
    raise AuthServiceError(str(error), 503) from error


def _normalize_account(account: str) -> str:
  return str(account).strip().lower()


def _user_exists(account: str) -> bool:
  with _get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute("SELECT 1 FROM users WHERE account = %s", (account,))
      return cursor.fetchone() is not None


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


def _send_otp_email(account: str, code: str):
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
  normalized_account = _normalize_account(account)
  if _user_exists(normalized_account):
    raise AuthServiceError("Tài khoản này đã được đăng ký.", 409)

  code = f"{secrets.randbelow(1_000_000):06d}"
  _send_otp_email(normalized_account, code)

  code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
  expires_at = datetime.now(timezone.utc).timestamp() + OTP_TTL_SECONDS
  with _get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        """
        INSERT INTO otp_challenges (account, code_hash, expires_at)
        VALUES (%s, %s, TO_TIMESTAMP(%s))
        ON CONFLICT (account) DO UPDATE SET
          code_hash = EXCLUDED.code_hash,
          expires_at = EXCLUDED.expires_at
        """,
        (normalized_account, code_hash, expires_at),
      )
    connection.commit()

  return {
    "ok": True,
    "message": "Đã gửi mã OTP qua email.",
    "expiresIn": OTP_TTL_SECONDS,
  }


def verify_otp_service(account: str, code: str) -> dict:
  normalized_account = _normalize_account(account)
  with _get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT code_hash, expires_at FROM otp_challenges WHERE account = %s",
        (normalized_account,),
      )
      challenge = cursor.fetchone()

      if challenge is None:
        raise AuthServiceError("Vui lòng yêu cầu mã OTP mới.")

      code_hash, expires_at = challenge
      now = datetime.now(timezone.utc)
      # thời gian hết hạn
      if expires_at < now:
        cursor.execute(
          "DELETE FROM otp_challenges WHERE account = %s",
          (normalized_account,),
        )
        connection.commit()
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
      cursor.execute("DELETE FROM otp_challenges WHERE account = %s", (normalized_account,))
      # lưu temp token vào bảng verification_tokens
      cursor.execute(
        "INSERT INTO verification_tokens (token, account, expires_at) VALUES (%s, %s, %s)",
        (temp_token, normalized_account, token_expires_at),
      )
    connection.commit()

  return {"ok": True, "token": temp_token}


def complete_register_service(
  temp_token: str,
  password: str,
  confirm_password: str,
) -> dict:
  _validate_password(password, confirm_password)

  with _get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT account, expires_at FROM verification_tokens WHERE token = %s",
        (temp_token,),
      )
      verification = cursor.fetchone()
      if verification is None:
        raise AuthServiceError("Phiên đăng ký không hợp lệ hoặc đã hết hạn.")

      account, expires_at = verification
      if expires_at < datetime.now(timezone.utc):
        cursor.execute(
          "DELETE FROM verification_tokens WHERE token = %s",
          (temp_token,),
        )
        connection.commit()
        raise AuthServiceError("Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.")

      try:
        cursor.execute(
          "INSERT INTO users (account, password_hash) VALUES (%s, %s)",
          (account, _hash_password(password)),
        )
      except psycopg.errors.UniqueViolation as error:
        connection.rollback()
        raise AuthServiceError("Tài khoản này đã được đăng ký.", 409) from error

      cursor.execute(
        "DELETE FROM verification_tokens WHERE token = %s",
        (temp_token,),
      )
    connection.commit()

  return {
    "ok": True,
    "message": "Đăng ký thành công.",
    "token": secrets.token_urlsafe(32),
    "account": account,
  }


def login_service(account: str, password: str) -> dict:
  normalized_account = _normalize_account(account)
  with _get_connection() as connection:
    with connection.cursor() as cursor:
      cursor.execute(
        "SELECT password_hash FROM users WHERE account = %s",
        (normalized_account,),
      )
      user = cursor.fetchone()

  if user is None or not _verify_password(password, user[0]):
    raise AuthServiceError("Email hoặc mật khẩu không đúng.", 401)

  return {
    "ok": True,
    "token": secrets.token_urlsafe(32),
    "account": normalized_account,
    "email": normalized_account,
  }
