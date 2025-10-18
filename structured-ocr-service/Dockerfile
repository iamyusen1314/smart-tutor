# syntax=docker/dockerfile:1.6

FROM python:3.10-slim as base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Use Aliyun mirrors for faster apt downloads
RUN printf 'deb http://mirrors.aliyun.com/debian bullseye main contrib non-free\n' \
         'deb http://mirrors.aliyun.com/debian bullseye-updates main contrib non-free\n' \
         'deb http://mirrors.aliyun.com/debian-security bullseye-security main contrib non-free\n' \
      > /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      libglib2.0-0 \
      libsm6 \
      libxext6 \
      libxrender-dev \
      libgl1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Upgrade pip and install PaddlePaddle + remaining dependencies via Aliyun mirror
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir paddlepaddle==2.6.0 \
      -i http://mirrors.cloud.aliyuncs.com/pypi/simple/ \
      --trusted-host mirrors.cloud.aliyuncs.com && \
    pip install --no-cache-dir -r requirements.txt \
      -i http://mirrors.cloud.aliyuncs.com/pypi/simple/ \
      --trusted-host mirrors.cloud.aliyuncs.com

COPY app.py .

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
