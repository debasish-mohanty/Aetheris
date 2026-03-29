# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎭 Project Overview

**SillyTavern-style roleplaying chat application** that uses **Ollama (local LLM runtime)** as the AI backend for character-based conversations.

### Core Architecture
- **Backend**: Python with LangChain + Ollama integration
- **Frontend**: Modern React framework (Next.js preferred)
- **Database**: SQLite or lightweight local-first storage
- **LLM**: Ollama running locally (supports llama3, mistral, etc.)

### Team Structure (Multi-Agent Development)
When working on this project, simulate 4 specialized agents:

1. **[Architect Agent]** - Defines system architecture, designs frontend/backend/Ollama integration, ensures modularity and local-first design
2. **[Backend Agent]** - Builds API layer, handles chat sessions/memory/character logic, implements streaming from Ollama, manages SQLite persistence
3. **[Frontend Agent]** - Builds SillyTavern-inspired UI (chat + character management), implements streaming, message formatting, persona switching
4. **[QA & Integration Agent]** - Tests frontend/backend interactions, validates prompt formatting and roleplay consistency, ensures local setup works end-to-end

### Communication Format
Agents must explicitly label outputs as:
- `[Architect]`
- `[Backend]`
- `[Frontend]`
- `[QA]`

Agents must review previous outputs before acting, suggest improvements, and iterate collaboratively.

---

## 🚀 Development Commands

### Backend (Python)

```bash
# Install dependencies
pip install -r requirements.txt

# Create virtual environment (if needed)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Run the application
python run.py

# Run a single test
pytest tests/test_module.py::test_function_name

# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run with coverage
pytest --cov=. --cov-report=html

# Lint
flake8
# or
ruff check
```

### Frontend

```bash
# Install dependencies
npm install
# or
pnpm install
# or
yarn install

# Run development server
npm run dev
# or
pnpm dev
# or
yarn dev

# Build for production
npm run build
# or
pnpm build
# or
yarn build

# Run tests
npm test
# or
pnpm test
# or
yarn test

# Open preview
npm run preview
```

### Ollama Integration

```bash
# Check if Ollama is running
ollama list

# Pull a model
ollama pull llama3

# Pull and run a model
ollama run llama3

# Check Ollama API
curl http://localhost:11434/api/tags

# Test Ollama chat API
curl http://localhost:11434/api/chat -d '{
  "model": "llama3",
  "messages": [{"role": "user", "content": "Hello"}]
}'
```

### Full Stack

```bash
# Terminal 1: Backend
python run.py

# Terminal 2: Frontend
npm run dev

# Terminal 3: Ollama (if not already running)
ollama serve
```

### Testing Workflows

```bash
# Run a single test
pytest tests/test_file.py::test_name

# Run tests in specific directory
pytest tests/integration/

# Run with specific filter
pytest -k "test_feature_name"

# Run with coverage report
pytest --cov=src --cov-report=term-missing

# Run with verbose output and coverage
pytest -v --cov=. --cov-report=html

# Run test with debug mode
pytest --pdb

# Run specific test file
python -m pytest tests/test_specific.py
```

---

## 🏗️ High-Level Architecture

### Phase 1: Architecture & Planning (Current)
- Architect defines system design
- Agents review and refine
- Tech stack decisions finalized

### Phase 2: Backend Implementation
- Backend agent writes Ollama API integration code
- QA reviews backend code
- Architect validates design adherence
- Implement character-based session management
- Set up SQLite for conversation persistence
- Implement streaming response handling

### Phase 3: Frontend Implementation
- Frontend builds SillyTavern-inspired chat UI
- Backend provides API support
- QA tests chat flows, message formatting
- Implement persona/character switching
- Add conversation history saving/loading

### Phase 4: Integration & Polish
- Full system end-to-end testing
- Debugging and bug fixes
- Final UI/UX improvements

### Key Modules

#### Backend Structure
```
backend/
├── api/
│   ├── /chat          # Chat session endpoints
│   └── /characters    # Character management endpoints
├── services/
│   ├── ollama/        # Ollama integration
│   └── memory/        # Conversation memory
├── models/
│   └── character.py   # Character data models
├── db/
│   └── sqlite.py      # SQLite connection/helper
├── main.py            # FastAPI entry point
└── config.py          # Configuration loading
```

#### Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Chat/      # Chat interface
│   │   ├── Character/ # Character selection/management
│   │   └── Message/   # Individual message rendering
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API client
│   └── store/         # State management
└── public/            # Static assets
```

### Core Data Flow
1. User sends message via Frontend
2. Frontend calls Backend API
3. Backend formats prompt for character/roleplay
4. Backend streams response from Ollama
5. Frontend displays streaming messages
6. Backend saves conversation to SQLite

---

## 🔧 Coding Conventions

### Agent Labeling (Multi-Agent Work)
Always prefix your work with your agent role:
```
[Backend]
# Your code comment

def create_chat_session(...):
    ...
```

### File Path References
When referencing files, include the path like:
```
File: backend/api/chat.py
File: frontend/src/components/Chat/Chat.tsx
```

### Ollama Prompt Formatting
When integrating with Ollama, use this message format:
```json
{
  "model": "llama3",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "User message"}
  ]
}
```

For roleplay characters, include character definition in system prompt:
```json
{
  "model": "llama3",
  "messages": [
    {
      "role": "system",
      "content": "You are [Character Name]. Personality: [traits]. Context: [backstory]"
    },
    {"role": "user", "content": "User message"}
  ]
}
```

### Streaming Response Handling
Use async/await for streaming from Ollama:
```python
async def stream_response(messages, model):
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", "http://localhost:11434/api/chat", json={...}) as response:
            async for chunk in response.aiter_text(chunk_size=512):
                yield chunk
```

---

## 📁 Related Projects for Reference

Check these sibling projects in `D:\Generative-AI\My_Projects\` for patterns and inspiration:

- **SL_RP_Bot** (`D:\Generative-AI\My_Projects\SL_RP_Bot\`): Roleplay bot implementation with requirements, app structure, and setup guide
- **Ollama_simple** (`D:\Generative-AI\My_Projects\Ollama_simple\`): Simple Ollama integration patterns
- **agentscope**: Advanced multi-agent patterns and distributed agent architecture

---

## 🧪 QA Checklist

When completing a feature, the QA Agent should verify:

### Backend QA
- [ ] Ollama API integration returns correct format
- [ ] Streaming responses chunk properly
- [ ] SQLite saves/loads conversations correctly
- [ ] Character prompts format correctly
- [ ] Error handling for Ollama failures
- [ ] Memory persists across sessions

### Frontend QA
- [ ] Chat UI responds to user input
- [ ] Streaming messages display correctly
- [ ] Character switching works
- [ ] Conversation history loads/saves
- [ ] UI is clean and responsive
- [ ] No console errors

### Integration QA
- [ ] End-to-end chat flow works
- [ ] Multiple characters can coexist
- [ ] Long conversations don't crash
- [ ] Memory stays consistent
