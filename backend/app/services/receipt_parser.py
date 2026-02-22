import base64
import json
import httpx

from app.config import get_settings
from app.models.receipt import ParsedReceiptItem


RECEIPT_PROMPT = """You are a receipt parser. Extract ALL line items with their quantities and prices from this receipt image.
Ignore tax, tip, subtotal, and total lines.

Return ONLY a valid JSON array of objects with these exact keys:
- item_name: string (the item description)
- quantity: integer (default 1 if not shown)
- total_price: number (the line total for that item)

Example output:
[
  {"item_name": "Caesar Salad", "quantity": 1, "total_price": 12.50},
  {"item_name": "IPA Beer", "quantity": 2, "total_price": 16.00}
]

Return ONLY the JSON array. No markdown, no explanation, no code fences."""

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent"


async def parse_receipt_image(image_bytes: bytes) -> list[ParsedReceiptItem]:
    """Send receipt image directly to Gemini 3.0 Flash and parse items."""
    settings = get_settings()
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": RECEIPT_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 2000,
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{GEMINI_API_URL}?key={settings.gemini_api_key}",
            json=payload,
        )
        response.raise_for_status()

    result = response.json()
    raw_output = result["candidates"][0]["content"]["parts"][0]["text"].strip()

    # Clean up potential markdown fences
    if raw_output.startswith("```"):
        raw_output = raw_output.split("\n", 1)[1]
        if raw_output.endswith("```"):
            raw_output = raw_output[:-3].strip()

    try:
        items_data = json.loads(raw_output)
    except json.JSONDecodeError:
        # Retry once with a stricter prompt
        retry_payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"Fix this into valid JSON. Return ONLY a JSON array. No text.\n\n{raw_output}"
                        }
                    ]
                }
            ],
            "generationConfig": {"temperature": 0},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            retry_resp = await client.post(
                f"{GEMINI_API_URL}?key={settings.gemini_api_key}",
                json=retry_payload,
            )
            retry_resp.raise_for_status()
        retry_result = retry_resp.json()
        raw_retry = retry_result["candidates"][0]["content"]["parts"][0]["text"].strip()
        items_data = json.loads(raw_retry)

    return [ParsedReceiptItem(**item) for item in items_data]
