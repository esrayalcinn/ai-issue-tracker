from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db import Base, engine
from app.models import issue as _issue_model  # noqa: F401
from app.routers import assistant, issues

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Integrated Issue Tracker API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Basic health endpoint so you can verify FastAPI is running."""
    return {"status": "ok"}


@app.get("/health/db")
def db_health_check() -> dict[str, str]:
    """Verifies PostgreSQL + pgvector connectivity."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


app.include_router(issues.router)
app.include_router(assistant.router)
