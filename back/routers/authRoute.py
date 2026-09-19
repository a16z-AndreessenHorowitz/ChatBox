from fastapi import APIRouter, HTTPException
from schemas.auth_schema import (
  CompleteRegisterRequest,
  LoginRequest,
  SendOtpRequest,
  VerifyOtpRequest,
)
from services.auth_service import (
  AuthServiceError,
  complete_register_service,
  login_service,
  send_otp_service,
  verify_otp_service,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/send-otp")
def send_otp(data: SendOtpRequest):
  return _run_service(send_otp_service, data.account)


@router.post("/verify-otp")
def verify_otp(data: VerifyOtpRequest):
  return _run_service(verify_otp_service, data.account, data.code)


@router.post("/complete-register")
def complete_register(data: CompleteRegisterRequest):
  return _run_service(
    complete_register_service,
    data.tempToken,
    data.password,
    data.confirmPassword,
  )


@router.post("/login")
def login(data: LoginRequest):
  return _run_service(login_service, data.account, data.password)


def _run_service(service, *args):
  try:
    return service(*args)
  except AuthServiceError as error:
    raise HTTPException(status_code=error.status_code, detail=error.message)
