# ============================================
# ML Inference Microservice - Dockerfile
# FastAPI + Uvicorn + TensorFlow/Keras (Lightweight)
# ============================================

FROM python:3.11-slim AS runtime
WORKDIR /app

# System deps for model inference
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python ML dependencies
COPY requirements.ml.txt ./
RUN pip install --no-cache-dir -r requirements.ml.txt

# Copy inference service
COPY inference_service.py ./
COPY models/ ./models/ 2>/dev/null || true

# Create models directory if it doesn't exist
RUN mkdir -p /app/models

ENV MODEL_DIR=/app/models
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "inference_service:app", "--host", "0.0.0.0", "--port", "8000"]
