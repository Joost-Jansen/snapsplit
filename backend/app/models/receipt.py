from pydantic import BaseModel
from typing import Optional


class ParsedReceiptItem(BaseModel):
    item_name: str
    quantity: int = 1
    total_price: float


class ReceiptScanResponse(BaseModel):
    items: list[ParsedReceiptItem]
    raw_text: Optional[str] = None
    confidence: Optional[float] = None
