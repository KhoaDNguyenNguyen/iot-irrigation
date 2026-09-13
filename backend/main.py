import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import paho.mqtt.client as mqtt

class ConnectionManager:
    def __init__(self):
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                self.disconnect(connection)

manager = ConnectionManager()
latest_telemetry = {"soil_moisture": 0.0, "temperature": 0.0, "pump_state": "IDLE"}
event_loop = None

def on_message(client, userdata, msg):
    global latest_telemetry, event_loop
    try:
        payload = msg.payload.decode()
        latest_telemetry = json.loads(payload)
        if event_loop and event_loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.broadcast(payload), event_loop)
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    global event_loop
    event_loop = asyncio.get_running_loop()
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    client.connect("localhost", 1883, 60)
    client.subscribe("farm/zone1/telemetry")
    client.loop_start()
    yield
    client.loop_stop()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await websocket.send_text(json.dumps(latest_telemetry))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
