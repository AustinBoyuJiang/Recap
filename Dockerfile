FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ca-certificates curl tzdata \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# 现在代码在 /app 下：/app/main.py、/app/memory.py、/app/agent.py ...
COPY backend/app /app

EXPOSE 8000

# 关键修改：从 main:app 启动（而不是 app.main:app）
CMD ["uvicorn", "main:app",
     "--host", "0.0.0.0",
     "--port", "8000",
     "--proxy-headers",
     "--forwarded-allow-ips", "*"]
