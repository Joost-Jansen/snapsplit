# SnapSplit

**Split receipts fairly with your friends using AI-powered receipt scanning.**

SnapSplit lets you snap a photo of a receipt, automatically extracts line items using OCR + LLM, and allows group members to claim items — then calculates exactly who owes what, including proportional tax and tip.

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend (Mobile) | React Native (Expo) | Cross-platform iOS/Android app |
| Backend (API) | Python (FastAPI) | REST API, business logic, ML pipeline |
| Database & Auth | Supabase (PostgreSQL) | Auth, relational data, real-time |
| OCR | Google Cloud Vision API | Raw text extraction from receipt images |
| Receipt Parsing | LLM (Gemini Pro / GPT-4o) | Structured JSON extraction from OCR text |

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  React Native    │────▶│   FastAPI        │────▶│  Supabase        │
│  (Expo)          │◀────│   Backend        │◀────│  (PostgreSQL)    │
└─────────────────┘     └────────┬─────────┘     └──────────────────┘
                                 │
                        ┌────────┴─────────┐
                        │                  │
                  ┌─────▼──────┐    ┌──────▼──────┐
                  │ Cloud       │    │ LLM         │
                  │ Vision API  │    │ (Gemini/    │
                  │ (OCR)       │    │  GPT-4o)    │
                  └────────────┘    └─────────────┘
```

---

## Core Features

1. **Receipt Scanning** — Take a photo, get structured line items automatically
2. **Item Assignment** — Tap avatars to assign items to group members
3. **Proportional Splitting** — Tax/tip distributed proportionally, not evenly
4. **Debt Simplification** — Minimizes the number of payments between people
5. **Group Management** — Create groups, invite friends, track expenses

---

## Math: Proportional Splitting

Let $B$ = total bill (including tax & tip), $\sum I$ = subtotal of all items.

Shared overhead: $T = B - \sum I$

User $p$'s base share:

$$S_p = \sum_{j \in \text{items\_for\_p}} \frac{\text{Price}_j}{\text{Users\_Sharing}_j}$$

User $p$'s final total:

$$\text{Total}_p = S_p + \left( \frac{S_p}{\sum_k S_k} \times T \right)$$

---

## Database Schema

```
Users
├── id (uuid, PK)
├── email
├── display_name
├── avatar_url
└── created_at

Groups
├── id (uuid, PK)
├── name
├── created_by (FK → Users)
└── created_at

GroupMembers
├── id (uuid, PK)
├── group_id (FK → Groups)
├── user_id (FK → Users)
├── role (admin/member)
└── joined_at

Expenses
├── id (uuid, PK)
├── group_id (FK → Groups)
├── created_by (FK → Users)
├── description
├── total_amount
├── tax_amount
├── tip_amount
├── receipt_image_url
├── status (pending/settled)
└── created_at

ReceiptItems
├── id (uuid, PK)
├── expense_id (FK → Expenses)
├── item_name
├── quantity
├── unit_price
├── total_price
└── created_at

ItemAssignments
├── id (uuid, PK)
├── receipt_item_id (FK → ReceiptItems)
├── user_id (FK → Users)
└── created_at

Settlements
├── id (uuid, PK)
├── expense_id (FK → Expenses)
├── from_user_id (FK → Users)
├── to_user_id (FK → Users)
├── amount
├── is_paid (boolean)
└── created_at
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login, get JWT
- `GET /api/auth/me` — Get current user

### Groups
- `POST /api/groups` — Create group
- `GET /api/groups` — List user's groups
- `GET /api/groups/{id}` — Group details + members
- `POST /api/groups/{id}/members` — Add member
- `DELETE /api/groups/{id}/members/{user_id}` — Remove member

### Receipts & Expenses
- `POST /api/receipt/scan` — Upload image → get parsed items
- `POST /api/expenses` — Create expense with items + assignments
- `GET /api/expenses/{id}` — Get expense details
- `GET /api/groups/{id}/expenses` — List group expenses

### Settlements
- `GET /api/expenses/{id}/settlements` — Calculate who owes what
- `POST /api/settlements/{id}/mark-paid` — Mark a settlement as paid

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier works)
- Google Cloud account (for Vision API)
- LLM API key (Gemini or OpenAI)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npx expo start
```

---

## Project Structure

```
snapsplit/
├── README.md
├── TODO.md
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings & env vars
│   │   ├── models/              # Pydantic models
│   │   │   ├── user.py
│   │   │   ├── group.py
│   │   │   ├── expense.py
│   │   │   └── receipt.py
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── groups.py
│   │   │   ├── receipts.py
│   │   │   ├── expenses.py
│   │   │   └── settlements.py
│   │   ├── services/            # Business logic
│   │   │   ├── ocr.py           # Google Cloud Vision
│   │   │   ├── receipt_parser.py # LLM parsing
│   │   │   ├── splitter.py      # Proportional math
│   │   │   └── debt_simplifier.py
│   │   └── db/                  # Supabase client & queries
│   │       ├── client.py
│   │       └── queries/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/                     # Expo Router screens
    │   ├── (tabs)/
    │   │   ├── index.tsx        # Home / Groups list
    │   │   ├── scan.tsx         # Camera screen
    │   │   └── profile.tsx
    │   ├── group/[id].tsx       # Group detail
    │   ├── split/[id].tsx       # Item assignment screen
    │   └── _layout.tsx
    ├── components/
    │   ├── ReceiptItemRow.tsx
    │   ├── AvatarSelector.tsx
    │   └── SettlementCard.tsx
    ├── services/
    │   ├── api.ts               # API client
    │   └── supabase.ts          # Supabase client
    ├── types/
    │   └── index.ts             # TypeScript interfaces
    ├── package.json
    └── app.json
```

---

## License

MIT
