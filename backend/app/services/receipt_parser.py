import base64
import json
import httpx
from openai import OpenAI

from app.config import get_settings
from app.models.receipt import ParsedReceiptItem


RECEIPT_SYSTEM_PROMPT = """You are a receipt parser. You will receive an image of a receipt.
Extract ALL line items with their quantities and prices.
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


async def parse_receipt_image(image_bytes: bytes) -> list[ParsedReceiptItem]:
    """Send receipt image directly to LLM vision model and parse items."""
    settings = get_settings()
    client = OpenAI(api_key=settings.openai_api_key)

    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": RECEIPT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                            "detail": "high",
                        },
                    },
                    {
                        "type": "text",
                        "text": "Extract all line items from this receipt.",
                    },
                ],
            },
        ],
        max_tokens=2000,
        temperature=0,
    )

    raw_output = response.choices[0].message.content.strip()

    # Clean up potential markdown fences
    if raw_output.startswith("```"):
        raw_output = raw_output.split("\n", 1)[1]
        if raw_output.endswith("```"):
            raw_output = raw_output[:-3].strip()

    try:
        items_data = json.loads(raw_output)
    except json.JSONDecodeError:
        # Retry once with a stricter prompt
        retry_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Fix this into valid JSON. Return ONLY a JSON array. No text.",
                },
                {"role": "user", "content": raw_output},
            ],
            max_tokens=2000,
            temperature=0,
        )
        items_data = json.loads(retry_response.choices[0].message.content.strip())

    return [ParsedReceiptItem(**item) for item in items_data]
