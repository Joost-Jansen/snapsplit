from uuid import UUID

from app.models.expense import UserShare


def calculate_shares(
    items: list[dict],
    tax_amount: float,
    tip_amount: float,
) -> list[UserShare]:
    """
    Calculate proportional shares for each user.

    Each item in `items` should have:
        - total_price: float
        - assigned_user_ids: list[UUID]

    Tax and tip are distributed proportionally based on each user's
    share of the base item costs, not split evenly.

    Math:
        S_p = sum(price_j / users_sharing_j) for items assigned to user p
        T = tax + tip (total overhead)
        Total_p = S_p + (S_p / sum(S_k for all k)) * T
    """
    # Calculate base share per user
    user_shares: dict[str, float] = {}

    for item in items:
        price = item["total_price"]
        assigned = item["assigned_user_ids"]

        if not assigned:
            continue

        per_person = price / len(assigned)
        for uid in assigned:
            uid_str = str(uid)
            user_shares[uid_str] = user_shares.get(uid_str, 0) + per_person

    # Calculate total base
    total_base = sum(user_shares.values())
    total_overhead = tax_amount + tip_amount

    # Build results with proportional tax/tip
    results = []
    for uid_str, base_share in user_shares.items():
        if total_base > 0:
            proportion = base_share / total_base
        else:
            proportion = 0

        tax_share = tax_amount * proportion
        tip_share = tip_amount * proportion
        total = base_share + tax_share + tip_share

        results.append(
            UserShare(
                user_id=UUID(uid_str),
                base_share=round(base_share, 2),
                tax_share=round(tax_share, 2),
                tip_share=round(tip_share, 2),
                total=round(total, 2),
            )
        )

    return results
