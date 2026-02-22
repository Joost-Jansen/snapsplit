from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models.receipt import ReceiptScanResponse
from app.services.receipt_parser import parse_receipt_image

router = APIRouter()


@router.post("/scan", response_model=ReceiptScanResponse)
async def scan_receipt(
    file: UploadFile = File(...),
):
    # TODO: Re-enable auth once login flow is built
    # user_id: UUID = Depends(get_current_user_id)
    """Upload a receipt image and get parsed line items."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read image bytes (limit to 10MB)
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    try:
        items = await parse_receipt_image(image_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse receipt: {str(e)}"
        )

    return ReceiptScanResponse(items=items)
