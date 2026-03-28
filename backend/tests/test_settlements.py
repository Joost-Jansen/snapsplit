from uuid import UUID

import pytest
from fastapi import HTTPException

from app.routers import settlements
from tests.fakes import FakeDB, QueryState


ALICE = UUID('00000000-0000-0000-0000-000000000301')
BOB = UUID('00000000-0000-0000-0000-000000000302')
GROUP_ID = UUID('00000000-0000-0000-0000-000000000303')
EXPENSE_ID = UUID('00000000-0000-0000-0000-000000000304')
SETTLEMENT_ID = UUID('00000000-0000-0000-0000-000000000305')


@pytest.mark.asyncio
async def test_get_settlements_returns_existing_rows(monkeypatch):
    settlement_row = {
        'id': str(SETTLEMENT_ID),
        'expense_id': str(EXPENSE_ID),
        'from_user_id': str(BOB),
        'to_user_id': str(ALICE),
        'amount': 12.0,
        'is_paid': False,
        'created_at': '2026-03-28T12:00:00Z',
    }

    def handler(state: QueryState):
        if state.table_name == 'settlements' and state.action == 'select':
            return [settlement_row]
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(settlements, 'get_supabase_admin', lambda: FakeDB(handler))

    result = await settlements.get_settlements(EXPENSE_ID, ALICE)

    assert result == [settlement_row]


@pytest.mark.asyncio
async def test_get_settlements_calculates_and_persists(monkeypatch):
    inserted_rows: list[dict[str, object]] = []

    def handler(state: QueryState):
        if state.table_name == 'settlements' and state.action == 'select':
            return []
        if state.table_name == 'expenses' and state.action == 'select':
            return [{
                'id': str(EXPENSE_ID),
                'group_id': str(GROUP_ID),
                'created_by': str(ALICE),
                'description': 'Dinner',
                'total_amount': 24.0,
                'tax_amount': 4.0,
                'tip_amount': 0.0,
            }]
        if state.table_name == 'group_members' and state.action == 'select':
            return [{'id': 'membership-1'}]
        if state.table_name == 'receipt_items' and state.action == 'select':
            return [
                {
                    'total_price': 20.0,
                    'item_assignments': [{'user_id': str(BOB)}],
                }
            ]
        if state.table_name == 'settlements' and state.action == 'insert':
            inserted_rows.extend(state.payload)
            return [
                {
                    'id': str(SETTLEMENT_ID),
                    **state.payload[0],
                    'created_at': '2026-03-28T12:00:00Z',
                }
            ]
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(settlements, 'get_supabase_admin', lambda: FakeDB(handler))

    result = await settlements.get_settlements(EXPENSE_ID, ALICE)

    assert inserted_rows == [
        {
            'expense_id': str(EXPENSE_ID),
            'from_user_id': str(BOB),
            'to_user_id': str(ALICE),
            'amount': 24.0,
            'is_paid': False,
        }
    ]
    assert result[0]['from_user_id'] == str(BOB)
    assert result[0]['to_user_id'] == str(ALICE)


@pytest.mark.asyncio
async def test_mark_paid_rejects_unrelated_user(monkeypatch):
    def handler(state: QueryState):
        if state.table_name == 'settlements' and state.action == 'select':
            return [{
                'id': str(SETTLEMENT_ID),
                'expense_id': str(EXPENSE_ID),
                'from_user_id': str(BOB),
                'to_user_id': str(ALICE),
                'amount': 24.0,
                'is_paid': False,
                'created_at': '2026-03-28T12:00:00Z',
            }]
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(settlements, 'get_supabase_admin', lambda: FakeDB(handler))

    with pytest.raises(HTTPException) as exc:
        await settlements.mark_paid(SETTLEMENT_ID, UUID('00000000-0000-0000-0000-000000000399'))

    assert exc.value.status_code == 403
    assert exc.value.detail == 'Not involved in this settlement'


@pytest.mark.asyncio
async def test_mark_paid_updates_row(monkeypatch):
    updated_row = {
        'id': str(SETTLEMENT_ID),
        'expense_id': str(EXPENSE_ID),
        'from_user_id': str(BOB),
        'to_user_id': str(ALICE),
        'amount': 24.0,
        'is_paid': True,
        'created_at': '2026-03-28T12:00:00Z',
    }

    def handler(state: QueryState):
        if state.table_name == 'settlements' and state.action == 'select':
            return [{
                'id': str(SETTLEMENT_ID),
                'expense_id': str(EXPENSE_ID),
                'from_user_id': str(BOB),
                'to_user_id': str(ALICE),
                'amount': 24.0,
                'is_paid': False,
                'created_at': '2026-03-28T12:00:00Z',
            }]
        if state.table_name == 'settlements' and state.action == 'update':
            assert state.payload == {'is_paid': True}
            return [updated_row]
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(settlements, 'get_supabase_admin', lambda: FakeDB(handler))

    result = await settlements.mark_paid(SETTLEMENT_ID, ALICE)

    assert result == updated_row