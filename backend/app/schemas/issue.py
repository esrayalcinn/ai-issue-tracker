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
