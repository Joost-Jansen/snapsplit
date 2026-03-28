from uuid import UUID

import pytest
from fastapi import HTTPException

from app.routers import groups


GROUP_ID = UUID('00000000-0000-0000-0000-000000000111')
USER_ID = UUID('00000000-0000-0000-0000-000000000222')


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table_name, responses):
        self.table_name = table_name
        self.responses = responses
        self.filters = {}
        self.ordering = None

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def order(self, column, desc=False):
        self.ordering = (column, desc)
        return self

    def execute(self):
        handler = self.responses[self.table_name]
        return FakeResult(handler(self.filters, self.ordering))


class FakeDB:
    def __init__(self, responses):
        self.responses = responses

    def table(self, table_name):
        return FakeQuery(table_name, self.responses)


@pytest.mark.asyncio
async def test_list_group_expenses_returns_group_expenses(monkeypatch):
    expense_row = {
        'id': 'expense-1',
        'group_id': str(GROUP_ID),
        'created_by': str(USER_ID),
        'description': 'Dinner',
        'total_amount': 54.5,
        'tax_amount': 4.5,
        'tip_amount': 0.0,
        'receipt_image_url': None,
        'status': 'pending',
        'created_at': '2026-03-28T12:00:00Z',
    }

    fake_db = FakeDB(
        {
            'group_members': lambda filters, _ordering: [
                {'id': 'membership-1'}
            ]
            if filters == {'group_id': str(GROUP_ID), 'user_id': str(USER_ID)}
            else [],
            'expenses': lambda filters, ordering: [expense_row]
            if filters == {'group_id': str(GROUP_ID)} and ordering == ('created_at', True)
            else [],
        }
    )

    monkeypatch.setattr(groups, 'get_supabase_admin', lambda: fake_db)

    result = await groups.list_group_expenses(GROUP_ID, USER_ID)

    assert result == [expense_row]


@pytest.mark.asyncio
async def test_list_group_expenses_rejects_non_members(monkeypatch):
    fake_db = FakeDB(
        {
            'group_members': lambda _filters, _ordering: [],
            'expenses': lambda _filters, _ordering: [],
        }
    )

    monkeypatch.setattr(groups, 'get_supabase_admin', lambda: fake_db)

    with pytest.raises(HTTPException) as exc:
        await groups.list_group_expenses(GROUP_ID, USER_ID)

    assert exc.value.status_code == 403
    assert exc.value.detail == 'Not a member of this group'