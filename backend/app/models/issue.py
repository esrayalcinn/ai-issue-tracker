"""SQLAlchemy ORM models for issues.

TODO (Milestone 1 — write this by hand!):
Design your `Issue` table inheriting from `app.db.Base`.

Think about what fields an issue tracker actually needs:
- id (primary key)
- title (required string)
- description (text)
- status (e.g., open / in_progress / done)
- priority (e.g., low / medium / high / urgent)
- labels (array of strings or JSONB)
- created_at / updated_at timestamps

Later (Milestone 3):
- Add an `embedding` column using `pgvector.sqlalchemy.Vector(384)`
  (384 dimensions matches `all-MiniLM-L6-v2`; use 768 if you pick `nomic-embed-text`).
"""
