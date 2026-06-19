# Ethara Assessment

Inventory & Order Management System — FastAPI + React + PostgreSQL, fully containerized.

## Stack

- **Frontend** — React 19, TypeScript, Vite, nginx
- **Backend** — FastAPI, SQLAlchemy, Alembic
- **Database** — PostgreSQL 15

## Run with Docker

```bash
cp .env.example .env   # edit credentials if needed
docker compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:8000       |
| API Docs | http://localhost:8000/docs  |

## Local Development

**Backend**
```bash
cd ethara-assessment-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd ethara-assessment-frontend
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable            | Description                        |
|---------------------|------------------------------------|
| `POSTGRES_USER`     | Postgres username                  |
| `POSTGRES_PASSWORD` | Postgres password                  |
| `POSTGRES_DB`       | Postgres database name             |
# ethara-assessment
