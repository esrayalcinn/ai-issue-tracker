# Mentor Mode Roadmap

This project is split into 6 focused milestones. The starter boilerplate is already wired up so you don't waste time fighting config—**every core feature below is yours to design and write by hand.**

### Mentor Mode Rules
1. **Design first:** Before coding a milestone, jot down your table columns, endpoints, or data flow in a few bullet points and ask for a design critique.
2. **15-minute debugging rule:** Read the stack trace, check logs/DB/Network tab, and form a hypothesis before asking for a hint.
3. **Commit only what you can explain:** Make small Git commits after each working slice.

---

## Milestone 0 — Environment Sanity Check (~15 min)
- [ ] Initialize Git (`git init`, first commit with the starter scaffold).
- [ ] Run `docker compose up -d` and confirm `GET /health/db` returns `{"status": "ok", "database": "connected"}`.
- [ ] Run `uv run pytest` in `backend/` and see `test_health.py` pass.
- [ ] Open `http://localhost:3000` and confirm the badge says **`API: online`**.

---

## Milestone 1 — Database Schema & Core CRUD (Write by Hand)
**Goal:** A rock-solid, tested REST API for managing issues—no AI yet.

**Files to build:**
- `backend/app/models/issue.py` — Design the `Issue` SQLAlchemy model (`id`, `title`, `description`, `status`, `priority`, `labels`, `created_at`, `updated_at`).
- `backend/app/schemas/issue.py` — Create `IssueCreate`, `IssueUpdate`, `IssueRead` Pydantic schemas (use `Literal` or `Enum` for valid statuses/priorities!).
- `backend/app/routers/issues.py` — Build `POST /issues`, `GET /issues` (with query filters like `?status=open&priority=high`), `GET /issues/{id}`, `PATCH /issues/{id}`, `DELETE /issues/{id}`.
- `backend/app/main.py` — Register your router and initialize tables (or set up your first Alembic migration!).
- `backend/tests/test_issues.py` — Write 4–5 pytest tests (create, list, filter, update, 404 on missing ID).

**What you'll learn:** Relational modeling, HTTP status codes (`201`, `204`, `404`, `422`), FastAPI dependency injection, Pydantic validation, automated API testing.

---

## Milestone 2 — Usable Personal Issue Board UI
**Goal:** A clean UI you can actually use to track your own bugs/tasks.

**Files to build:**
- `frontend/src/lib/api.ts` — Typed `fetch` functions for your CRUD endpoints.
- `frontend/src/app/page.tsx` (and small components) — Issue list/board, filter bar (status + priority), "New Issue" form, quick status change, and delete action.

**What you'll learn:** TypeScript interfaces matching backend schemas, React state/loading/error handling, full-stack debugging via browser DevTools Network tab.

---

## Milestone 3 — Local Embeddings & Duplicate Detection (Write by Hand)
**Goal:** Automatically detect likely duplicate issues locally with zero rate limits.

**Tasks:**
1. Add `embedding: Mapped[list[float] | None] = mapped_column(Vector(384))` to `Issue` (or `Vector(768)` if using Ollama `nomic-embed-text`).
2. Implement `backend/app/services/embeddings.py`:
   - Load your local embedding model once (lazy singleton so it doesn't reload on every request!).
   - Generate and store the embedding whenever an issue is created or edited.
3. Add `POST /issues/check-duplicates` (or `GET /issues/{id}/duplicates`) using `pgvector` cosine distance.
4. **First Eval!** Write a small script in `backend/evals/eval_duplicates.py` using `backend/evals/sample_issues.json`:
   - Embed all sample issues and measure precision/recall across similarity thresholds (e.g., `0.65`, `0.70`, `0.75`, `0.80`).
   - Pick your threshold based on real numbers, not guesses!
5. Surface "Possible duplicates" in the UI when creating or viewing an issue.

**What you'll learn:** Vector embeddings, `pgvector` cosine distance queries, lazy model loading, threshold tuning with an evaluation set.

---

## Milestone 4 — Gemini Flash Triage with Structured JSON (Write by Hand)
**Goal:** One-click AI triage that suggests priority, labels, and a crisp summary—always returning valid JSON.

**Tasks:**
1. Define a strict `TriageResult` Pydantic schema in `backend/app/schemas/issue.py`.
2. Implement `backend/app/services/triage.py` using `google-genai` structured output (`response_schema=TriageResult`).
3. Add `POST /issues/{id}/triage` (decide whether triage auto-applies or returns suggestions for the user to accept—hint: user confirmation is better UX!).
4. Handle rate limits / missing API key / timeouts cleanly with clear HTTP errors (`429` / `503`).
5. **Second Eval!** Run a small script against `backend/evals/sample_issues.json` (watch free-tier rate limits!) to measure how often Gemini matches `expected_priority` and `expected_labels`, then iterate on your prompt.

**What you'll learn:** Structured outputs / schema enforcement, prompt iteration backed by evals, human-in-the-loop UX, resilient external API error handling.

---

## Milestone 5 — AI Assistant with Tool Calling
**Goal:** A chat sidebar that can inspect and act on *your* actual database safely.

**Tasks:**
1. Define 3–4 backend tools the model can call:
   - `search_issues(query, status?, priority?)` (combining semantic + SQL filters!)
   - `get_issue_stats()` (counts by status/priority)
   - `draft_issue(title, description, priority, labels)` (creates or proposes a new issue)
2. Build a `POST /assistant/chat` endpoint implementing the Gemini function-calling loop (with a max-turn guard so it can never infinite-loop!).
3. Add a clean chat drawer in Next.js showing which tools the assistant called.

**What you'll learn:** Agentic tool/function calling loops, guardrails (read-only vs. mutating tools, max iterations), grounding LLM answers in live database state.

---

## Milestone 6 — Polish & Portfolio Ready
- [ ] Add a clean `README.md` with architecture diagram, screenshots, and your real eval numbers (e.g. duplicate detection precision/recall + triage accuracy).
- [ ] Add a GitHub Actions workflow to run `pytest` and `npm run build` on every push.
- [ ] Review your own codebase end-to-end and write down 3 tradeoffs you made (great prep for internship interviews!).
