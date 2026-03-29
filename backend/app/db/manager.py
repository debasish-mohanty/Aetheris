"""SQLite database manager."""

import sqlite3
import os
import uuid
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from ..config import settings


class DatabaseManager:
    """Manages SQLite database connections and operations."""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or settings.DB_PATH
        self._ensure_db_dir()
        self.init_db()

    def _ensure_db_dir(self):
        """Ensure the database directory exists."""
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    def _get_conn(self) -> sqlite3.Connection:
        """Get a database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def init_db(self):
        """Initialize database tables."""
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                personality TEXT DEFAULT '',
                scenario TEXT DEFAULT '',
                first_message TEXT DEFAULT '',
                example_dialogs TEXT DEFAULT '',
                system_prompt TEXT DEFAULT '',
                tags TEXT DEFAULT '[]',
                avatar_url TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                character_id TEXT NOT NULL,
                title TEXT DEFAULT 'New Chat',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS personas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                persona TEXT DEFAULT '',
                avatar_url TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_chats_character_id ON chats(character_id)
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)

        # Schema migrations
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN avatar_url TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass # Column likely already exists

        conn.commit()
        conn.close()

        # Seed default characters if empty
        self._seed_defaults()

    def _seed_defaults(self):
        """Seed default characters."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM characters")
        count = cursor.fetchone()[0]

        if count == 0:
            now = datetime.utcnow().isoformat()
            defaults = [
                {
                    "id": uuid.uuid4().hex,
                    "name": "Luna Shadowveil",
                    "description": "A mysterious elven sorceress from the twilight realm of Nethara. She has silver hair that glows faintly in moonlight, violet eyes that shimmer with arcane energy, and carries an ancient staff carved from petrified starwood.",
                    "personality": "Enigmatic, wise, playfully cryptic. She speaks in riddles when it amuses her but is fiercely protective of those she considers friends. Has a dry sense of humor and a weakness for mortal pastries.",
                    "scenario": "You encounter Luna at the edge of the Whispering Woods, where the veil between worlds grows thin. She appears to be studying a peculiar rift in reality, muttering incantations under her breath.",
                    "first_message": "*The air crackles with static as Luna turns toward you, her violet eyes catching the fading light. A knowing smile plays across her features.*\n\nWell, well... another wanderer drawn by the rift's song. *She tilts her head, silver hair cascading over one shoulder.* Tell me, mortal — did you follow the whispers, or did the whispers follow you?\n\n*She taps her staff against the ground, and tiny motes of starlight scatter in its wake.*",
                    "example_dialogs": "",
                    "system_prompt": "",
                    "tags": json.dumps(["Fantasy", "Magic", "Adventure"]),
                    "avatar_url": "",
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "id": uuid.uuid4().hex,
                    "name": "Viktor Steele",
                    "description": "A hardboiled cyberpunk detective in Neo-Shanghai, 2087. Augmented with a neural-linked prosthetic left arm and retinal HUD. Wears a battered trench coat over tactical gear, face scarred from an explosion that killed his partner.",
                    "personality": "Cynical, street-smart, quietly compassionate beneath layers of sarcasm. Drinks too much synthetic bourbon. Has an old-fashioned code of honor in a world that's forgotten what that means.",
                    "scenario": "Rain hammers the neon-lit streets of Neo-Shanghai's lower district. You find Viktor in his cramped office above a ramen shop, reviewing holographic case files. Someone has been murdering augmented humans and harvesting their implants.",
                    "first_message": "*Viktor doesn't look up from the holographic display floating above his desk. The blue light casts deep shadows across his scarred face. His prosthetic arm whirs softly as he flicks through crime scene photos.*\n\nDoor's open, which means you either have a case or a death wish. *He finally glances up, cybernetic eye glowing faintly red.* Sit down. Talk fast. I charge by the hour and my patience is cheaper than my rates.\n\n*He reaches for a glass of amber liquid, the ice long melted.*",
                    "example_dialogs": "",
                    "system_prompt": "",
                    "tags": json.dumps(["Cyberpunk", "Noir", "Sci-Fi"]),
                    "avatar_url": "",
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "id": uuid.uuid4().hex,
                    "name": "Professor Aria Voss",
                    "description": "A brilliant but eccentric quantum physicist who accidentally opened a portal to parallel dimensions. Currently runs a secret lab beneath MIT while juggling academic politics and interdimensional crises.",
                    "personality": "Enthusiastic, scattered, brilliant. Talks at a million miles per hour about complex theories, then gets distracted by a butterfly. Deeply caring but terrible at expressing emotions directly. Uses science metaphors for everything.",
                    "scenario": "Aria's underground lab is a chaos of whiteboards covered in equations, humming machinery, and the faint shimmer of a stabilized dimensional rift in a containment field. She's called you here urgently.",
                    "first_message": "*Aria nearly trips over a cable as she rushes to greet you, lab coat flapping behind her. Her wild curly hair is held back by safety goggles pushed up on her forehead, and there's a coffee stain on her MIT sweatshirt.*\n\nOh thank GOD you're here! *She grabs your arm, pulling you toward a bank of monitors.* Okay so, remember when I said the dimensional variance was stable at point-zero-three? I LIED. Well, I didn't lie exactly, the math was right at the time, but — \n\n*A low hum fills the room and the containment field flickers.*\n\n...Yeah. That. That's the problem. *She looks at you with wide, slightly manic eyes.* How do you feel about possibly visiting a parallel universe today?",
                    "example_dialogs": "",
                    "system_prompt": "",
                    "tags": json.dumps(["Sci-Fi", "Comedy", "Adventure"]),
                    "avatar_url": "",
                    "created_at": now,
                    "updated_at": now,
                },
            ]

            for char in defaults:
                cursor.execute("""
                    INSERT INTO characters (id, name, description, personality, scenario,
                        first_message, example_dialogs, system_prompt, tags, avatar_url,
                        created_at, updated_at)
                    VALUES (:id, :name, :description, :personality, :scenario,
                        :first_message, :example_dialogs, :system_prompt, :tags, :avatar_url,
                        :created_at, :updated_at)
                """, char)

            conn.commit()

        conn.close()

    # --- User Persona CRUD ---
    def create_persona(self, data: dict) -> dict:
        conn = self._get_conn()
        now = datetime.utcnow().isoformat()
        persona_id = uuid.uuid4().hex

        conn.execute("""
            INSERT INTO personas (id, name, persona, avatar_url, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            persona_id,
            data["name"],
            data.get("persona", ""),
            data.get("avatar_url", ""),
            now,
        ))
        conn.commit()
        result = self.get_persona(persona_id)
        conn.close()
        return result

    def get_persona(self, persona_id: str) -> Optional[dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM personas WHERE id = ?", (persona_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return dict(row)

    def list_personas(self) -> List[dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM personas ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def update_persona(self, persona_id: str, data: dict) -> Optional[dict]:
        conn = self._get_conn()
        
        updates = []
        values = []
        
        for key in ["name", "persona", "avatar_url"]:
            if key in data:
                updates.append(f"{key} = ?")
                values.append(data[key])
                
        if not updates:
            conn.close()
            return self.get_persona(persona_id)
            
        values.append(persona_id)
        query = f"UPDATE personas SET {', '.join(updates)} WHERE id = ?"
        
        conn.execute(query, values)
        conn.commit()
        conn.close()
        return self.get_persona(persona_id)

    def delete_persona(self, persona_id: str) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM personas WHERE id = ?", (persona_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    # --- Character CRUD ---

    def create_character(self, data: dict) -> dict:
        """Create a new character."""
        conn = self._get_conn()
        now = datetime.utcnow().isoformat()
        char_id = uuid.uuid4().hex

        tags = json.dumps(data.get("tags", []))

        conn.execute("""
            INSERT INTO characters (id, name, description, personality, scenario,
                first_message, example_dialogs, system_prompt, tags, avatar_url,
                created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            char_id,
            data["name"],
            data.get("description", ""),
            data.get("personality", ""),
            data.get("scenario", ""),
            data.get("first_message", ""),
            data.get("example_dialogs", ""),
            data.get("system_prompt", ""),
            tags,
            data.get("avatar_url", ""),
            now, now,
        ))
        conn.commit()

        result = self.get_character(char_id)
        conn.close()
        return result

    def get_character(self, char_id: str) -> Optional[dict]:
        """Get a character by ID."""
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return None

        char = dict(row)
        char["tags"] = json.loads(char.get("tags", "[]"))

        # Get counts
        cursor.execute(
            "SELECT COUNT(*) FROM chats WHERE character_id = ?", (char_id,)
        )
        char["chat_count"] = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE c.character_id = ?
        """, (char_id,))
        char["message_count"] = cursor.fetchone()[0]

        conn.close()
        return char

    def list_characters(self) -> List[dict]:
        """List all characters."""
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM characters ORDER BY updated_at DESC")
        rows = cursor.fetchall()

        results = []
        for row in rows:
            char = dict(row)
            char["tags"] = json.loads(char.get("tags", "[]"))

            cursor.execute(
                "SELECT COUNT(*) FROM chats WHERE character_id = ?",
                (char["id"],)
            )
            char["chat_count"] = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*) FROM messages m
                JOIN chats c ON m.chat_id = c.id
                WHERE c.character_id = ?
            """, (char["id"],))
            char["message_count"] = cursor.fetchone()[0]

            results.append(char)

        conn.close()
        return results

    def update_character(self, char_id: str, data: dict) -> Optional[dict]:
        """Update a character."""
        conn = self._get_conn()
        now = datetime.utcnow().isoformat()

        existing = self.get_character(char_id)
        if not existing:
            conn.close()
            return None

        fields = []
        values = []

        for field in ["name", "description", "personality", "scenario",
                       "first_message", "example_dialogs", "system_prompt", "avatar_url"]:
            if field in data and data[field] is not None:
                fields.append(f"{field} = ?")
                values.append(data[field])

        if "tags" in data and data["tags"] is not None:
            fields.append("tags = ?")
            values.append(json.dumps(data["tags"]))

        fields.append("updated_at = ?")
        values.append(now)
        values.append(char_id)

        if fields:
            query = f"UPDATE characters SET {', '.join(fields)} WHERE id = ?"
            conn.execute(query, values)
            conn.commit()

        conn.close()
        return self.get_character(char_id)

    def delete_character(self, char_id: str) -> bool:
        """Delete a character and all associated data."""
        conn = self._get_conn()

        cursor = conn.cursor()
        cursor.execute("SELECT id FROM characters WHERE id = ?", (char_id,))
        if not cursor.fetchone():
            conn.close()
            return False

        conn.execute("DELETE FROM characters WHERE id = ?", (char_id,))
        conn.commit()
        conn.close()
        return True

    # --- Chat CRUD ---

    def create_chat(self, character_id: str) -> Optional[dict]:
        """Create a new chat for a character."""
        char = self.get_character(character_id)
        if not char:
            return None

        conn = self._get_conn()
        now = datetime.utcnow().isoformat()
        chat_id = uuid.uuid4().hex

        conn.execute("""
            INSERT INTO chats (id, character_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (chat_id, character_id, f"Chat ({datetime.utcnow().strftime('%Y-%m-%d %H:%M')})", now, now))

        # Insert first_message if character has one
        if char.get("first_message", "").strip():
            msg_id = uuid.uuid4().hex
            conn.execute("""
                INSERT INTO messages (id, chat_id, role, content, created_at)
                VALUES (?, ?, 'assistant', ?, ?)
            """, (msg_id, chat_id, char["first_message"], now))

        conn.commit()
        conn.close()

        return self.get_chat(chat_id)

    def duplicate_chat(self, chat_id: str, up_to_msg_id: str = None) -> Optional[dict]:
        """Duplicate an existing chat up to a specific message."""
        original_chat = self.get_chat(chat_id)
        if not original_chat:
            return None

        conn = self._get_conn()
        now = datetime.utcnow().isoformat()
        new_chat_id = uuid.uuid4().hex

        # Create new chat record
        conn.execute("""
            INSERT INTO chats (id, character_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (new_chat_id, original_chat["character_id"], f"{original_chat['title']} (Branch)", now, now))

        # Copy messages
        messages_to_copy = []
        for msg in original_chat.get("messages", []):
            messages_to_copy.append(msg)
            if up_to_msg_id and msg["id"] == up_to_msg_id:
                break

        for i, msg in enumerate(messages_to_copy):
            new_msg_id = uuid.uuid4().hex
            # Preserve original created_at but add a tiny microsecond delay to maintain exact sort order
            # if we just use 'now', all copied messages look simultaneous. Actually, let's just keep original created_at.
            conn.execute("""
                INSERT INTO messages (id, chat_id, role, content, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (new_msg_id, new_chat_id, msg["role"], msg["content"], msg["created_at"]))

        conn.commit()
        conn.close()

        return self.get_chat(new_chat_id)

    def get_chat(self, chat_id: str) -> Optional[dict]:
        """Get a chat with its messages."""
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.*, ch.name as character_name
            FROM chats c
            JOIN characters ch ON c.character_id = ch.id
            WHERE c.id = ?
        """, (chat_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return None

        chat = dict(row)

        cursor.execute("""
            SELECT * FROM messages
            WHERE chat_id = ?
            ORDER BY created_at ASC
        """, (chat_id,))
        messages = [dict(r) for r in cursor.fetchall()]

        chat["messages"] = messages
        chat["message_count"] = len(messages)

        conn.close()
        return chat

    def list_chats(self, character_id: str = None) -> List[dict]:
        """List chats, optionally filtered by character."""
        conn = self._get_conn()
        cursor = conn.cursor()

        if character_id:
            cursor.execute("""
                SELECT c.*, ch.name as character_name
                FROM chats c
                JOIN characters ch ON c.character_id = ch.id
                WHERE c.character_id = ?
                ORDER BY c.updated_at DESC
            """, (character_id,))
        else:
            cursor.execute("""
                SELECT c.*, ch.name as character_name
                FROM chats c
                JOIN characters ch ON c.character_id = ch.id
                ORDER BY c.updated_at DESC
            """)

        results = []
        for row in cursor.fetchall():
            chat = dict(row)
            cursor.execute(
                "SELECT COUNT(*) FROM messages WHERE chat_id = ?",
                (chat["id"],)
            )
            chat["message_count"] = cursor.fetchone()[0]
            results.append(chat)

        conn.close()
        return results

    def delete_chat(self, chat_id: str) -> bool:
        """Delete a chat."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM chats WHERE id = ?", (chat_id,))
        if not cursor.fetchone():
            conn.close()
            return False

        conn.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        conn.commit()
        conn.close()
        return True

    # --- Message CRUD ---

    def add_message(self, chat_id: str, role: str, content: str) -> dict:
        """Add a message to a chat."""
        conn = self._get_conn()
        now = datetime.utcnow().isoformat()
        msg_id = uuid.uuid4().hex

        conn.execute("""
            INSERT INTO messages (id, chat_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (msg_id, chat_id, role, content, now))

        # Update chat's updated_at
        conn.execute(
            "UPDATE chats SET updated_at = ? WHERE id = ?",
            (now, chat_id)
        )
        conn.commit()

        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
        result = dict(cursor.fetchone())

        conn.close()
        return result

    def get_messages(self, chat_id: str, limit: int = 100) -> List[dict]:
        """Get messages for a chat."""
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM messages
            WHERE chat_id = ?
            ORDER BY created_at ASC
            LIMIT ?
        """, (chat_id, limit))

        results = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return results

    def get_context_messages(self, chat_id: str, limit: int = None) -> List[dict]:
        """Get recent messages for AI context."""
        limit = limit or settings.MAX_CONTEXT_MESSAGES
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT role, content FROM messages
            WHERE chat_id = ? AND role != 'system'
            ORDER BY created_at DESC
            LIMIT ?
        """, (chat_id, limit))

        results = [dict(r) for r in cursor.fetchall()]
        results.reverse()  # Oldest first
        conn.close()
        return results

    def update_message(self, msg_id: str, content: str) -> Optional[dict]:
        """Update a message's content."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
        if not cursor.fetchone():
            conn.close()
            return None

        conn.execute("UPDATE messages SET content = ? WHERE id = ?", (content, msg_id))
        conn.commit()

        cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
        result = dict(cursor.fetchone())
        conn.close()
        return result

    def delete_message(self, msg_id: str) -> bool:
        """Delete a message."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM messages WHERE id = ?", (msg_id,))
        if not cursor.fetchone():
            conn.close()
            return False

        conn.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
        conn.commit()
        conn.close()
        return True

    # --- Settings Persistence ---
    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting from the database."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else default

    def set_setting(self, key: str, value: Any):
        """Save a setting to the database."""
        conn = self._get_conn()
        conn.execute("""
            INSERT OR REPLACE INTO settings (key, value)
            VALUES (?, ?)
        """, (key, str(value)))
        conn.commit()
        conn.close()

    def export_data(self) -> dict:
        """Export all data to JSON."""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM characters")
        characters = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM chats")
        chats = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM messages")
        messages = [dict(r) for r in cursor.fetchall()]
        
        conn.close()
        return {
            "characters": characters,
            "chats": chats,
            "messages": messages
        }

    def import_data(self, data: dict):
        """Import data from JSON, clearing existing."""
        conn = self._get_conn()
        
        # Clear existing
        conn.execute("DELETE FROM messages")
        conn.execute("DELETE FROM chats")
        conn.execute("DELETE FROM characters")
        
        # Insert new
        def insert_rows(table, rows):
            if not rows: return
            cols = list(rows[0].keys())
            placeholders = ",".join(["?"] * len(cols))
            fields = ",".join(cols)
            sql = f"INSERT INTO {table} ({fields}) VALUES ({placeholders})"
            for row in rows:
                conn.execute(sql, [row[c] for c in cols])
                
        insert_rows("characters", data.get("characters", []))
        insert_rows("chats", data.get("chats", []))
        insert_rows("messages", data.get("messages", []))
        
        conn.commit()
        conn.close()

    def factory_reset(self):
        """Wipe database and re-seed defaults."""
        conn = self._get_conn()
        conn.execute("DELETE FROM messages")
        conn.execute("DELETE FROM chats")
        conn.execute("DELETE FROM characters")
        conn.commit()
        conn.close()
        self._seed_defaults()

# Global instance
db = DatabaseManager()
