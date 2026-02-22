from uuid import UUID
from dataclasses import dataclass


@dataclass
class Debt:
    from_user: UUID
    to_user: UUID
    amount: float


def simplify_debts(balances: dict[str, float]) -> list[Debt]:
    """
    Simplify debts using a greedy algorithm.

    Input: dict mapping user_id -> net balance
        Positive = is owed money (creditor)
        Negative = owes money (debtor)

    This minimizes the number of transactions needed to settle all debts.
    Uses a greedy approach: match the largest debtor with the largest creditor.
    """
    # Separate into creditors and debtors
    creditors: list[tuple[str, float]] = []
    debtors: list[tuple[str, float]] = []

    for uid, balance in balances.items():
        if balance > 0.01:  # Is owed money
            creditors.append((uid, balance))
        elif balance < -0.01:  # Owes money
            debtors.append((uid, -balance))  # Store as positive amount

    # Sort both by amount (descending)
    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)

    transactions: list[Debt] = []

    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt_amount = debtors[i]
        creditor_id, credit_amount = creditors[j]

        # Transfer the minimum of what's owed and what's due
        transfer = min(debt_amount, credit_amount)
        transfer = round(transfer, 2)

        if transfer > 0.01:
            transactions.append(
                Debt(
                    from_user=UUID(debtor_id),
                    to_user=UUID(creditor_id),
                    amount=transfer,
                )
            )

        # Update remaining amounts
        debtors[i] = (debtor_id, round(debt_amount - transfer, 2))
        creditors[j] = (creditor_id, round(credit_amount - transfer, 2))

        # Move to next debtor/creditor if settled
        if debtors[i][1] < 0.01:
            i += 1
        if creditors[j][1] < 0.01:
            j += 1

    return transactions


def calculate_balances(
    user_shares: list[dict],
    payer_id: str,
    total_amount: float,
) -> dict[str, float]:
    """
    Calculate net balances given who paid and what each person owes.

    The payer paid the full bill, so they are owed (total - their_share).
    Everyone else owes their share.

    Returns: dict of user_id -> net balance
        Positive = is owed money
        Negative = owes money
    """
    balances: dict[str, float] = {}

    for share in user_shares:
        uid = str(share["user_id"])
        amount = share["total"]
        balances[uid] = balances.get(uid, 0) - amount  # They owe this much

    # The payer is credited for the full amount they paid
    balances[payer_id] = balances.get(payer_id, 0) + total_amount

    return balances
