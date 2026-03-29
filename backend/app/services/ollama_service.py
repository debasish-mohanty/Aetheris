"""Ollama service for AI text generation with streaming."""

import json
import httpx
from typing import AsyncGenerator, List, Optional


class OllamaService:
    """Service for interacting with Ollama API."""

    def __init__(self, base_url: str, default_model: str):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    async def list_models(self) -> List[str]:
        """Get list of available models."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                models = response.json().get("models", [])
                return [m["name"] for m in models]
        except Exception:
            return []

    async def is_available(self) -> bool:
        """Check if Ollama is running."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    def _build_system_prompt(
        self,
        character: dict,
        user_name: Optional[str] = None,
        user_persona: Optional[str] = None,
    ) -> str:
        """Build system prompt from character data."""
        parts = []

        # Custom system prompt takes priority
        if character.get("system_prompt", "").strip():
            parts.append(character["system_prompt"])
        else:
            parts.append(
                f"You are {character['name']}. Stay in character at all times. "
                f"Write in a narrative roleplay style, describing actions in *asterisks* "
                f"and dialogue in quotes. Be creative, descriptive, and engaging."
            )

        if character.get("description", "").strip():
            parts.append(f"\n[Character Description]\n{character['description']}")

        if character.get("personality", "").strip():
            parts.append(f"\n[Personality]\n{character['personality']}")

        if character.get("scenario", "").strip():
            parts.append(f"\n[Scenario]\n{character['scenario']}")

        if character.get("example_dialogs", "").strip():
            parts.append(f"\n[Example Dialogue]\n{character['example_dialogs']}")

        user_display_name = user_name or "User"
        parts.append(f"\n[User Information]\nYou are talking to: {user_display_name}")
        if user_persona and user_persona.strip():
            parts.append(f"User Personality/Appearance:\n{user_persona}")

        return "\n".join(parts)

    async def stream_chat(
        self,
        character: dict,
        messages: List[dict],
        user_message: str,
        model: str = None,
        user_name: Optional[str] = None,
        user_persona: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response from Ollama.

        Yields chunks of text as they arrive.
        """
        model = model or self.default_model
        system_prompt = self._build_system_prompt(character, user_name, user_persona)

        # Build message history for context
        ollama_messages = [
            {"role": "system", "content": system_prompt},
        ]

        # Add conversation history
        for msg in messages:
            ollama_messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

        # Add current user message
        ollama_messages.append({
            "role": "user",
            "content": user_message,
        })

        body = {
            "model": model,
            "messages": ollama_messages,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json=body,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                if data.get("message", {}).get("content"):
                                    yield data["message"]["content"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
        except httpx.ConnectError:
            yield "\n\n*[Connection Error: Ollama is not running. Please start Ollama with `ollama serve`]*"
        except httpx.HTTPStatusError as e:
            yield f"\n\n*[API Error: {e.response.status_code} - Model '{model}' may not be available. Try `ollama pull {model}`]*"
        except Exception as e:
            yield f"\n\n*[Error: {str(e)}]*"
    async def stream_generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: str = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a raw generation response from Ollama.

        Yields chunks of text as they arrive.
        """
        model = model or self.default_model
        
        body = {
            "model": model,
            "prompt": prompt,
            "stream": True,
        }
        if system:
            body["system"] = system

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/generate",
                    json=body,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                if data.get("response"):
                                    yield data["response"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
        except httpx.ConnectError:
            yield "\n\n*[Connection Error: Ollama is not running. Please start Ollama with `ollama serve`]*"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                yield f"*Error: Model '{model}' not found in Ollama.*"
            else:
                yield f"\n\n*[API Error: {e.response.status_code}]*"
        except Exception as e:
            yield f"\n\n*[Error: {str(e)}]*"

    async def generate_text(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: str = None,
    ) -> str:
        """Generate a complete text response from Ollama."""
        model = model or self.default_model
        
        body = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }
        if system:
            body["system"] = system

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=10.0)) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=body,
                )
                response.raise_for_status()
                return response.json().get("response", "")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return f"*Error: Model '{model}' not found in Ollama. Try `ollama pull {model}`*"
            return f"*Error generating text: {str(e)}*"
        except Exception as e:
            return f"*Error generating text ({type(e).__name__}): {str(e)}*"
