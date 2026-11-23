# AI-Integrated Issue Tracker

A personal issue tracker built with **FastAPI**, **Next.js (TypeScript)**, and **PostgreSQL (`pgvector`)**, using a hybrid AI architecture:
- **Local embeddings** (`sentence-transformers` or Ollama `nomic-embed-text`) for unlimited, zero-cost duplicate detection and semantic search.
- **Gemini API (Flash free tier)** for structured JSON triage (priority, labels, summaries) and tool-calling assistant features.

> **Privacy note:** On the Gemini API free tier, prompts may be used by Google to improve products. Keep real private/work data out of free-tier requests—use personal/test issues or switch to a paid/local model later.

---

## Project Structure

```text
ai-issue-tracker/
├── docker-compose.yml       # PostgreSQL 16 + pgvector
├── db/init.sql              # Enables the `vector` extension on first boot
├── .env.example             # Copy to .env and fill in GEMINI_API_KEY
├── ROADMAP.md               # Step-by-step Mentor Mode milestones
├── backend/                 # FastAPI + SQLAlchemy + pgvector + AI services
│   ├── app/
│   │   ├── main.py          # App entrypoint + /health endpoints
│   │   ├── config.py        # Environment settings
│   │   ├── db.py            # SQLAlchemy engine & get_db()
│   │   ├── models/          # ORM tables (Milestone 1 — you write this)
│   │   ├── schemas/         # Pydantic schemas (Milestone 1 & 4 — you write this)
│   │   ├── routers/         # API endpoints (Milestone 1 — you write this)
│   │   └── services/        # Embeddings & Gemini triage (Milestones 3 & 4)
│   ├── evals/               # Seed & evaluation dataset (sample_issues.json)
│   └── tests/               # pytest suite
└── frontend/                # Next.js + TypeScript + Tailwind CSS
    └── src/
        ├── app/             # Pages & layout
        └── lib/api.ts       # Backend API client
```

---

## Quickstart (Windows PowerShell)

### 1. Create your `.env` file
```powershell
Copy-Item .env.example .env
```
Add your `GEMINI_API_KEY` from Google AI Studio when you reach Milestone 4 (you don't need it for Milestones 1–3!).

### 2. Start PostgreSQL (`pgvector`)
Make sure Docker Desktop is running, then:
```powershell
docker compose up -d
```

### 3. Set up and run the Backend (using `uv`)
```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload
```
Verify:
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- DB check: http://localhost:8000/health/db

Run backend tests:
```powershell
uv run pytest
```

### 4. Set up and run the Frontend
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:3000 — you should see **`API: online`** in the top-right badge.

---

## Next Step
Open [ROADMAP.md](./ROADMAP.md) and start **Milestone 1**!
