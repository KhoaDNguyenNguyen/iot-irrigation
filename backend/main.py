import os
import asyncio
import json
import time
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt
import paho.mqtt.client as mqtt
import asyncpg

DB_URL = os.getenv("DB_URL", "postgresql://admin:admin@postgres:5432/iot")
MQTT_BROKER = os.getenv("MQTT_BROKER", "mosquitto")
JWT_SECRET = "production_secret_key_123"

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
    for _ in range(10):
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
    if not db_pool: return
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

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        client.subscribe("farm/zone1/telemetry")

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
    mqtt_client.username_pw_set("backend", "backend123")
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    
    for _ in range(10):
        try:
            mqtt_client.connect(MQTT_BROKER, 1883, 60)
            break
        except Exception:
            await asyncio.sleep(3)
            
    mqtt_client.loop_start()
    yield
    mqtt_client.loop_stop()
    if db_pool:
        await db_pool.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_token(req: Request):
    token = req.cookies.get("auth_token")
    if not token:
        raise HTTPException(status_code=401)
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401)

class LoginData(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def login(data: LoginData, response: Response):
    users = {
        "operator": {"pass": "admin123", "role": "operator"},
        "viewer": {"pass": "view123", "role": "viewer"}
    }
    user = users.get(data.username)
    if not user or user["pass"] != data.password:
        raise HTTPException(status_code=401)
    
    token = jwt.encode(
        {"sub": data.username, "role": user["role"], "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        JWT_SECRET,
        algorithm="HS256"
    )
    response.set_cookie(key="auth_token", value=token, httponly=True, samesite="lax", max_age=28800)
    return {"role": user["role"]}

@app.get("/api/auth/me")
async def auth_me(payload: dict = Depends(verify_token)):
    return {"role": payload.get("role")}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("auth_token")
    return {"status": "ok"}

class TelemetryHistory(BaseModel):
    bucket: datetime
    temp: float
    moisture: float
    water: float

@app.get("/api/telemetry/history", response_model=list[TelemetryHistory])
async def get_history(minutes: int = 60, payload: dict = Depends(verify_token)):
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

class CommandRequest(BaseModel):
    action: str
    mode: str
    command_id: str
    timestamp: int

@app.post("/api/command")
async def send_command(cmd: CommandRequest, payload: dict = Depends(verify_token)):
    if payload.get("role") != "operator":
        raise HTTPException(status_code=403, detail="Operator role required")
    if mqtt_client:
        mqtt_client.publish("farm/zone1/command", json.dumps(cmd.model_dump()))
        return {"status": "dispatched"}
    raise HTTPException(status_code=503)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.cookies.get("auth_token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    if latest_state:
        await websocket.send_text(json.dumps(latest_state))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
