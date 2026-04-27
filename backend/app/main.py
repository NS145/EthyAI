"""
FastAPI Main Application

Layer 5: API + HITL Integration
Serves the REST API for the TruthLense frontend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routes.analyze import router as analyze_router
from app.routes.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle - warm up models on startup."""
    print("🔬 TruthLense Backend starting...")
    print(f"   CORS origins: {settings.cors_origins_list}")
    print(f"   GPU enabled: {settings.use_gpu}")
    # Models are lazy-loaded on first request to keep startup fast
    yield
    print("🔬 TruthLense Backend shutting down...")


app = FastAPI(
    title="TruthLense API",
    description="Ethical AI System for Digital Misinformation Detection with Multimodal Explainability",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(analyze_router)
app.include_router(dashboard_router)


@app.get("/")
async def root():
    return {
        "service": "TruthLense API",
        "version": "2.1.0",
        "status": "online",
        "endpoints": {
            "analyze": "POST /api/analyze",
            "results": "GET /api/results/{id}",
            "dashboard": "GET /api/dashboard",
            "feedback": "POST /api/feedback",
            "review_queue": "GET /api/review-queue",
            "review_action": "POST /api/review-action",
            "audit_report": "GET /api/audit-report",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
