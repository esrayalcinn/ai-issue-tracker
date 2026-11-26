"""Shared Gemini client with automatic model fallback on 503/429/404."""

import time
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import settings


class LLMConfigError(RuntimeError):
    """Raised when GEMINI_API_KEY is missing."""


class LLMRateLimitError(RuntimeError):
    """Raised when all fallback models hit rate limits."""


class LLMServiceError(RuntimeError):
    """Raised when all fallback models fail."""


def _build_client() -> genai.Client:
    api_key = settings.gemini_api_key.strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise LLMConfigError("GEMINI_API_KEY is not configured in .env")
    return genai.Client(api_key=api_key)


def generate_with_fallback(
    contents: Any,
    config: types.GenerateContentConfig,
) -> types.GenerateContentResponse:
    """Try the primary Gemini model, then automatically fall back on 503/429/404."""
    client = _build_client()
    models_to_try = list(
        dict.fromkeys([settings.gemini_model, *settings.gemini_fallback_models])
    )

    last_code: int | None = None
    last_exc: Exception | None = None

    for idx, model_name in enumerate(models_to_try):
        try:
            return client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
        except genai_errors.APIError as exc:
            code = getattr(exc, "code", None)
            last_code = code
            last_exc = exc
            # Fall back to the next model on temporary overload, rate limit, or deprecated model
            if code in (404, 429, 503) and idx < len(models_to_try) - 1:
                time.sleep(0.4)
                continue
            break

    if last_code == 429:
        raise LLMRateLimitError(
            "All configured Gemini models hit rate limits. Please wait a moment and try again."
        ) from last_exc
    if last_code == 503:
        raise LLMServiceError(
            "All configured Gemini models are temporarily busy. Please try again in a few seconds."
        ) from last_exc
    raise LLMServiceError(f"Gemini API error: {last_exc}") from last_exc
