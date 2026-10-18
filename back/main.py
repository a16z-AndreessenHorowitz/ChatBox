
from contextlib import asynccontextmanager

from database.init_db import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import api_router
from core.config import FRONTEND_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI):
  try:
    init_db()
    print("Database khởi tạo thành công!")
  except Exception as e:
    print(f" Lỗi khởi tạo Database: {e}")
    raise e
  yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=FRONTEND_ORIGINS,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.include_router(api_router)
