"""Pydantic schemas for request validation, API responses, and AI structured output.

TODO (Milestone 1 — write this by hand!):
Define schemas such as:
- IssueCreate (fields required when creating an issue)
- IssueUpdate (optional fields for partial updates via PATCH)
- IssueRead (what the API returns, with `model_config = ConfigDict(from_attributes=True)`)

TODO (Milestone 4 — Gemini Triage):
Define a `TriageResult` Pydantic model (e.g., suggested_priority, suggested_labels,
one_line_summary, reasoning) so you can enforce strict JSON output from Gemini.
"""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

IssueStatus = Literal["open", "in_progress", "done"]
IssuePriority = Literal["low", "medium", "high", "urgent"]

class IssueCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    llabels: list[str] = Field(default_factory=list)
    priority: IssuePriority | None = None
    status: IssueStatus = Field(default="open")

class IssueUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, min_length=1)
    labels: list[str] | None = None
    priority: IssuePriority | None = None
    status: IssueStatus | None = None

class IssueRead(BaseModel):
    id: int
    title: str
    description: str
    labels: list[str]
    priority: IssuePriority | None
    status: IssueStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)