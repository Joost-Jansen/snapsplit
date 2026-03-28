from io import BytesIO
from uuid import UUID

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.models.receipt import ParsedReceiptItem
from app.routers import receipts


USER_ID = UUID('00000000-0000-0000-0000-000000000201')


def make_upload_file(content: bytes, filename: str, content_type: str) -> UploadFile:
    return UploadFile(
        file=BytesIO(content),
        filename=filename,
        headers=Headers({'content-type': content_type}),
    )


@pytest.mark.asyncio
async def test_scan_receipt_rejects_non_images():
    upload = make_upload_file(b'not-an-image', 'receipt.txt', 'text/plain')

    with pytest.raises(HTTPException) as exc:
        await receipts.scan_receipt(upload, USER_ID)

    assert exc.value.status_code == 400
    assert exc.value.detail == 'File must be an image'


@pytest.mark.asyncio
async def test_scan_receipt_rejects_large_files():
    upload = make_upload_file(b'a' * (10 * 1024 * 1024 + 1), 'receipt.jpg', 'image/jpeg')

    with pytest.raises(HTTPException) as exc:
        await receipts.scan_receipt(upload, USER_ID)

    assert exc.value.status_code == 400
    assert exc.value.detail == 'Image too large (max 10MB)'


@pytest.mark.asyncio
async def test_scan_receipt_returns_parsed_items(monkeypatch):
    async def fake_parse_receipt_image(image_bytes: bytes):
        assert image_bytes == b'jpeg-bytes'
        return [ParsedReceiptItem(item_name='Pizza', quantity=1, total_price=12.5)]

    monkeypatch.setattr(receipts, 'parse_receipt_image', fake_parse_receipt_image)

    upload = make_upload_file(b'jpeg-bytes', 'receipt.jpg', 'image/jpeg')

    result = await receipts.scan_receipt(upload, USER_ID)

    assert result.items[0].item_name == 'Pizza'
    assert result.items[0].total_price == 12.5