"""
Analysis API routes.

POST /analyze - Submit content for analysis
GET /results/{id} - Get analysis results
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.auth import get_current_user, get_optional_user
from app.database import get_supabase
from app.models.pipeline import run_full_pipeline
from app.config import settings

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze")
async def analyze_content(
    text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),
    user: dict = Depends(get_optional_user),
):
    """
    Submit content for multimodal misinformation analysis.
    Supports text, image, and video inputs.
    """
    if not text and not image and not video:
        raise HTTPException(status_code=400, detail="At least one input (text, image, or video) is required")

    # Read file bytes
    image_bytes = None
    video_bytes = None

    if image:
        if image.size > settings.max_image_size:
            raise HTTPException(status_code=413, detail="Image too large (max 10MB)")
        image_bytes = await image.read()

    if video:
        if video.size > settings.max_video_size:
            raise HTTPException(status_code=413, detail="Video too large (max 50MB)")
        video_bytes = await video.read()

    # Truncate text
    if text and len(text) > settings.max_text_length:
        text = text[:settings.max_text_length]

    # Run the full ML pipeline
    try:
        result = await run_full_pipeline(
            text=text,
            image_bytes=image_bytes,
            video_bytes=video_bytes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    # Store results in Supabase
    analysis_id = str(uuid.uuid4())
    db = get_supabase()

    try:
        # Store uploaded files in Supabase Storage
        storage_paths = {}
        if image_bytes:
            path = f"uploads/{analysis_id}/image_{image.filename}"
            db.storage.from_("content-uploads").upload(path, image_bytes)
            storage_paths["image"] = path
        if video_bytes:
            path = f"uploads/{analysis_id}/video_{video.filename}"
            db.storage.from_("content-uploads").upload(path, video_bytes)
            storage_paths["video"] = path

        # Determine input type
        input_type = "text"
        if video_bytes:
            input_type = "video"
        elif image_bytes:
            input_type = "image"

        # Insert content record
        content_data = {
            "id": analysis_id,
            "user_id": user["user_id"] if user else None,
            "input_type": input_type,
            "text_content": text,
            "storage_paths": storage_paths,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        db.table("content").insert(content_data).execute()

        # Insert analysis results
        results_data = {
            "id": str(uuid.uuid4()),
            "content_id": analysis_id,
            "score": result["score"],
            "verdict": result["verdict"],
            "confidence": result["confidence"],
            "probabilities": result["probabilities"],
            "highlights": result["highlights"],
            "shap_values": result["shapValues"],
            "evidence": result["evidence"],
            "modules": result["modules"],
            "language": result["language"],
            "modalities": result["modalities"],
            "summary": result["label"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        db.table("analysis_results").insert(results_data).execute()

        # Audit log
        db.table("audit_logs").insert({
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"] if user else None,
            "action": "content_analyzed",
            "resource_type": "content",
            "resource_id": analysis_id,
            "details": {"input_type": input_type, "score": result["score"]},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

    except Exception as e:
        # Log but don't fail the response if DB storage fails
        print(f"Warning: Failed to store results in database: {e}")

    return {
        "id": analysis_id,
        **result,
    }


@router.get("/results/{content_id}")
async def get_results(
    content_id: str,
    user: dict = Depends(get_optional_user),
):
    """Get analysis results for a specific content item."""
    db = get_supabase()

    try:
        content = db.table("content").select("*").eq("id", content_id).single().execute()
        results = db.table("analysis_results").select("*").eq("content_id", content_id).single().execute()

        return {
            "content": content.data,
            "results": results.data,
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail="Results not found")
