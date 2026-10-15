import sys
sys.dont_write_bytecode = True

import uvicorn

if __name__ == "__main__":
  uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


# import sys
# import os
# import uvicorn

# sys.dont_write_bytecode = True

# if __name__ == "__main__":
#     # Lấy port từ tham số truyền vào (ví dụ: python run.py 8001) hoặc từ biến môi trường
#     port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.getenv("PORT", 8000))
    
#     print(f"🚀 Starting App Instance on port: {port}")
#     uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)