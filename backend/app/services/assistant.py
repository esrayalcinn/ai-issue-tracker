"""Gemini tool-calling assistant service grounded in live PostgreSQL issues."""

from datetime import datetime, timezone
from typing import Any

from google.genai import types
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.schemas.assistant import ChatMessage, ChatResponse, ToolCallLog
from app.services.embeddings import embed_issue, find_similar_issues
from app.services.llm import generate_with_fallback

MAX_TOOL_ROUNDS = 5

ASSISTANT_SYSTEM_PROMPT = """You are Maviş, a helpful, concise personal cat assistant inside an issue & to-do notebook.
Always use your tools to inspect the user's real PostgreSQL issues instead of guessing.
When referring to an issue, include its #id, title, and due_at if it has one.
If the user asks to add/create a task or bug (optionally with a deadline like "tomorrow at 5pm" or "Friday"), convert it to an ISO 8601 timestamp using the current date/time provided and call `create_issue`.
Keep replies short, warm, and practical.
"""

TOOL_DECLARATIONS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="list_issues",
            description="List issues/to-dos from PostgreSQL with optional status, priority, or label filters.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "status": types.Schema(
                        type=types.Type.STRING,
                        enum=["open", "in_progress", "done"],
                        description="Filter by status",
                    ),
                    "priority": types.Schema(
                        type=types.Type.STRING,
                        enum=["low", "medium", "high", "urgent"],
                        description="Filter by priority",
                    ),
                    "label": types.Schema(
                        type=types.Type.STRING,
                        description="Filter by exact lowercase label",
                    ),
                    "limit": types.Schema(
                        type=types.Type.INTEGER,
                        description="Maximum number of issues to return (default 20)",
                    ),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="search_issues",
            description="Semantic search across issues using local vector embeddings to find items related by meaning.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(
                        type=types.Type.STRING,
                        description="Natural-language search query",
                    ),
                    "limit": types.Schema(
                        type=types.Type.INTEGER,
                        description="Max results to return (default 5)",
                    ),
                },
                required=["query"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_issue_stats",
            description="Get total issue counts grouped by status and priority.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={},
            ),
        ),
        types.FunctionDeclaration(
            name="create_issue",
            description="Create a new issue or to-do in PostgreSQL.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "title": types.Schema(
                        type=types.Type.STRING,
                        description="Short issue or task title",
                    ),
                    "description": types.Schema(
                        type=types.Type.STRING,
                        description="Optional notes or details",
                    ),
                    "priority": types.Schema(
                        type=types.Type.STRING,
                        enum=["low", "medium", "high", "urgent"],
                        description="Optional priority",
                    ),
                    "labels": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description="Optional list of lowercase labels",
                    ),
                    "due_at": types.Schema(
                        type=types.Type.STRING,
                        description="Optional ISO 8601 deadline timestamp (e.g. 2026-11-28T17:00:00+03:00)",
                    ),
                },
                required=["title"],
            ),
        ),
    ]
)


def _serialize_issue(issue: Issue) -> dict[str, Any]:
    return {
        "id": issue.id,
        "title": issue.title,
        "description": issue.description,
        "status": issue.status,
        "priority": issue.priority,
        "labels": issue.labels,
        "due_at": issue.due_at.isoformat() if issue.due_at else None,
    }


