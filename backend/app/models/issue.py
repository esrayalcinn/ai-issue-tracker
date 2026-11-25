from datetime import datetime
from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    labels: Mapped[list[str]] = mapped_column(ARRAY(String(30)), nullable=False, default=list)
    priority: Mapped[str | None] = mapped_column(String(20), default=None)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True, default="open")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(384), nullable=True, default=None
    )