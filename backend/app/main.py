"""Main FastAPI application with all endpoints."""

import json
import base64
from PIL import Image
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

from .config import settings
from .db.manager import db
from .services.ollama_service import OllamaService
from .models.char import CharacterCreate, CharacterUpdate, CharacterResponse
from .models.session import (
    ChatCreate, ChatResponse, ChatDetailResponse,
    MessageCreate, MessageUpdate, MessageResponse,
    SettingsResponse, SettingsUpdate, ImpersonateRequest,
)
from .models.persona import (
    PersonaCreate, PersonaUpdate, PersonaResponse,
    PersonaGenerateRequest
)


# Ollama service instance
ollama = OllamaService(settings.OLLAMA_BASE_URL, settings.DEFAULT_MODEL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    db.init_db()
    
    # Load persistent settings
    persisted_model = db.get_setting("default_model")
    if persisted_model:
        settings.DEFAULT_MODEL = persisted_model
        ollama.default_model = persisted_model
        
    persisted_context = db.get_setting("max_context_messages")
    if persisted_context:
        try:
            settings.MAX_CONTEXT_MESSAGES = int(persisted_context)
        except ValueError:
            pass
        
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(
    title="RoleplayChat API",
    description="SillyTavern-style roleplay chat API with Ollama backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    available = await ollama.is_available()
    models = await ollama.list_models() if available else []
    return {
        "status": "healthy",
        "ollama_available": available,
        "ollama_url": settings.OLLAMA_BASE_URL,
        "default_model": settings.DEFAULT_MODEL,
        "available_models": models,
    }


# ──────────────────────────────────────────────
# Characters
# ──────────────────────────────────────────────

@app.get("/api/characters")
async def list_characters():
    """List all characters."""
    characters = db.list_characters()
    return {"characters": characters}


@app.post("/api/characters", status_code=201)
async def create_character(data: CharacterCreate):
    """Create a new character."""
    char = db.create_character(data.model_dump())
    return char


@app.get("/api/characters/{char_id}")
async def get_character(char_id: str):
    """Get a specific character."""
    char = db.get_character(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


@app.put("/api/characters/{char_id}")
async def update_character(char_id: str, data: CharacterUpdate):
    """Update a character."""
    char = db.update_character(char_id, data.model_dump(exclude_unset=True))
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


@app.delete("/api/characters/{char_id}")
async def delete_character(char_id: str):
    """Delete a character."""
    success = db.delete_character(char_id)
    if not success:
        raise HTTPException(status_code=404, detail="Character not found")
    return {"status": "deleted"}


@app.post("/api/characters/import")
async def import_character(file: UploadFile = File(...)):
    """Import a character from a JSON or PNG file."""
    content = await file.read()
    filename = file.filename.lower()
    
    char_data = {}
    avatar_b64 = ""
    
    try:
        if filename.endswith(".json"):
            # Try to parse standard JSON
            char_data = json.loads(content)
        elif filename.endswith(".png"):
            # Standard SillyTavern character card embeds JSON in a tEXt chunk
            # Also keep the image itself as base64 avatar
            import io
            img = Image.open(io.BytesIO(content))
            img.load()
            
            # Extract tEXt chunks (specifically 'chara')
            chara_data = None
            if hasattr(img, 'text'):
                if 'chara' in img.text:
                    chara_data = img.text['chara']
                elif 'ccv3' in img.text:
                    chara_data = img.text['ccv3']
                    
            if chara_data:
                # the chunk itself might be base64 encoded
                import base64
                try:
                    decoded = base64.b64decode(chara_data).decode("utf-8")
                    char_data = json.loads(decoded)
                except:
                    # sometimes it's plain json
                    char_data = json.loads(chara_data)
            
            # encode image as base64
            avatar_b64 = f"data:image/png;base64,{base64.b64encode(content).decode('ascii')}"

        if not char_data:
            raise ValueError("No valid character data found in file")

        # Map SillyTavern fields to our schema
        mapped_data = {
            "name": char_data.get("data", {}).get("name", char_data.get("name", "Imported Character")),
            "description": char_data.get("data", {}).get("description", char_data.get("description", "")),
            "personality": char_data.get("data", {}).get("personality", char_data.get("personality", "")),
            "scenario": char_data.get("data", {}).get("scenario", char_data.get("scenario", "")),
            "first_message": char_data.get("data", {}).get("first_mes", char_data.get("first_mes", char_data.get("first_message", ""))),
            "example_dialogs": char_data.get("data", {}).get("mes_example", char_data.get("mes_example", char_data.get("example_dialogs", ""))),
            "system_prompt": char_data.get("data", {}).get("system_prompt", char_data.get("system_prompt", "")),
            "tags": char_data.get("data", {}).get("tags", char_data.get("tags", [])),
            "avatar_url": avatar_b64
        }
        
        char = db.create_character(mapped_data)
        return char
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import: {str(e)}")


# ──────────────────────────────────────────────
# Personas
# ──────────────────────────────────────────────

@app.get("/api/personas")
async def list_personas():
    """List all user personas."""
    personas = db.list_personas()
    return {"personas": personas}

@app.post("/api/personas", status_code=201)
async def create_persona(data: PersonaCreate):
    """Create a new user persona."""
    return db.create_persona(data.dict())

@app.get("/api/personas/{persona_id}")
async def get_persona(persona_id: str):
    """Get a specific persona by ID."""
    p = db.get_persona(persona_id)
    if not p:
        raise HTTPException(status_code=404, detail="Persona not found")
    return p

@app.put("/api/personas/{persona_id}")
async def update_persona(persona_id: str, data: PersonaUpdate):
    """Update a user persona."""
    p = db.update_persona(persona_id, data.dict(exclude_unset=True))
    if not p:
        raise HTTPException(status_code=404, detail="Persona not found")
    return p

@app.post("/api/personas/generate")
async def generate_persona_text(data: PersonaGenerateRequest):
    """Generate a detailed persona from a name and brief bio, streaming the results."""
    prompt = f"""
    You are an expert character creator for text-based roleplay. 
    I will give you a Character Name and a brief description. 
    You must expand this into a highly detailed system prompt for a roleplay AI.
    Include their personality traits, physical appearance, mannerisms, likes/dislikes, 
    and explicit instructions on how they speak and act.
    
    Character Name: {data.name}
    Brief Description: {data.bio}
    
    Output ONLY the raw system prompt text from the perspective of the character or 
    as rules for the AI. Do not include introductory text like "Here is your character".
    """
    
    async def generate():
        async for chunk in ollama.stream_generate(prompt=prompt):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
            
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.delete("/api/personas/{persona_id}")
async def delete_persona(persona_id: str):
    """Delete a user persona."""
    success = db.delete_persona(persona_id)
    if not success:
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"status": "deleted"}

# ──────────────────────────────────────────────
# Chats
# ──────────────────────────────────────────────

@app.get("/api/chats")
async def list_chats(character_id: str = None):
    """List all chats, optionally filtered by character."""
    chats = db.list_chats(character_id)
    return {"chats": chats}


@app.post("/api/chats", status_code=201)
async def create_chat(data: ChatCreate):
    """Create a new chat for a character."""
    chat = db.create_chat(data.character_id)
    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Character not found"
        )
    return chat


@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: str):
    """Get a chat with messages."""
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat."""
    success = db.delete_chat(chat_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"status": "deleted"}


@app.post("/api/chats/{chat_id}/branch")
async def branch_chat(chat_id: str, up_to_msg_id: str = None):
    """Branch a chat up to a specific message."""
    chat = db.duplicate_chat(chat_id, up_to_msg_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


# ──────────────────────────────────────────────
# Messages (Streaming)
# ──────────────────────────────────────────────

@app.post("/api/chats/{chat_id}/messages")
async def send_message(chat_id: str, data: MessageCreate):
    """Send a message and stream AI response via SSE."""
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Get character
    char = db.get_character(chat["character_id"])
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    # Save user message
    db.add_message(chat_id, "user", data.content)

    # Get context messages
    context = db.get_context_messages(chat_id)

    # Stream response
    async def generate():
        full_response = []
        async for chunk in ollama.stream_chat(
            character=char,
            messages=context[:-1],  # Exclude current message (already in user_message)
            user_message=data.content,
            user_name=data.user_name,
            user_persona=data.user_persona,
        ):
            full_response.append(chunk)
            # SSE format
            event_data = json.dumps({"content": chunk, "done": False})
            yield f"data: {event_data}\n\n"

        # Save complete assistant response
        complete_text = "".join(full_response)
        if complete_text.strip():
            db.add_message(chat_id, "assistant", complete_text)

        # Send done signal
        yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.put("/api/messages/{msg_id}")
async def edit_message(msg_id: str, data: MessageUpdate):
    """Edit a specific message."""
    msg = db.update_message(msg_id, data.content)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return msg


@app.delete("/api/messages/{msg_id}")
async def delete_message(msg_id: str):
    """Delete a specific message."""
    success = db.delete_message(msg_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "deleted"}


@app.post("/api/chats/{chat_id}/impersonate")
async def impersonate_user(chat_id: str, data: ImpersonateRequest = None):
    """Generate the next user message using AI."""
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    char = db.get_character(chat["character_id"])
    
    # Get context messages
    context = db.get_context_messages(chat_id)
    
    # Special system prompt asking AI to write as the user
    import copy
    temp_char = copy.deepcopy(char)
    user_display = data.user_name if data and data.user_name else "the user"
    
    persona_block = ""
    if data and data.user_persona:
        persona_block = f"\nUser Personality/Appearance:\n{data.user_persona}\nEnsure the response heavily reflects this persona."
        
    temp_char["system_prompt"] = f"You are the conversational partner of {char['name']}. Write the next response from {user_display} to continue the roleplay context. ONLY write {user_display}'s response. Do not act as {char['name']}.{persona_block}"
    
    async def generate():
        async for chunk in ollama.stream_chat(
            character=temp_char,
            messages=context,
            user_message="", # Trigger completion without adding new user text
        ):
            yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
        yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ──────────────────────────────────────────────
# Models & Settings
# ──────────────────────────────────────────────

@app.get("/api/models")
async def list_models():
    """List available Ollama models."""
    models = await ollama.list_models()
    return {
        "models": models,
        "default": settings.DEFAULT_MODEL,
    }


@app.get("/api/settings")
async def get_settings():
    """Get application settings."""
    available = await ollama.is_available()
    models = await ollama.list_models() if available else []
    return {
        "ollama_url": settings.OLLAMA_BASE_URL,
        "default_model": settings.DEFAULT_MODEL,
        "max_context_messages": settings.MAX_CONTEXT_MESSAGES,
        "available_models": models,
        "ollama_available": available,
    }


@app.put("/api/settings")
async def update_settings(data: SettingsUpdate):
    """Update settings and persist to database."""
    if data.default_model:
        settings.DEFAULT_MODEL = data.default_model
        ollama.default_model = data.default_model
        db.set_setting("default_model", data.default_model)
    if data.max_context_messages is not None:
        settings.MAX_CONTEXT_MESSAGES = data.max_context_messages
        db.set_setting("max_context_messages", data.max_context_messages)
    return await get_settings()

@app.get("/api/backup")
async def backup_data():
    """Export all characters, chats, and messages."""
    try:
        data = db.export_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/restore")
async def restore_data(request: Request):
    """Import JSON data and replace database."""
    try:
        data = await request.json()
        db.import_data(data)
        return {"status": "success", "message": "Database restored successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Restore failed: {str(e)}")

@app.post("/api/factory-reset")
async def factory_reset():
    """Wipe database and return to defaults."""
    try:
        db.factory_reset()
        return {"status": "success", "message": "Factory reset complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


# ──────────────────────────────────────────────
# Run server
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
    )