def _execute_tool(
    name: str,
    args: dict[str, Any],
    db: Session,
) -> tuple[dict[str, Any], bool]:
    """Run one backend tool safely against PostgreSQL. Returns (result_dict, mutated)."""
    if name == "list_issues":
        stmt = select(Issue)
        if args.get("status"):
            stmt = stmt.where(Issue.status == args["status"])
        if args.get("priority"):
            stmt = stmt.where(Issue.priority == args["priority"])
        if args.get("label"):
            stmt = stmt.where(Issue.labels.contains([str(args["label"]).strip().lower()]))
        limit = min(int(args.get("limit") or 20), 50)
        issues = db.scalars(stmt.order_by(Issue.created_at.desc()).limit(limit)).all()
        return {"issues": [_serialize_issue(i) for i in issues]}, False

    if name == "search_issues":
        query = str(args.get("query", "")).strip()
        if not query:
            return {"issues": []}, False
        limit = min(int(args.get("limit") or 5), 10)
        query_vec = embed_issue(query, "")
        matches = find_similar_issues(db, query_vec, threshold=0.30, limit=limit)
        return {
            "matches": [
                {**_serialize_issue(issue), "similarity": similarity}
                for issue, similarity in matches
            ]
        }, False

    if name == "get_issue_stats":
        status_rows = db.execute(
            select(Issue.status, func.count(Issue.id)).group_by(Issue.status)
        ).all()
        priority_rows = db.execute(
            select(Issue.priority, func.count(Issue.id)).group_by(Issue.priority)
        ).all()
        total = sum(count for _, count in status_rows)
        return {
            "total": total,
            "by_status": {status: count for status, count in status_rows},
            "by_priority": {
                (priority or "untriaged"): count for priority, count in priority_rows
            },
        }, False

    if name == "create_issue":
        title = str(args.get("title", "")).strip()[:200]
        if not title:
            return {"error": "Title is required"}, False
        description = str(args.get("description", "")).strip()
        priority = args.get("priority")
        if priority not in ("low", "medium", "high", "urgent"):
            priority = None
        raw_labels = args.get("labels") or []
        labels = list(
            dict.fromkeys(
                str(lbl).strip().lower()[:30] for lbl in raw_labels if str(lbl).strip()
            )
        )[:5]

        due_at = None
        raw_due = args.get("due_at")
        if raw_due:
            try:
                due_at = datetime.fromisoformat(str(raw_due).replace("Z", "+00:00"))
            except ValueError:
                due_at = None

        issue = Issue(
            title=title,
            description=description,
            priority=priority,
            labels=labels,
            status="open",
            due_at=due_at,
        )
        issue.embedding = embed_issue(issue.title, issue.description)
        db.add(issue)
        db.commit()
        db.refresh(issue)
        return {"created": _serialize_issue(issue)}, True

    return {"error": f"Unknown tool: {name}"}, False


def run_assistant_chat(
    message: str,
    history: list[ChatMessage],
    db: Session,
) -> ChatResponse:
    contents: list[types.Content] = []
    for msg in history[-10:]:
        role = "model" if msg.role == "assistant" else "user"
        contents.append(
            types.Content(role=role, parts=[types.Part.from_text(text=msg.content)])
        )
    contents.append(
        types.Content(role="user", parts=[types.Part.from_text(text=message)])
    )

    tools_used: list[ToolCallLog] = []
    mutated = False

    now_local = datetime.now().astimezone()
    system_prompt = (
        f"{ASSISTANT_SYSTEM_PROMPT}\n"
        f"Current local date & time: {now_local.strftime('%A, %Y-%m-%d %H:%M %z')} "
        f"(UTC: {datetime.now(timezone.utc).isoformat()})."
    )

    for _ in range(MAX_TOOL_ROUNDS):
        response = generate_with_fallback(
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=[TOOL_DECLARATIONS],
                temperature=0.3,
            ),
        )

        if not response.function_calls:
            return ChatResponse(
                reply=(response.text or "Done.").strip(),
                tools_used=tools_used,
                mutated=mutated,
            )

        # Append the model's tool-call turn
        if response.candidates and response.candidates[0].content:
            contents.append(response.candidates[0].content)

        # Execute every requested tool and send results back to Gemini
        tool_response_parts: list[types.Part] = []
        for fn_call in response.function_calls:
            fn_name = fn_call.name or ""
            fn_args = dict(fn_call.args) if fn_call.args else {}
            tools_used.append(ToolCallLog(name=fn_name, args=fn_args))

            result, did_mutate = _execute_tool(fn_name, fn_args, db)
            if did_mutate:
                mutated = True

            tool_response_parts.append(
                types.Part.from_function_response(name=fn_name, response=result)
            )

        contents.append(types.Content(role="user", parts=tool_response_parts))

    return ChatResponse(
        reply="I reached the maximum number of tool steps for one turn. Try asking a more specific question!",
        tools_used=tools_used,
        mutated=mutated,
    )
