"""Issue CRUD and AI action endpoints.

Later milestones:
- Milestone 3: GET /issues/{id}/duplicates or POST /issues/check-duplicates
- Milestone 4: POST /issues/{id}/triage
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.issue import Issue
from app.schemas.issue import (
    DuplicateCheckRequest,
    IssueCreate,
    IssuePriority,
    IssueRead,
    IssueStatus,
    IssueUpdate,
    SimilarIssueRead,
    TriageResult,
)
from app.services.embeddings import embed_issue, find_similar_issues
from app.services.triage import (
    TriageConfigError,
    TriageRateLimitError,
    TriageServiceError,
    triage_issue,
)

router = APIRouter(prefix="/issues", tags=["issues"])


@router.post("", response_model=IssueRead, status_code=status.HTTP_201_CREATED)
def create_issue(payload: IssueCreate, db: Session = Depends(get_db)):
    issue = Issue(**payload.model_dump())
    issue.embedding = embed_issue(issue.title, issue.description)
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


@router.post("/check-duplicates", response_model=list[SimilarIssueRead])
def check_duplicates(
    payload: DuplicateCheckRequest,
    db: Session = Depends(get_db),
):
    query_embedding = embed_issue(payload.title, payload.description)
    matches = find_similar_issues(db, query_embedding, threshold=payload.threshold)
    return [
        SimilarIssueRead(issue=IssueRead.model_validate(issue), similarity=similarity)
        for issue, similarity in matches
    ]

# GET /issues (@router.get("")):
@router.get("", response_model=list[IssueRead])
def list_issues(
    status: Optional[IssueStatus] = None,
    priority: Optional[IssuePriority] = None,
    label: Optional[str] = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    # Build query with optional filters
    query = select(Issue)
    if status:
        query = query.where(Issue.status == status)
    if priority:
        query = query.where(Issue.priority == priority)
    if label:
        query = query.where(Issue.labels.contains([label]))

    query = query.order_by(Issue.created_at.desc()).offset(offset).limit(limit)
    issues = db.scalars(query).all()
    return issues


@router.get("/{issue_id}", response_model=IssueRead)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.patch("/{issue_id}", response_model=IssueRead)
def update_issue(
    issue_id: int,
    payload: IssueUpdate,
    db: Session = Depends(get_db),
):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(issue, field, value)
    if "title" in updates or "description" in updates:
        issue.embedding = embed_issue(issue.title, issue.description)
    db.commit()
    db.refresh(issue)
    return issue


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    db.delete(issue)
    db.commit()
    return None


@router.post("/{issue_id}/triage", response_model=TriageResult)
def run_issue_triage(
    issue_id: int,
    db: Session = Depends(get_db),
):
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    try:
        return triage_issue(issue.title, issue.description)
    except TriageConfigError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except TriageRateLimitError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    except TriageServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc