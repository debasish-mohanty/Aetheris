#!/usr/bin/env bash
set -e

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN}${BOLD} ============================================${NC}"
echo -e "${CYAN}${BOLD}    ✧ Aetheris - Immersive AI Roleplay${NC}"
echo -e "${CYAN}${BOLD} ============================================${NC}"
echo ""

# ── Check Python ──
if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
    echo -e "${RED} [ERROR] Python is not installed. Install Python 3.10+${NC}"
    exit 1
fi
PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)

# ── Check Node.js ──
if ! command -v node &>/dev/null; then
    echo -e "${RED} [ERROR] Node.js is not installed. Install Node.js 18+${NC}"
    exit 1
fi

# ── Prompt for ports ──
echo -e "${BOLD} Configure your server ports (press Enter for defaults):${NC}"
echo ""
read -p "  Backend API port   [default: 8000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8000}

read -p "  Frontend UI port   [default: 3000]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-3000}

read -p "  Ollama URL         [default: http://localhost:11434]: " OLLAMA_URL
OLLAMA_URL=${OLLAMA_URL:-http://localhost:11434}

echo ""
echo -e "${CYAN} ────────────────────────────────────────────${NC}"
echo -e "  Backend API :  ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "  Frontend UI :  ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  Ollama      :  ${GREEN}${OLLAMA_URL}${NC}"
echo -e "${CYAN} ────────────────────────────────────────────${NC}"
echo ""

# ── PID tracking for cleanup ──
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW} Shutting down servers...${NC}"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && echo "  Backend stopped."
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "  Frontend stopped."
    # Clean up any child processes
    jobs -p | xargs -r kill 2>/dev/null
    echo -e "${GREEN} Servers stopped. Goodbye!${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ── Install backend dependencies ──
echo -e " ${BOLD}[1/4]${NC} Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
$PYTHON -m pip install -r requirements.txt -q 2>/dev/null || echo -e "${YELLOW}  [WARN] Some packages may have failed${NC}"
echo "        Done."
# ── Install frontend dependencies ──
echo -e " ${BOLD}[2/4]${NC} Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install --silent 2>/dev/null
else
    echo "        node_modules exists, skipping install."
fi
echo "        Done."

# ── Write frontend env ──
cat > "$SCRIPT_DIR/frontend/.env.local" <<EOF
VITE_API_PORT=${BACKEND_PORT}
VITE_BACKEND_URL=http://localhost:${BACKEND_PORT}
EOF

# ── Start Backend ──
echo -e " ${BOLD}[3/4]${NC} Starting Aetheris services..."
cd "$SCRIPT_DIR/backend"
API_PORT=$BACKEND_PORT API_HOST=0.0.0.0 OLLAMA_BASE_URL=$OLLAMA_URL \
    $PYTHON -m uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --no-access-log &
BACKEND_PID=$!

# ── Start Frontend ──
cd "$SCRIPT_DIR/frontend"
npx vite --port "$FRONTEND_PORT" --clearScreen false &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}${BOLD} ============================================${NC}"
echo -e "${GREEN}${BOLD}   ✧ Aetheris is now active!${NC}"
echo -e "   🌐 Interface: ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "   API Endpoint: ${CYAN}http://localhost:${BACKEND_PORT}/health${NC}"
echo ""
echo -e "   Running in single-session mode."
echo -e "   Press ${BOLD}Ctrl+C${NC} to stop all services."
echo -e "${GREEN}${BOLD} ============================================${NC}"
echo ""

# ── Try to open browser ──
if command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:${FRONTEND_PORT}" 2>/dev/null &
elif command -v open &>/dev/null; then
    open "http://localhost:${FRONTEND_PORT}" 2>/dev/null &
fi

# ── Wait for processes ──
wait
