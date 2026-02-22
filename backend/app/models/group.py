from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional
from enum import Enum


class MemberRole(str, Enum):
    admin = "admin"
    member = "member"


class GroupCreate(BaseModel):
    name: str


class GroupOut(BaseModel):
    id: UUID
    name: str
    created_by: UUID
    created_at: datetime


class GroupDetail(GroupOut):
    members: list["GroupMemberOut"] = []


class GroupMemberOut(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    role: MemberRole
    joined_at: datetime
    user: Optional["UserInfo"] = None


class UserInfo(BaseModel):
    id: UUID
    display_name: str
    avatar_url: Optional[str] = None


class AddMemberRequest(BaseModel):
    user_id: UUID
    role: MemberRole = MemberRole.member


# Rebuild models to resolve forward refs
GroupDetail.model_rebuild()
GroupMemberOut.model_rebuild()
