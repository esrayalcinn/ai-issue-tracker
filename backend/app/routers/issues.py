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
    IssueCreate,
    IssuePriority,
    IssueRead,
    IssueStatus,
    IssueUpdate,
)

router = APIRouter(prefix="/issues", tags=["issues"])


@router.post("", response_model=IssueRead, status_code=status.HTTP_201_CREATED)
def create_issue(payload: IssueCreate, db: Session = Depends(get_db)):
    issue = Issue(**payload.model_dump())
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue

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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(issue, field, value)
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