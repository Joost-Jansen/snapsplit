from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional


class UserBase(BaseModel):
    email: str
    display_name: str
    avatar_url: Optional[str] = None


class UserOut(UserBase):
    id: UUID
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
