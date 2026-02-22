from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional
from enum import Enum


class ExpenseStatus(str, Enum):
    pending = "pending"
    settled = "settled"


class ReceiptItemOut(BaseModel):
    id: UUID
    expense_id: UUID
    item_name: str
    quantity: int
    unit_price: float
    total_price: float


class ItemAssignmentOut(BaseModel):
    id: UUID
    receipt_item_id: UUID
    user_id: UUID


class ReceiptItemWithAssignments(ReceiptItemOut):
    assignments: list[ItemAssignmentOut] = []


class ItemAssignmentCreate(BaseModel):
    receipt_item_id: UUID
    user_id: UUID


class ReceiptItemCreate(BaseModel):
    item_name: str
    quantity: int = 1
    unit_price: float
    total_price: float
    assigned_user_ids: list[UUID] = []


class ExpenseCreate(BaseModel):
    group_id: UUID
    description: str = ""
    total_amount: float
    tax_amount: float = 0.0
    tip_amount: float = 0.0
    receipt_image_url: Optional[str] = None
    items: list[ReceiptItemCreate] = []


class ExpenseOut(BaseModel):
    id: UUID
    group_id: UUID
    created_by: UUID
    description: str
    total_amount: float
    tax_amount: float
    tip_amount: float
    receipt_image_url: Optional[str] = None
    status: ExpenseStatus
    created_at: datetime


class ExpenseDetail(ExpenseOut):
    items: list[ReceiptItemWithAssignments] = []


class SettlementOut(BaseModel):
    id: UUID
    expense_id: UUID
    from_user_id: UUID
    to_user_id: UUID
    amount: float
    is_paid: bool
    created_at: datetime


class UserShare(BaseModel):
    user_id: UUID
    base_share: float
    tax_share: float
    tip_share: float
    total: float
