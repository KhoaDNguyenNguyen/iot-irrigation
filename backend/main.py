import os
import asyncio
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import paho.mqtt.client as mqtt
import asyncpg

DB_URL = os.getenv("DB_URL", "postgresql://admin:admin@localhost:5432/iot")
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")

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
db_pool = None
event_loop = None
latest_state = {}
mqtt_client = None

async def init_db():
    global db_pool
    for _ in range(5):
        try:
            db_pool = await asyncpg.create_pool(DB_URL)
            async with db_pool.acquire() as conn:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS telemetry (
                        ts TIMESTAMPTZ NOT NULL,
                        temperature DOUBLE PRECISION,
                        soil_moisture DOUBLE PRECISION,
                        water_level DOUBLE PRECISION,
                        pump_state VARCHAR(20)
                    );
                """)
                await conn.execute("SELECT create_hypertable('telemetry', 'ts', if_not_exists => TRUE);")
            break
        except Exception:
            await asyncio.sleep(2)

async def insert_telemetry(payload: dict):
    if not db_pool:
        return
    async with db_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO telemetry (ts, temperature, soil_moisture, water_level, pump_state)
            VALUES ($1, $2, $3, $4, $5)
        """, 
        datetime.now(timezone.utc), 
        float(payload.get('temperature', 0)), 
        float(payload.get('soil_moisture', 0)), 
        float(payload.get('water_level', 0)), 
        str(payload.get('pump_state', 'IDLE')))

def on_message(client, userdata, msg):
    global event_loop, latest_state
    try:
        payload_str = msg.payload.decode()
        payload = json.loads(payload_str)
        latest_state = payload
        if event_loop and event_loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.broadcast(payload_str), event_loop)
            asyncio.run_coroutine_threadsafe(insert_telemetry(payload), event_loop)
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    global event_loop, mqtt_client
    event_loop = asyncio.get_running_loop()
    await init_db()
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_message = on_message
    
    for _ in range(5):
        try:
            mqtt_client.connect(MQTT_BROKER, 1883, 60)
            break
        except Exception:
            await asyncio.sleep(2)
            
    mqtt_client.subscribe("farm/zone1/telemetry")
    mqtt_client.loop_start()
    yield
    mqtt_client.loop_stop()
    if db_pool:
        await db_pool.close()

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class TelemetryHistory(BaseModel):
    bucket: datetime
    temp: float
    moisture: float
    water: float

class CommandRequest(BaseModel):
    action: str
    mode: str

@app.get("/api/telemetry/history", response_model=list[TelemetryHistory])
async def get_history(minutes: int = 60):
    if not db_pool:
        return []
    
    query = """
        SELECT
            time_bucket('1 minute', ts) AS bucket,
            ROUND(CAST(AVG(temperature) AS NUMERIC), 2) AS temp,
            ROUND(CAST(AVG(soil_moisture) AS NUMERIC), 2) AS moisture,
            ROUND(CAST(AVG(water_level) AS NUMERIC), 2) AS water
        FROM telemetry
        WHERE ts > NOW() - $1::interval
        GROUP BY bucket
        ORDER BY bucket ASC;
    """
    async with db_pool.acquire() as conn:
        records = await conn.fetch(query, f"{minutes} minutes")
        return [dict(r) for r in records]

@app.post("/api/command")
async def send_command(cmd: CommandRequest):
    if mqtt_client:
        payload = json.dumps(cmd.model_dump())
        mqtt_client.publish("farm/zone1/command", payload)
        return {"status": "dispatched", "payload": cmd}
    raise HTTPException(status_code=503, detail="MQTT not connected")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    if latest_state:
        await websocket.send_text(json.dumps(latest_state))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
