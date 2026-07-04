# Knova — Backend

Telemetry Driven Educational Content Recommendation Engine

---

## Getting Started

### Prerequisites

- Python 3.12+
- PostgreSQL 16+ with [pgvector](https://github.com/pgvector/pgvector) extension

---

### 1. Without Docker

```bash
# Clone and enter the backend directory
cd backend

# Create a virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
# or if you use uv
uv sync

# Set up environment variables
cp .env.example .env
```

Edit `.env` and point `DATABASE_URL` to your PostgreSQL instance:

```env
DATABASE_URL="postgresql+asyncpg://<username>:<password>@localhost:5432/knova_db"
```

Make sure the `vector` extension is enabled in your database:

```bash
psql -U user -d knova_db -c "CREATE EXTENSION IF NOT EXISTS vector"
```

Run database migrations:

```bash
alembic upgrade head
```

Start the server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API is now available at `http://localhost:8000/api/v1/docs`.

---

### 2. With Docker (recommended)

```bash
docker compose up --build
```

This starts both the app and a PostgreSQL 16 + pgvector container.  
The API will be available at `http://localhost:8000/api/v1/docs`.

---

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:password@postgres:5432/knova_db` | Postgres connection string |
| `REDIS_URL` | `""` | Redis connection string (optional) |
| `DEBUG` | `true` | Enable debug mode |
| `SECRET_KEY` | — | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | `1440` | Refresh token TTL |

---

### Useful Commands

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```
