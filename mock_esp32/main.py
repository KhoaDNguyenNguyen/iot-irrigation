import time
import json
import random
import paho.mqtt.client as mqtt

mode = "AUTO"
pump_state = "IDLE"
moisture = 38.0
water_level = 81.0
soak_timer = 0
history = [38.0] * 20
uptime = 0

def on_message(client, userdata, msg):
    global mode, pump_state
    try:
        payload = json.loads(msg.payload.decode())
        if "mode" in payload:
            mode = payload["mode"]
        if "action" in payload and mode == "MANUAL":
            if payload["action"] == "ON" and water_level > 5.0:
                pump_state = "PUMPING"
            elif payload["action"] == "OFF":
                pump_state = "IDLE"
    except Exception:
        pass

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message
client.connect("localhost", 1883, 60)
client.subscribe("farm/zone1/command")
client.loop_start()

while True:
    uptime += 1
    
    if mode == "AUTO":
        if pump_state == "IDLE" and moisture < 40.0 and water_level > 5.0:
            pump_state = "PUMPING"
        elif pump_state == "PUMPING" and moisture > 75.0:
            pump_state = "SOAKING"
            soak_timer = 5
        elif pump_state == "SOAKING":
            soak_timer -= 1
            if soak_timer <= 0:
                pump_state = "IDLE"
        elif pump_state == "PUMPING" and water_level <= 5.0:
            pump_state = "IDLE"

    if pump_state == "PUMPING":
        moisture += random.uniform(2.0, 4.0)
        water_level -= 0.5
    elif pump_state == "SOAKING":
        moisture += random.uniform(0.5, 1.0)
    else:
        moisture -= random.uniform(0.2, 0.8)
    
    moisture = max(0.0, min(100.0, moisture))
    if water_level < 0: water_level = 100.0

    history.append(round(moisture, 1))
    if len(history) > 20: history.pop(0)

    payload = {
        "soil_moisture": round(moisture, 1),
        "temperature": round(random.uniform(22.0, 26.0), 1),
        "water_level": round(water_level, 1),
        "pump_state": pump_state,
        "rtt_ms": random.randint(15, 60),
        "mode": mode,
        "history": history,
        "battery_v": round(random.uniform(3.9, 4.1), 2),
        "signal_dbm": random.randint(-75, -65),
        "uptime_s": uptime
    }
    client.publish("farm/zone1/telemetry", json.dumps(payload))
    time.sleep(1)
