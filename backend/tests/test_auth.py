from uuid import UUID

import pytest
from fastapi import HTTPException

from app.models.user import UserUpdate
from app.routers import auth
from tests.fakes import FakeDB, QueryState


USER_ID = UUID('00000000-0000-0000-0000-000000000123')


@pytest.mark.asyncio
async def test_get_me_returns_profile(monkeypatch):
    user_row = {
        'id': str(USER_ID),
        'email': 'joost@example.com',
        'display_name': 'Joost',
        'avatar_url': None,
        'created_at': '2026-03-28T12:00:00Z',
    }

    def handler(state: QueryState):
        if state.table_name == 'users' and state.action == 'select':
            assert state.filters == {'id': str(USER_ID)}
            return [user_row]
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(auth, 'get_supabase_admin', lambda: FakeDB(handler))

    result = await auth.get_me(USER_ID)

    assert result == user_row


@pytest.mark.asyncio
async def test_update_me_rejects_empty_update(monkeypatch):
    monkeypatch.setattr(auth, 'get_supabase_admin', lambda: FakeDB(lambda _state: []))

    with pytest.raises(HTTPException) as exc:
        await auth.update_me(UserUpdate(), USER_ID)

    assert exc.value.status_code == 400
    assert exc.value.detail == 'No fields to update'


@pytest.mark.asyncio
async def test_update_me_updates_profile(monkeypatch):
    updated_user = {
        'id': str(USER_ID),
        'email': 'joost@example.com',
        'display_name': 'Joost Updated',
        'avatar_url': None,
        'created_at': '2026-03-28T12:00:00Z',
    }

    def handler(state: QueryState):
        if state.table_name == 'users' and state.action == 'update':
            assert state.payload == {'display_name': 'Joost Updated'}
            assert state.filters == {'id': str(USER_ID)}
            return [updated_user]
        raise AssertionError(f'Unexpected query: {state}')

    monkeypatch.setattr(auth, 'get_supabase_admin', lambda: FakeDB(handler))

    result = await auth.update_me(UserUpdate(display_name='Joost Updated'), USER_ID)

    assert result == updated_user