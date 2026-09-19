from pydantic import BaseModel, EmailStr, Field


class SendOtpRequest(BaseModel):
  account: EmailStr


class VerifyOtpRequest(BaseModel):
  account: EmailStr
  code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class CompleteRegisterRequest(BaseModel):
  tempToken: str = Field(min_length=20)
  password: str = Field(min_length=8, max_length=128)
  confirmPassword: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
  account: EmailStr
  password: str = Field(min_length=1, max_length=128)
