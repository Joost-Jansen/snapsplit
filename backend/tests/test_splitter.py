"""Tests for the proportional splitter and debt simplifier."""
import pytest
from uuid import UUID

from app.services.splitter import calculate_shares
from app.services.debt_simplifier import simplify_debts, calculate_balances


# Test UUIDs
ALICE = "00000000-0000-0000-0000-000000000001"
BOB = "00000000-0000-0000-0000-000000000002"
CHARLIE = "00000000-0000-0000-0000-000000000003"
DIANA = "00000000-0000-0000-0000-000000000004"


class TestCalculateShares:
    def test_even_split_two_people(self):
        items = [
            {"total_price": 20.0, "assigned_user_ids": [ALICE, BOB]},
        ]
        shares = calculate_shares(items, tax_amount=0, tip_amount=0)
        assert len(shares) == 2
        assert all(s.total == 10.0 for s in shares)

    def test_uneven_items(self):
        items = [
            {"total_price": 30.0, "assigned_user_ids": [ALICE]},  # Alice alone
            {"total_price": 10.0, "assigned_user_ids": [BOB]},  # Bob alone
        ]
        shares = calculate_shares(items, tax_amount=0, tip_amount=0)
        alice = next(s for s in shares if str(s.user_id) == ALICE)
        bob = next(s for s in shares if str(s.user_id) == BOB)
        assert alice.total == 30.0
        assert bob.total == 10.0

    def test_proportional_tax(self):
        items = [
            {"total_price": 30.0, "assigned_user_ids": [ALICE]},
            {"total_price": 10.0, "assigned_user_ids": [BOB]},
        ]
        shares = calculate_shares(items, tax_amount=8.0, tip_amount=0)
        alice = next(s for s in shares if str(s.user_id) == ALICE)
        bob = next(s for s in shares if str(s.user_id) == BOB)
        # Alice: 30/40 * 8 = 6.0 tax → total 36.0
        # Bob: 10/40 * 8 = 2.0 tax → total 12.0
        assert alice.total == 36.0
        assert bob.total == 12.0

    def test_proportional_tax_and_tip(self):
        items = [
            {"total_price": 20.0, "assigned_user_ids": [ALICE]},
            {"total_price": 20.0, "assigned_user_ids": [BOB]},
        ]
        shares = calculate_shares(items, tax_amount=4.0, tip_amount=6.0)
        # Even split: each gets 50% of 10.0 overhead = 5.0
        assert all(s.total == 25.0 for s in shares)

    def test_shared_items(self):
        items = [
            {"total_price": 30.0, "assigned_user_ids": [ALICE, BOB, CHARLIE]},
        ]
        shares = calculate_shares(items, tax_amount=0, tip_amount=0)
        assert len(shares) == 3
        assert all(s.total == 10.0 for s in shares)

    def test_no_assignments(self):
        items = [
            {"total_price": 20.0, "assigned_user_ids": []},
        ]
        shares = calculate_shares(items, tax_amount=0, tip_amount=0)
        assert len(shares) == 0


class TestDebtSimplifier:
    def test_simple_two_person(self):
        # Alice paid 40, owes 20. Bob paid 0, owes 20.
        balances = {ALICE: 20.0, BOB: -20.0}
        debts = simplify_debts(balances)
        assert len(debts) == 1
        assert debts[0].from_user == UUID(BOB)
        assert debts[0].to_user == UUID(ALICE)
        assert debts[0].amount == 20.0

    def test_chain_simplification(self):
        # A is owed 20, B is neutral, C owes 20
        # Without simplification: C→B 10, B→A 10, C→A 10 (3 transactions)
        # With simplification: C→A 20 (1 transaction)
        balances = {ALICE: 20.0, BOB: 0.0, CHARLIE: -20.0}
        debts = simplify_debts(balances)
        assert len(debts) == 1
        assert debts[0].from_user == UUID(CHARLIE)
        assert debts[0].to_user == UUID(ALICE)
        assert debts[0].amount == 20.0

    def test_four_people(self):
        # Alice is owed 30, Bob is owed 10, Charlie owes 25, Diana owes 15
        balances = {ALICE: 30.0, BOB: 10.0, CHARLIE: -25.0, DIANA: -15.0}
        debts = simplify_debts(balances)
        total_transferred = sum(d.amount for d in debts)
        assert total_transferred == 40.0  # Total debt = 40
        assert len(debts) <= 3  # Should be simplified

    def test_all_balanced(self):
        balances = {ALICE: 0.0, BOB: 0.0}
        debts = simplify_debts(balances)
        assert len(debts) == 0


class TestCalculateBalances:
    def test_one_payer(self):
        shares = [
            {"user_id": ALICE, "total": 30.0},
            {"user_id": BOB, "total": 10.0},
        ]
        balances = calculate_balances(shares, payer_id=ALICE, total_amount=40.0)
        # Alice paid 40, owes 30 → net +10
        # Bob paid 0, owes 10 → net -10
        assert balances[ALICE] == 10.0
        assert balances[BOB] == -10.0
