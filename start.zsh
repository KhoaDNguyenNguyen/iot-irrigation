#!/usr/bin/env zsh

cd mock_esp32
[ ! -d ".venv" ] && python -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
python main.py &
MOCK_PID=$!
cd ..

cd backend
[ ! -d ".venv" ] && python -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

cleanup() {
    kill $MOCK_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait
