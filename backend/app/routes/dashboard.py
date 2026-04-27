"""
Dashboard & Review Queue API routes.

GET /dashboard - Dashboard statistics
GET /review-queue - Items pending human review
POST /review-action - Submit review decision
POST /feedback - Submit feedback/dispute
GET /audit-report - Audit trail
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.auth import get_current_user, require_role
from app.database import get_supabase

router = APIRouter(prefix="/api", tags=["dashboard"])


class FeedbackRequest(BaseModel):
    content_id: str
    reason: str
    feedback_type: str = "dispute"  # dispute, correction, report


class ReviewActionRequest(BaseModel):
    review_id: str
    action: str  # approve, reject, escalate
    notes: Optional[str] = None


@router.get("/dashboard")
async def get_dashboard(user: dict = Depends(get_current_user)):
    """Get dashboard statistics and recent analyses."""
    db = get_supabase()

    try:
        # Get total analyses count
        total = db.table("content").select("id", count="exact").execute()

        # Get recent analyses
        recent = (
            db.table("analysis_results")
            .select("*, content(*)")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        # Get verdict distribution
        verdicts = db.table("analysis_results").select("verdict").execute()
        verdict_counts = {"authentic": 0, "suspicious": 0, "misinformation": 0}
        for item in verdicts.data or []:
            v = item.get("verdict", "")
            if v in verdict_counts:
                verdict_counts[v] += 1

        # Get pending reviews count
        pending = db.table("review_queue").select("id", count="exact").eq("status", "pending").execute()

        return {
            "total_analyses": total.count or 0,
            "pending_reviews": pending.count or 0,
            "verdict_distribution": verdict_counts,
            "recent_analyses": recent.data or [],
            "average_score": _compute_avg_score(recent.data or []),
        }
    except Exception as e:
        # Return empty dashboard on error
        return {
            "total_analyses": 0,
            "pending_reviews": 0,
            "verdict_distribution": {"authentic": 0, "suspicious": 0, "misinformation": 0},
            "recent_analyses": [],
            "average_score": 0,
        }


@router.get("/review-queue")
async def get_review_queue(user: dict = Depends(get_current_user)):
    """Get items pending human review."""
    db = get_supabase()

    try:
        queue = (
            db.table("review_queue")
            .select("*, content(*), analysis_results(*)")
            .eq("status", "pending")
            .order("priority", desc=True)
            .order("created_at", desc=False)
            .execute()
        )
        return {"items": queue.data or []}
    except Exception as e:
        return {"items": []}


@router.post("/review-action")
async def submit_review_action(
    request: ReviewActionRequest,
    user: dict = Depends(get_current_user),
):
    """Submit a review decision (approve/reject/escalate)."""
    db = get_supabase()

    try:
        # Update review queue item
        db.table("review_queue").update({
            "status": request.action,
            "reviewer_id": user["user_id"],
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "review_notes": request.notes,
        }).eq("id", request.review_id).execute()

        # Audit log
        db.table("audit_logs").insert({
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "action": f"review_{request.action}",
            "resource_type": "review",
            "resource_id": request.review_id,
            "details": {"notes": request.notes},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        return {"status": "success", "action": request.action}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review action failed: {str(e)}")


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    user: dict = Depends(get_current_user),
):
    """Submit feedback or dispute on an analysis result."""
    db = get_supabase()

    feedback_id = str(uuid.uuid4())
    try:
        # Store feedback
        db.table("feedback").insert({
            "id": feedback_id,
            "content_id": request.content_id,
            "user_id": user["user_id"],
            "feedback_type": request.feedback_type,
            "reason": request.reason,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        # Auto-create review queue item for disputes
        if request.feedback_type == "dispute":
            db.table("review_queue").insert({
                "id": str(uuid.uuid4()),
                "content_id": request.content_id,
                "feedback_id": feedback_id,
                "reason": request.reason,
                "priority": 5,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()

        # Audit log
        db.table("audit_logs").insert({
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "action": f"feedback_{request.feedback_type}",
            "resource_type": "feedback",
            "resource_id": feedback_id,
            "details": {"content_id": request.content_id},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        return {"status": "success", "feedback_id": feedback_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback submission failed: {str(e)}")


@router.get("/audit-report")
async def get_audit_report(
    user: dict = Depends(require_role("admin")),
    limit: int = 100,
):
    """Get audit trail (admin only)."""
    db = get_supabase()

    try:
        logs = (
            db.table("audit_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"logs": logs.data or []}
    except Exception as e:
        return {"logs": []}


def _compute_avg_score(analyses: list) -> float:
    if not analyses:
        return 0
    scores = [a.get("score", 0) for a in analyses if a.get("score") is not None]
    return round(sum(scores) / len(scores), 1) if scores else 0
