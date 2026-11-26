from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

IssueStatus = Literal["open", "in_progress", "done"]
IssuePriority = Literal["low", "medium", "high", "urgent"]

class IssueCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="")
    labels: list[str] = Field(default_factory=list)
    priority: IssuePriority | None = None
    status: IssueStatus = Field(default="open")

class IssueUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
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


class DuplicateCheckRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="")
    threshold: float = Field(default=0.45, ge=0.0, le=1.0)


class SimilarIssueRead(BaseModel):
    issue: IssueRead
    similarity: float


class TriageResult(BaseModel):
    suggested_priority: IssuePriority
    suggested_labels: list[str] = Field(default_factory=list, max_length=5)
    one_line_summary: str
    reasoning: str