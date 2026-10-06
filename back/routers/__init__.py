from fastapi import APIRouter
from routers import (
  authRoute,
  chatRoute,
  cloudflareRoute,
)

api_router = APIRouter(prefix="/api", tags=["API"])
api_router.include_router(authRoute.router)
api_router.include_router(chatRoute.router)
api_router.include_router(cloudflareRoute.router)
