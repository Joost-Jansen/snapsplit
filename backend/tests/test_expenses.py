from uuid import UUID

import pytest

from app.models.expense import ExpenseCreate, ReceiptItemCreate
from app.routers import expenses
from tests.fakes import FakeDB, QueryState


USER_ID = UUID('00000000-0000-0000-0000-000000000101')
GROUP_ID = UUID('00000000-0000-0000-0000-000000000102')
ASSIGNEE_ID = UUID('00000000-0000-0000-0000-000000000103')
EXPENSE_ID = '00000000-0000-0000-0000-000000000104'
ITEM_ID = '00000000-0000-0000-0000-000000000105'


@pytest.mark.asyncio
async def test_create_expense_persists_items_and_assignments(monkeypatch):
    created_expense = {
        'id': EXPENSE_ID,
        'group_id': str(GROUP_ID),
        'created_by': str(USER_ID),
        'description': 'Dinner',
        'total_amount': 25.0,
        'tax_amount': 2.0,
        'tip_amount': 3.0,
        'receipt_image_url': None,
        'status': 'pending',
        'created_at': '2026-03-28T12:00:00Z',
    }
    captured_assignment_payloads: list[list[dict[str, str]]] = []

    def handler(state: QueryState):
        if state.table_name == 'group_members' and state.action == 'select':
            return [{'id': 'membership-1'}]
        if state.table_name == 'expenses' and state.action == 'insert':
            assert state.payload['group_id'] == str(GROUP_ID)
            assert state.payload['created_by'] == str(USER_ID)
            return [created_expense]
        if state.table_name == 'receipt_items' and state.action == 'insert':
            assert state.payload['expense_id'] == EXPENSE_ID
            return [{'id': ITEM_ID}]
        if state.table_name == 'item_assignments' and state.action == 'insert':
            captured_assignment_payloads.append(state.payload)
            return state.payload
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(expenses, 'get_supabase_admin', lambda: FakeDB(handler))

    payload = ExpenseCreate(
        group_id=GROUP_ID,
        description='Dinner',
        total_amount=25.0,
        tax_amount=2.0,
        tip_amount=3.0,
        items=[
          ReceiptItemCreate(
              item_name='Pizza',
              quantity=1,
              unit_price=20.0,
              total_price=20.0,
              assigned_user_ids=[ASSIGNEE_ID],
          )
        ],
    )

    result = await expenses.create_expense(payload, USER_ID)

    assert result == created_expense
    assert captured_assignment_payloads == [
        [{'receipt_item_id': ITEM_ID, 'user_id': str(ASSIGNEE_ID)}]
    ]


@pytest.mark.asyncio
async def test_get_expense_returns_items_with_assignments(monkeypatch):
    expense_row = {
        'id': EXPENSE_ID,
        'group_id': str(GROUP_ID),
        'created_by': str(USER_ID),
        'description': 'Dinner',
        'total_amount': 25.0,
        'tax_amount': 2.0,
        'tip_amount': 3.0,
        'receipt_image_url': None,
        'status': 'pending',
        'created_at': '2026-03-28T12:00:00Z',
    }
    item_row = {
        'id': ITEM_ID,
        'expense_id': EXPENSE_ID,
        'item_name': 'Pizza',
        'quantity': 1,
        'unit_price': 20.0,
        'total_price': 20.0,
        'item_assignments': [
            {'id': 'assignment-1', 'receipt_item_id': ITEM_ID, 'user_id': str(ASSIGNEE_ID)}
        ],
    }

    def handler(state: QueryState):
        if state.table_name == 'expenses' and state.action == 'select':
            return [expense_row]
        if state.table_name == 'group_members' and state.action == 'select':
            return [{'id': 'membership-1'}]
        if state.table_name == 'receipt_items' and state.action == 'select':
            return [item_row]
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(expenses, 'get_supabase_admin', lambda: FakeDB(handler))

    result = await expenses.get_expense(UUID(EXPENSE_ID), USER_ID)

    assert result['id'] == EXPENSE_ID
    assert result['items'][0]['assignments'][0]['user_id'] == str(ASSIGNEE_ID)


@pytest.mark.asyncio
async def test_get_expense_shares_calculates_split(monkeypatch):
    expense_row = {
        'id': EXPENSE_ID,
        'group_id': str(GROUP_ID),
        'created_by': str(USER_ID),
        'description': 'Dinner',
        'total_amount': 24.0,
        'tax_amount': 4.0,
        'tip_amount': 0.0,
        'receipt_image_url': None,
        'status': 'pending',
        'created_at': '2026-03-28T12:00:00Z',
    }
    items = [
        {
            'id': ITEM_ID,
            'expense_id': EXPENSE_ID,
            'item_name': 'Pizza',
            'quantity': 1,
            'unit_price': 20.0,
            'total_price': 20.0,
            'item_assignments': [{'user_id': str(ASSIGNEE_ID)}],
        }
    ]

    def handler(state: QueryState):
        if state.table_name == 'expenses' and state.action == 'select':
            return [expense_row]
        if state.table_name == 'group_members' and state.action == 'select':
            return [{'id': 'membership-1'}]
        if state.table_name == 'receipt_items' and state.action == 'select':
            return items
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(expenses, 'get_supabase_admin', lambda: FakeDB(handler))

    result = await expenses.get_expense_shares(UUID(EXPENSE_ID), USER_ID)

    assert len(result) == 1
    assert str(result[0].user_id) == str(ASSIGNEE_ID)
    assert result[0].total == 24.0