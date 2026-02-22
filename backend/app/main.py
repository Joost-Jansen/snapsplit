from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, groups, receipts, expenses, settlements

app = FastAPI(
    title="SnapSplit API",
    description="Split receipts fairly with AI-powered receipt scanning",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])
app.include_router(receipts.router, prefix="/api/receipt", tags=["Receipts"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(settlements.router, prefix="/api/settlements", tags=["Settlements"])


@app.get("/")
async def root():
    return {"app": "SnapSplit", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
