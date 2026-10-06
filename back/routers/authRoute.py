from fastapi import APIRouter, Depends, HTTPException
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
def login(data: LoginRequest):
  return run_service(login_service, data.account, data.password)


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