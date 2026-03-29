"""Pydantic schemas for characters."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CharacterCreate(BaseModel):
    """Schema for creating a character."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=4000)
    personality: str = Field(default="", max_length=4000)
    scenario: str = Field(default="", max_length=4000)
    first_message: str = Field(default="", max_length=4000)
    example_dialogs: str = Field(default="", max_length=8000)
    system_prompt: str = Field(default="", max_length=4000)
    tags: List[str] = Field(default_factory=list)
    avatar_url: str = Field(default="")


class CharacterUpdate(BaseModel):
    """Schema for updating a character."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=4000)
    personality: Optional[str] = Field(None, max_length=4000)
    scenario: Optional[str] = Field(None, max_length=4000)
    first_message: Optional[str] = Field(None, max_length=4000)
    example_dialogs: Optional[str] = Field(None, max_length=8000)
    system_prompt: Optional[str] = Field(None, max_length=4000)
    tags: Optional[List[str]] = None
    avatar_url: Optional[str] = None


class CharacterResponse(BaseModel):
    """Schema for character response."""
    id: str
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    first_message: str = ""
    example_dialogs: str = ""
    system_prompt: str = ""
    tags: List[str] = Field(default_factory=list)
    avatar_url: str = ""
    created_at: str
    updated_at: str
    chat_count: int = 0
    message_count: int = 0
