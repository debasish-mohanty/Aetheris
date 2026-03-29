from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class PersonaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    persona: Optional[str] = ""
    avatar_url: Optional[str] = ""

class PersonaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    persona: Optional[str] = ""
    avatar_url: Optional[str] = ""

class PersonaResponse(BaseModel):
    id: str
    name: str
    persona: str
    avatar_url: str
    created_at: str

class PersonaGenerateRequest(BaseModel):
    name: str
    bio: str
