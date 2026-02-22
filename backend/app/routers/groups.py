from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.middleware.auth import get_current_user_id
from app.db.client import get_supabase_admin
from app.models.group import (
    GroupCreate,
    GroupOut,
    GroupDetail,
    GroupMemberOut,
    AddMemberRequest,
)

router = APIRouter()


@router.post("", response_model=GroupOut, status_code=201)
async def create_group(
    group: GroupCreate,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new group and add the creator as admin."""
    db = get_supabase_admin()

    # Create the group
    result = (
        db.table("groups")
        .insert({"name": group.name, "created_by": str(user_id)})
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create group")

    group_data = result.data[0]

    # Add creator as admin member
    db.table("group_members").insert(
        {
            "group_id": group_data["id"],
            "user_id": str(user_id),
            "role": "admin",
        }
    ).execute()

    return group_data


@router.get("", response_model=list[GroupOut])
async def list_groups(user_id: UUID = Depends(get_current_user_id)):
    """List all groups the current user is a member of."""
    db = get_supabase_admin()

    # Get group IDs where user is a member
    memberships = (
        db.table("group_members")
        .select("group_id")
        .eq("user_id", str(user_id))
        .execute()
    )

    if not memberships.data:
        return []

    group_ids = [m["group_id"] for m in memberships.data]

    # Fetch the groups
    result = (
        db.table("groups")
        .select("*")
        .in_("id", group_ids)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group(
    group_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get group details including members."""
    db = get_supabase_admin()

    # Verify user is a member
    membership = (
        db.table("group_members")
        .select("id")
        .eq("group_id", str(group_id))
        .eq("user_id", str(user_id))
        .execute()
    )

    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Fetch group
    group_result = (
        db.table("groups").select("*").eq("id", str(group_id)).execute()
    )

    if not group_result.data:
        raise HTTPException(status_code=404, detail="Group not found")

    # Fetch members with user info
    members_result = (
        db.table("group_members")
        .select("*, users(id, display_name, avatar_url)")
        .eq("group_id", str(group_id))
        .execute()
    )

    group_data = group_result.data[0]
    members = []
    for m in members_result.data:
        member = {**m}
        member["user"] = member.pop("users", None)
        members.append(member)

    group_data["members"] = members
    return group_data


@router.post("/{group_id}/members", response_model=GroupMemberOut, status_code=201)
async def add_member(
    group_id: UUID,
    request: AddMemberRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Add a member to a group. Only admins can add members."""
    db = get_supabase_admin()

    # Verify requester is an admin
    admin_check = (
        db.table("group_members")
        .select("role")
        .eq("group_id", str(group_id))
        .eq("user_id", str(user_id))
        .execute()
    )

    if not admin_check.data or admin_check.data[0]["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add members")

    # Check if user is already a member
    existing = (
        db.table("group_members")
        .select("id")
        .eq("group_id", str(group_id))
        .eq("user_id", str(request.user_id))
        .execute()
    )

    if existing.data:
        raise HTTPException(status_code=409, detail="User is already a member")

    # Add the member
    result = (
        db.table("group_members")
        .insert(
            {
                "group_id": str(group_id),
                "user_id": str(request.user_id),
                "role": request.role.value,
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to add member")

    return result.data[0]


@router.delete("/{group_id}/members/{member_user_id}", status_code=204)
async def remove_member(
    group_id: UUID,
    member_user_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Remove a member from a group. Admins can remove anyone; members can remove themselves."""
    db = get_supabase_admin()

    # Check requester's role
    requester = (
        db.table("group_members")
        .select("role")
        .eq("group_id", str(group_id))
        .eq("user_id", str(user_id))
        .execute()
    )

    if not requester.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    is_admin = requester.data[0]["role"] == "admin"
    is_self = str(user_id) == str(member_user_id)

    if not is_admin and not is_self:
        raise HTTPException(
            status_code=403, detail="Only admins can remove other members"
        )

    db.table("group_members").delete().eq("group_id", str(group_id)).eq(
        "user_id", str(member_user_id)
    ).execute()
