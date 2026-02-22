from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import traceback
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.database import init_db
from app.routes import auth, chat
from app.core.exceptions import validation_exception_handler

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Sonic AI Backend...")
    try:
        await init_db()
        logger.info("Database connection established.")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise e
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Attach Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

import os
print(f"Server Startup. CWD: {os.getcwd()}")

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    settings.FRONTEND_URL,
    "*", # Allow all for debugging
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Chat-Id"], 
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Exception: {exc}")
    traceback.print_exc() # Print stack trace to console
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "code": 500, "details": str(exc) if settings.PROJECT_NAME == "Debug" else "An unexpected error occurred."}
    )

# Specific Exception Handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Routers
print(f"API_V1_STR: {settings.API_V1_STR}")
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(chat.router, prefix=settings.API_V1_STR, tags=["chat"])

for route in app.routes:
    print(f"Registered Route: {route.path} [{route.methods}]")

@app.get("/")
async def root():
    return {"message": "Welcome to Sonic AI Backend", "status": "running"}

@app.get("/debug/routes")
async def get_routes():
    routes = []
    for route in app.routes:
        routes.append(f"{route.path} [{route.methods}]")
    return {"routes": routes}