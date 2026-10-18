from fastapi import Depends, HTTPException, status

from services.auth_service import get_current_user


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
  if current_user.get("role", "user").lower() == "user":
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Bạn không có quyền tải tài liệu lên.",
    )
  return current_user
