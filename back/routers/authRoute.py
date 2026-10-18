from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from core.config import AUTH_COOKIE_SAMESITE, AUTH_COOKIE_SECURE, JWT_REFRESH_TOKEN_EXPIRE_DAYS
from schemas.auth_schema import (
  CompleteRegisterRequest,
  LoginRequest,
  SendOtpRequest,
  VerifyOtpRequest,
)
from services.auth_service import (
  AuthServiceError,
  complete_register_service,
  get_current_user,
  login_service,
  refresh_access_token_service,
  send_otp_service,
  verify_otp_service,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/send-otp")
def send_otp(data: SendOtpRequest):
  return run_service(send_otp_service, data.account)


@router.post("/verify-otp")
def verify_otp(data: VerifyOtpRequest):
  return run_service(verify_otp_service, data.account, data.code)


@router.post("/complete-register")
def complete_register(data: CompleteRegisterRequest):
  return run_service(
    complete_register_service,
    data.tempToken,
    data.password,
    data.confirmPassword,
  )


@router.post("/login")
def login(data: LoginRequest, response: Response):
  result = run_service(login_service, data.account, data.password)
  refresh_token = result.pop("refresh_token")
  response.set_cookie(
    "refreshToken", refresh_token, httponly=True, secure=AUTH_COOKIE_SECURE,
    samesite=AUTH_COOKIE_SAMESITE, path="/api/auth", max_age=JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
  )
  return result


@router.post("/refresh")
def refresh(response: Response, refresh_token: str | None = Cookie(default=None, alias="refreshToken")):
  if not refresh_token:
    raise HTTPException(status_code=401, detail="Thiếu refresh token.")
  try:
    return refresh_access_token_service(refresh_token)
  except AuthServiceError as error:
    response.delete_cookie("refreshToken", path="/api/auth", httponly=True, secure=AUTH_COOKIE_SECURE,
                           samesite=AUTH_COOKIE_SAMESITE)
    return JSONResponse(status_code=error.status_code, content={"detail": error.message}, headers={
      "Set-Cookie": response.headers.get("set-cookie", "")
    })


@router.post("/logout")
def logout(response: Response):
  response.delete_cookie("refreshToken", path="/api/auth", httponly=True, secure=AUTH_COOKIE_SECURE,
                         samesite=AUTH_COOKIE_SAMESITE)
  return {"ok": True}


def run_service(service, *args):
  try:
    return service(*args)
  except AuthServiceError as error:
    raise HTTPException(status_code=error.status_code, detail=error.message)
@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
  return {
    "ok": True,
    "user_id": int(current_user["sub"]),
    "role": current_user.get("role", "user"),
  }
