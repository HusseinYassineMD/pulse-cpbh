"""Scan public feeds for brain-health trends."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user
from app.models import User
from app.schemas import TrendScanResponse
from app.services.trends import scan_brain_health_trends

router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("/scan", response_model=TrendScanResponse)
async def scan_trends(
    limit: int = Query(default=12, ge=1, le=24),
    _user: User = Depends(get_current_user),
):
    items, sources = await scan_brain_health_trends(limit=limit)
    return TrendScanResponse(
        scanned_at=datetime.now(timezone.utc),
        sources_checked=sources,
        items=items,
    )
