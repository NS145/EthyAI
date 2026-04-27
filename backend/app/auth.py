"""
Supabase auth middleware - validates JWT tokens from Supabase Auth.
"""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate Supabase JWT and return user payload.
    Returns a dict with user_id, email, role, etc.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")

        return {
            "user_id": user_id,
            "email": payload.get("email", ""),
            "role": payload.get("role", "authenticated"),
            "app_metadata": payload.get("app_metadata", {}),
            "user_metadata": payload.get("user_metadata", {}),
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict | None:
    """Optional auth - returns None if no token provided."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_role(required_role: str):
    """Dependency factory that requires a specific role."""
    async def _check_role(user: dict = Depends(get_current_user)):
        user_role = user.get("app_metadata", {}).get("role", "user")
        if user_role != required_role and required_role == "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    return _check_role
