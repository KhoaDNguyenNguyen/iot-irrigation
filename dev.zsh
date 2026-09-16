#!/usr/bin/env zsh
set -e

docker compose up -d postgres mosquitto
sleep 2

export DB_URL="postgresql://admin:admin@localhost:5432/iot"
export MQTT_BROKER="localhost"
export JWT_SECRET="super-secret-key-change-me"
export GOOGLE_CLIENT_ID="GOOGLE_CLIENT_ID"
export GOOGLE_CLIENT_SECRET="GOOGLE_CLIENT_SECRET"

cd mock_esp32
[ ! -d ".venv" ] && python -m venv .venv
source .venv/bin/activate
python main.py &
MOCK_PID=$!
cd ..

cd backend
[ ! -d ".venv" ] && python -m venv .venv
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
cd ..

cd frontend
npm run dev -- --port 5173 --strictPort &
FRONTEND_PID=$!
cd ..

cleanup() {
    kill $MOCK_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    docker compose stop postgres mosquitto
}
trap cleanup EXIT INT TERM

wait
