"""Local embedding generation and duplicate detection service.

TODO (Milestone 3 — write this by hand!):
1. Load a local embedding model once (lazy singleton) using `sentence-transformers`
   (e.g., `SentenceTransformer(settings.embedding_model)`) OR call local Ollama.
2. Write `embed_issue(title: str, description: str) -> list[float]`.
3. Write a query function using pgvector's cosine distance (`Issue.embedding.cosine_distance(...)`)
   to find top-k similar issues above a similarity threshold you tune with your eval set.
"""
