FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create static directory to prevent mount error
RUN mkdir -p static

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Create tables from models and start the application
CMD ["sh", "-c", "python -c 'import asyncio; from app.database import init_db; asyncio.run(init_db())' && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
