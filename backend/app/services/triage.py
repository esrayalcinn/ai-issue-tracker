"""Gemini-powered issue triage service (structured JSON outputs)."""

from google.genai import types

from app.schemas.issue import TriageResult
from app.services.llm import (
    LLMConfigError as TriageConfigError,
    LLMRateLimitError as TriageRateLimitError,
    LLMServiceError as TriageServiceError,
    generate_with_fallback,
)

SYSTEM_PROMPT = """You triage software issues, study tasks, and personal to-dos.
Analyze the title and description and return:
- suggested_priority: one of low, medium, high, or urgent
  * urgent: outage, crash, data loss, or immediate deadline
  * high: major broken feature, core workflow failure, or important upcoming task
  * medium: standard bug, moderate impact, or normal task
  * low: minor tweak or nice-to-have item
- suggested_labels: 1 to 4 concise lowercase tags (e.g. bug, feature, frontend, backend, database, study, personal, homework)
- one_line_summary: crisp single-sentence summary
- reasoning: brief 1-sentence explanation for the chosen priority
"""


def triage_issue(title: str, description: str) -> TriageResult:
    """Ask Gemini Flash (with automatic fallback) to triage an issue."""
    response = generate_with_fallback(
        contents=f"Title: {title}\n\nDescription:\n{description}",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=TriageResult,
            temperature=0.2,
        ),
    )

    if not response.text:
        raise TriageServiceError("Gemini returned an empty response.")

    result = TriageResult.model_validate_json(response.text)
    cleaned_labels = list(
        dict.fromkeys(
            label.strip().lower()[:30]
            for label in result.suggested_labels
            if label.strip()
        )
    )
    return result.model_copy(update={"suggested_labels": cleaned_labels[:5]})
