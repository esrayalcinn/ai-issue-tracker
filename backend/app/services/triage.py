"""Gemini-powered issue triage service (structured JSON outputs)."""

import time

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import settings
from app.schemas.issue import TriageResult

SYSTEM_PROMPT = """You are a senior software engineer triaging bug reports and feature requests.
Analyze the issue title and description and return:
- suggested_priority: one of low, medium, high, or urgent
  * urgent: production outage, crash, data loss, or severe blocking bug
  * high: major broken feature or core workflow failure
  * medium: standard bug, moderate impact, or useful feature request
  * low: minor cosmetic/UI tweak or nice-to-have enhancement
- suggested_labels: 1 to 4 concise lowercase tags (e.g. bug, feature, frontend, backend, database, auth, ui, ux)
- one_line_summary: crisp single-sentence summary of the issue
- reasoning: brief 1-sentence explanation for the chosen priority
"""


class TriageConfigError(RuntimeError):
    """Raised when GEMINI_API_KEY is missing."""


class TriageRateLimitError(RuntimeError):
    """Raised when Gemini API returns 429 rate limit exceeded."""


class TriageServiceError(RuntimeError):
    """Raised when Gemini API fails for another upstream reason."""


def _build_client() -> genai.Client:
    api_key = settings.gemini_api_key.strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise TriageConfigError("GEMINI_API_KEY is not configured in .env")

    return genai.Client(api_key=api_key)


def triage_issue(title: str, description: str) -> TriageResult:
    """Ask Gemini Flash to triage an issue and return a validated TriageResult."""
    client = _build_client()
    response = None

    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=f"Title: {title}\n\nDescription:\n{description}",
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=TriageResult,
                    temperature=0.2,
                ),
            )
            break
        except genai_errors.APIError as exc:
            code = getattr(exc, "code", None)
            if code == 429:
                raise TriageRateLimitError(
                    "Gemini rate limit reached. Please wait a moment and try again."
                ) from exc
            if code == 503 and attempt == 0:
                time.sleep(1.5)
                continue
            if code == 503:
                raise TriageServiceError(
                    "Gemini is temporarily busy (high demand). Please click Triage again in a few seconds."
                ) from exc
            raise TriageServiceError(f"Gemini API error: {exc}") from exc

    if not response.text:
        raise TriageServiceError("Gemini returned an empty response.")

    result = TriageResult.model_validate_json(response.text)
    # Normalize labels to lowercase, stripped, deduplicated
    cleaned_labels = list(dict.fromkeys(label.strip().lower()[:30] for label in result.suggested_labels if label.strip()))
    return result.model_copy(update={"suggested_labels": cleaned_labels[:5]})
