from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.middleware.auth import get_current_user_id
from app.db.client import get_supabase_admin
from app.models.expense import SettlementOut
from app.services.splitter import calculate_shares
from app.services.debt_simplifier import simplify_debts, calculate_balances

router = APIRouter()


@router.get(
    "/expense/{expense_id}", response_model=list[SettlementOut]
)
async def get_settlements(
    expense_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get or calculate settlements for an expense."""
    db = get_supabase_admin()

    # Check for existing settlements
    existing = (
        db.table("settlements")
        .select("*")
        .eq("expense_id", str(expense_id))
        .execute()
    )

    if existing.data:
        return existing.data

    # Calculate settlements from scratch
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

    items_for_calc = []
    for item in items_result.data:
        assignments = item.get("item_assignments", [])
        items_for_calc.append(
            {
                "total_price": item["total_price"],
                "assigned_user_ids": [a["user_id"] for a in assignments],
            }
        )

    # Calculate shares
    shares = calculate_shares(
        items=items_for_calc,
        tax_amount=expense_data["tax_amount"],
        tip_amount=expense_data["tip_amount"],
    )

    # Calculate balances and simplify debts
    share_dicts = [{"user_id": str(s.user_id), "total": s.total} for s in shares]
    balances = calculate_balances(
        user_shares=share_dicts,
        payer_id=expense_data["created_by"],
        total_amount=expense_data["total_amount"],
    )

    debts = simplify_debts(balances)

    # Save settlements to DB
    settlement_rows = [
        {
            "expense_id": str(expense_id),
            "from_user_id": str(d.from_user),
            "to_user_id": str(d.to_user),
            "amount": d.amount,
            "is_paid": False,
        }
        for d in debts
    ]

    if settlement_rows:
        result = db.table("settlements").insert(settlement_rows).execute()
        return result.data

    return []


@router.post("/{settlement_id}/mark-paid", response_model=SettlementOut)
async def mark_paid(
    settlement_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Mark a settlement as paid."""
    db = get_supabase_admin()

    # Fetch settlement
    settlement = (
        db.table("settlements")
        .select("*")
        .eq("id", str(settlement_id))
        .execute()
    )

    if not settlement.data:
        raise HTTPException(status_code=404, detail="Settlement not found")

    s = settlement.data[0]

    # Only the payer or payee can mark as paid
    if str(user_id) not in [s["from_user_id"], s["to_user_id"]]:
        raise HTTPException(status_code=403, detail="Not involved in this settlement")

    result = (
        db.table("settlements")
        .update({"is_paid": True})
        .eq("id", str(settlement_id))
        .execute()
    )

    return result.data[0]
