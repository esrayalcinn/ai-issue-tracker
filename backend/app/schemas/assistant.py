from typing import Any, Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ToolCallLog(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    tools_used: list[ToolCallLog] = Field(default_factory=list)
    mutated: bool = False
