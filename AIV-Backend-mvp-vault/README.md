# AIV Backend - Python/FastAPI

A production-quality backend for the AIV platform.

## Features

- 🔐 Authentication with email verification
- 🧬 Cloning Portal API (6-stage flow)
- 📧 Email service for OTP delivery
- 🗄️ PostgreSQL with SQLAlchemy + Alembic
- 🔴 Redis for session management
- 📦 MinIO for file storage

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
backend-python/
├── app/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Environment config
│   ├── database.py          # SQLAlchemy setup
│   ├── models/              # Database models
│   ├── schemas/             # Pydantic schemas
│   ├── routers/             # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Auth middleware
│   └── utils/               # Utilities
├── alembic/                 # Migrations
├── tests/                   # Tests
├── requirements.txt
└── Dockerfile
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
