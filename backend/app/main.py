import logging
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1 import revenue
from app.api.v1 import webhooks
from app import auth
import json

logging.basicConfig(level=logging.INFO)
_log = logging.getLogger("revenueos")


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


async def broadcast_event(event_type: str, data: dict):
    message = json.dumps({"event_type": event_type, "data": data})
    await manager.broadcast(message)


app = FastAPI(title="RevenueOS", version="0.1.0")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open and wait for any incoming messages (if needed)
            # We don't expect to receive messages from the client in this example,
            # but we must keep the loop running to maintain the connection.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    _log.error("Unhandled exception on %s: %s\n%s", request.url, exc, tb)
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}", "traceback": tb},
    )


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include API v1 router
app.include_router(revenue.router, prefix="/api/v1")
app.include_router(webhooks.router)
app.include_router(auth.router)  # Mount the auth router


@app.get("/")
async def root():
    return {"message": "Welcome to RevenueOS"}


@app.get("/health")
async def health():
    return {"status": "healthy"}