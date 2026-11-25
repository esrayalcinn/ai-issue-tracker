"""Local embedding generation and duplicate detection service."""

from functools import lru_cache

from sentence_transformers import SentenceTransformer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.issue import Issue


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    """Load the local SentenceTransformer model once and keep it in memory."""
    return SentenceTransformer(settings.embedding_model)


def embed_issue(title: str, description: str) -> list[float]:
    """Turn an issue's title + description into a normalized 384-dim vector."""
    text = f"{title.strip()}\n\n{description.strip()}"
    vector = _get_model().encode(text, normalize_embeddings=True)
    return vector.tolist()


def find_similar_issues(
    db: Session,
    embedding: list[float],
    threshold: float = 0.45,
    limit: int = 5,
    exclude_issue_id: int | None = None,
) -> list[tuple[Issue, float]]:
    """Find existing issues whose cosine similarity is >= threshold.

    In pgvector, cosine_distance = 1 - cosine_similarity, so:
        similarity >= threshold   <=>   cosine_distance <= (1.0 - threshold)
    """
    distance = Issue.embedding.cosine_distance(embedding).label("distance")
    stmt = (
        select(Issue, distance)
        .where(Issue.embedding.is_not(None))
        .where(distance <= (1.0 - threshold))
        .order_by(distance)
        .limit(limit)
    )
    if exclude_issue_id is not None:
        stmt = stmt.where(Issue.id != exclude_issue_id)

    rows = db.execute(stmt).all()
    return [(issue, round(1.0 - float(dist), 4)) for issue, dist in rows]
