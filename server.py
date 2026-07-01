import asyncio
import websockets
import json

connected_clients = set()

async def handler(websocket):
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.discard(websocket)

async def transmition(keywords:list, transcription:str):
    if connected_clients:
        message = json.dumps({"keywords": keywords,"transcription": transcription})
        await asyncio.gather(*[client.send(message) for client in connected_clients])

async def start_server():
    async with websockets.serve(handler, "localhost", 8765):
        print("WebSocket server started on ws://localhost:8765")
        await asyncio.Future()  # Run forever