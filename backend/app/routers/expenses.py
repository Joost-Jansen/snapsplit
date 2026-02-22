from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.middleware.auth import get_current_user_id
from app.db.client import get_supabase_admin
from app.models.expense import (
    ExpenseCreate,
    ExpenseOut,
    ExpenseDetail,
    UserShare,
)
from app.services.splitter import calculate_shares

router = APIRouter()


@router.post("", response_model=ExpenseOut, status_code=201)
async def create_expense(
    expense: ExpenseCreate,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create an expense with receipt items and assignments."""
    db = get_supabase_admin()

    # Verify user is in the group
    membership = (
        db.table("group_members")
        .select("id")
        .eq("group_id", str(expense.group_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Create expense
    expense_result = (
        db.table("expenses")
        .insert(
            {
                "group_id": str(expense.group_id),
                "created_by": str(user_id),
                "description": expense.description,
                "total_amount": expense.total_amount,
                "tax_amount": expense.tax_amount,
                "tip_amount": expense.tip_amount,
                "receipt_image_url": expense.receipt_image_url,
                "status": "pending",
            }
        )
        .execute()
    )

    if not expense_result.data:
        raise HTTPException(status_code=500, detail="Failed to create expense")

    expense_data = expense_result.data[0]
    expense_id = expense_data["id"]

    # Create receipt items and assignments
    for item in expense.items:
        item_result = (
            db.table("receipt_items")
            .insert(
                {
                    "expense_id": expense_id,
                    "item_name": item.item_name,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                }
            )
            .execute()
        )

        if item_result.data and item.assigned_user_ids:
            item_id = item_result.data[0]["id"]
            assignments = [
                {"receipt_item_id": item_id, "user_id": str(uid)}
                for uid in item.assigned_user_ids
            ]
            db.table("item_assignments").insert(assignments).execute()

    return expense_data


@router.get("/{expense_id}", response_model=ExpenseDetail)
async def get_expense(
    expense_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get expense details including items and assignments."""
    db = get_supabase_admin()

    # Fetch expense
    expense_result = (
        db.table("expenses").select("*").eq("id", str(expense_id)).execute()
    )

    if not expense_result.data:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense_data = expense_result.data[0]

    # Verify user is in the group
    membership = (
        db.table("group_members")
        .select("id")
        .eq("group_id", expense_data["group_id"])
        .eq("user_id", str(user_id))
        .execute()
    )
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Fetch items with assignments
    items_result = (
        db.table("receipt_items")
        .select("*, item_assignments(*)")
        .eq("expense_id", str(expense_id))
        .execute()
    )

    items = []
    for item in items_result.data:
        item_data = {**item}
        item_data["assignments"] = item_data.pop("item_assignments", [])
        items.append(item_data)

    expense_data["items"] = items
    return expense_data


@router.get("/{expense_id}/shares", response_model=list[UserShare])
async def get_expense_shares(
    expense_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Calculate proportional shares for an expense."""
    db = get_supabase_admin()

    # Fetch expense
    expense_result = (
        db.table("expenses").select("*").eq("id", str(expense_id)).execute()
    )
    if not expense_result.data:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense_data = expense_result.data[0]

    # Verify membership
    membership = (
        db.table("group_members")
        .select("id")
        .eq("group_id", expense_data["group_id"])
        .eq("user_id", str(user_id))
        .execute()
    )
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Fetch items with assignments
    items_result = (
        db.table("receipt_items")
        .select("*, item_assignments(user_id)")
        .eq("expense_id", str(expense_id))
        .execute()
    )

    # Build items list for splitter
    items_for_calc = []
    for item in items_result.data:
        assignments = item.get("item_assignments", [])
        items_for_calc.append(
            {
                "total_price": item["total_price"],
                "assigned_user_ids": [a["user_id"] for a in assignments],
            }
        )

    shares = calculate_shares(
        items=items_for_calc,
        tax_amount=expense_data["tax_amount"],
        tip_amount=expense_data["tip_amount"],
    )

    return shares
