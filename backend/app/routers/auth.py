from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.middleware.auth import get_current_user_id
from app.db.client import get_supabase_admin
from app.models.user import UserOut, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(user_id: UUID = Depends(get_current_user_id)):
    """Get the current authenticated user's profile."""
    db = get_supabase_admin()
    result = db.table("users").select("*").eq("id", str(user_id)).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    return result.data[0]


@router.put("/me", response_model=UserOut)
async def update_me(
    updates: UserUpdate,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update the current user's profile."""
    db = get_supabase_admin()
    update_data = updates.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("users")
        .update(update_data)
        .eq("id", str(user_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return result.data[0]
