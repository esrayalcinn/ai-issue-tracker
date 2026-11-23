"""Gemini-powered issue triage service (structured JSON outputs).

TODO (Milestone 4 — write this by hand!):
1. Initialize the `google-genai` client using `settings.gemini_api_key`.
2. Send the issue title + description to `settings.gemini_model` with
   `response_mime_type="application/json"` and `response_schema=TriageResult`.
3. Handle API errors and rate limits gracefully (never crash the whole request).
"""
