"""Pydantic schemas for chat sessions and messages."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Schema for creating a message."""
    content: str = Field(..., min_length=1)
    user_name: Optional[str] = None
    user_persona: Optional[str] = None

class ImpersonateRequest(BaseModel):
    """Schema for requesting AI to impersonate the user."""
    user_name: Optional[str] = None
    user_persona: Optional[str] = None

class MessageUpdate(BaseModel):
    """Schema for updating a message."""
    content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: str
    chat_id: str
    role: str
    content: str
    created_at: str


class ChatCreate(BaseModel):
    """Schema for creating a chat."""
    character_id: str


class ChatResponse(BaseModel):
    """Schema for chat response."""
    id: str
    character_id: str
    character_name: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0


class ChatDetailResponse(BaseModel):
    """Schema for chat with messages."""
    id: str
    character_id: str
    character_name: str
    title: str
    created_at: str
    updated_at: str
    messages: List[MessageResponse] = Field(default_factory=list)


class SettingsResponse(BaseModel):
    """Schema for app settings."""
    ollama_url: str
    default_model: str
    max_context_messages: int
    available_models: List[str] = Field(default_factory=list)
    ollama_available: bool = False


class SettingsUpdate(BaseModel):
    """Schema for updating settings."""
    default_model: Optional[str] = None
    max_context_messages: Optional[int] = None
