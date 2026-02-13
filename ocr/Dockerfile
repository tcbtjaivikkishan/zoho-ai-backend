FROM python:3.10-slim

# ===============================
# HARD DISABLE PADDLE PIR + oneDNN
# (must be set BEFORE Paddle loads)
# ===============================
ENV FLAGS_enable_pir=0
ENV FLAGS_use_onednn=0
ENV PADDLE_DISABLE_PIR=1
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=1

# ===============================
# System dependencies
# ===============================
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-hin \
    tesseract-ocr-eng \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# ===============================
# App setup
# ===============================
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8001

# ===============================
# Start OCR service
# ===============================
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
