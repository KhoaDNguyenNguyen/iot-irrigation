#!/usr/bin/env zsh

set -e

docker compose up -d

cd mock_esp32
source .venv/bin/activate
python main.py &
MOCK_PID=$!
cd ..

cd backend
source .venv/bin/activate
uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

cleanup() {
    kill $MOCK_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    docker compose down
}

trap cleanup EXIT INT TERM

echo "Dashboard: http://localhost:5173"
wait
