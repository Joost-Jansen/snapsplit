from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class QueryState:
    table_name: str
    action: str = 'select'
    payload: Any = None
    filters: dict[str, Any] = field(default_factory=dict)
    order_by: tuple[str, bool] | None = None
    selected: tuple[Any, ...] = field(default_factory=tuple)


class FakeResult:
    def __init__(self, data: Any):
        self.data = data


class FakeQuery:
    def __init__(self, db: 'FakeDB', table_name: str):
        self.db = db
        self.state = QueryState(table_name=table_name)

    def select(self, *args: Any):
        self.state.action = 'select'
        self.state.selected = args
        return self

    def eq(self, key: str, value: Any):
        self.state.filters[key] = value
        return self

    def in_(self, key: str, values: list[Any]):
        self.state.filters[key] = list(values)
        return self

    def order(self, column: str, desc: bool = False):
        self.state.order_by = (column, desc)
        return self

    def insert(self, payload: Any):
        self.state.action = 'insert'
        self.state.payload = payload
        return self

    def update(self, payload: Any):
        self.state.action = 'update'
        self.state.payload = payload
        return self

    def delete(self):
        self.state.action = 'delete'
        return self

    def execute(self):
        return FakeResult(self.db.handler(self.state))


class FakeDB:
    def __init__(self, handler: Callable[[QueryState], Any]):
        self.handler = handler

    def table(self, table_name: str):
        return FakeQuery(self, table_name)