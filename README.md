# ✧ Aetheris — Immersive AI Roleplay

**Aetheris** is a premium, private, and localized AI roleplay ecosystem. Powered by local intelligence (Ollama), it provides a high-end interface for immersive storytelling and character interaction without sacrificing your privacy.

![Aetheris Branding](https://via.placeholder.com/800x200/5b21b6/ffffff?text=✧+AETHERIS+✧)

## ✨ Features

- **Immersive Local AI**: Full integration with [Ollama](https://ollama.ai/) for high-performance, private roleplay.
- **Premium Design System**: Fluid animations, a pulsing "Nexus Orb" welcome screen, and a dark, moody aesthetic.
- **Advanced Character Management**: Import and export standard SillyTavern character cards (PNG/JSON).
- **Multi-Persona System**: Create and switch between multiple user personas for different roleplay scenarios.
- **Smart Context**: Configurable message history limits to balance memory and performance.
- **Dynamic Startup**: Easy-to-use launch scripts with automatic dependency handling and port configuration.
- **Full Privacy**: Your chats and characters never leave your machine — stored in a local SQLite database.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.10+)
- **Ollama**: Download and run from [ollama.com](https://ollama.com/)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/aetheris.git
    cd aetheris
    ```

2.  **Launch the application**:
    - **Windows**: Double-click `startup.bat` 
    - **Linux/macOS**: Run `chmod +x startup.sh && ./startup.sh`

3.  **Configure**:
    The launcher will prompt you for Backend/Frontend ports and your Ollama API URL. Press **Enter** for defaults.

## 📁 Project Structure

```text
aetheris/
├── backend/            # FastAPI + SQLite Backend
│   ├── app/            # Application logic
│   └── data/           # Database storage (LOCAL ONLY)
├── frontend/           # React + Vite + Vanilla CSS
│   └── src/            # UI Components and Design System
├── startup.bat         # Windows Launcher
└── startup.sh          # Linux/macOS Launcher
```

## 🛠️ Built With

- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React, Vite, CSS Modules
- **Database**: SQLite (local-first)
- **AI Engine**: Ollama (local LLM)

## 📄 License

This project is open-source. See the repository for license details.

---
*Created with focus on privacy and immersion. Welcome to the Nexus.*
