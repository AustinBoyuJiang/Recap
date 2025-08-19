FROM python:3.11-slim

# 更快更稳定的构建基础
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# 安装系统依赖（证书/编译器/时区等）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ca-certificates curl tzdata \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先装依赖（利用缓存）
COPY requirements.txt .
RUN pip install -r requirements.txt

# 拷贝代码
COPY backend/app ./app

# 容器监听端口（和 CapRover “Container HTTP Port” 一致）
EXPOSE 8000

# 健康检查（可选，但推荐）
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD curl -fsS http://127.0.0.1:8000/ || exit 1

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
