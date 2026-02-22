# SnapSplit — Development TODO

> Ordered checklist for building SnapSplit end-to-end.
> Each phase builds on the previous one. Check items off as you go.

---

## Phase 0: Project Scaffolding
- [ ] Initialize Git repo
- [ ] Create FastAPI backend scaffold (`backend/`)
  - [ ] `main.py`, `config.py`, project structure
  - [ ] `requirements.txt` with pinned deps
  - [ ] `.env.example` with all required keys
- [ ] Create Expo frontend scaffold (`frontend/`)
  - [ ] `npx create-expo-app` with Expo Router
  - [ ] Install core deps: `expo-camera`, `@supabase/supabase-js`, `expo-image-picker`
  - [ ] Set up TypeScript types in `types/index.ts`
- [ ] Set up Supabase project (dashboard)
  - [ ] Create project, copy URL + anon key + service role key
  - [ ] Enable email/password auth

---

## Phase 1: Database & Auth
- [ ] Create Supabase SQL migration with all tables:
  - [ ] `users` (synced with Supabase Auth)
  - [ ] `groups`
  - [ ] `group_members`
  - [ ] `expenses`
  - [ ] `receipt_items`
  - [ ] `item_assignments`
  - [ ] `settlements`
- [ ] Set up Row Level Security (RLS) policies
- [ ] Backend: Supabase client wrapper (`db/client.py`)
- [ ] Backend: Auth middleware (validate Supabase JWT)
- [ ] Backend: Auth routes (`/api/auth/me`)
- [ ] Backend: CRUD routes for Groups
  - [ ] Create group
  - [ ] List user's groups
  - [ ] Get group detail + members
  - [ ] Add / remove member
- [ ] Backend: Pydantic models for all entities
- [ ] Test: Auth flow works end-to-end
- [ ] Test: Group CRUD works via Swagger docs

---

## Phase 2: Receipt ML Pipeline
- [ ] Backend: Google Cloud Vision integration (`services/ocr.py`)
  - [ ] Accept image bytes → return raw OCR text
- [ ] Backend: LLM receipt parser (`services/receipt_parser.py`)
  - [ ] System prompt: parse OCR text → JSON array of `{item_name, quantity, total_price}`
  - [ ] Validate output with Pydantic model
  - [ ] Handle malformed LLM output gracefully (retry once)
- [ ] Backend: `POST /api/receipt/scan` endpoint
  - [ ] Accept image upload (multipart/form-data)
  - [ ] OCR → LLM → return parsed items
- [ ] Test: Scan 5+ different receipt photos, verify accuracy
- [ ] Stretch: Add confidence score per item

---

## Phase 3: Frontend — Camera & Mock UI
- [ ] **Build with hardcoded mock data first (no API calls)**
- [ ] Screen: Camera / Image Picker
  - [ ] Take photo with `expo-camera`
  - [ ] Or pick from gallery with `expo-image-picker`
- [ ] Screen: Split Screen (item assignment)
  - [ ] Display list of receipt items (mock data)
  - [ ] Each row: item name, price
  - [ ] Below each row: horizontal avatar scroll of group members
  - [ ] Tap avatar to toggle assignment (selected/unselected state)
  - [ ] Show running total per person at the bottom
- [ ] Screen: Groups list (home)
  - [ ] List of groups with member count
  - [ ] Create group button
- [ ] Screen: Group detail
  - [ ] Member list
  - [ ] Expense history
- [ ] Navigation: Tab bar (Home, Scan, Profile)
- [ ] Connect camera → `POST /api/receipt/scan` → populate Split Screen
- [ ] Test: Full flow from photo → item assignment works

---

## Phase 4: Splitting Math & Settlement
- [ ] Backend: Proportional splitter (`services/splitter.py`)
  - [ ] Input: list of items with assignments, tax amount, tip amount
  - [ ] Calculate each user's base share $S_p$
  - [ ] Distribute tax+tip proportionally
  - [ ] Return per-user totals
- [ ] Backend: `POST /api/expenses` — save expense with items + assignments
- [ ] Backend: `GET /api/expenses/{id}/settlements` — calculate & return settlements
- [ ] Backend: Debt simplification algorithm (`services/debt_simplifier.py`)
  - [ ] Minimize number of transactions across a group
  - [ ] E.g., A→B €10, B→C €10 → A→C €10
- [ ] Frontend: Settlement summary screen
  - [ ] Show "You owe X €Y" or "X owes you €Y"
  - [ ] Mark as paid button
- [ ] Test: Verify math against manual calculations
- [ ] Test: Debt simplification with 4+ people

---

## Phase 5: Polish & Ship
- [ ] Error handling: network errors, OCR failures, empty receipts
- [ ] Loading states & skeleton screens
- [ ] Pull-to-refresh on groups/expenses
- [ ] Push notifications (optional, via Expo)
- [ ] App icon & splash screen
- [ ] README with setup instructions (done ✓)
- [ ] Deploy backend (Railway / Fly.io / Render)
- [ ] Supabase project on free tier is already hosted
- [ ] Build & distribute via Expo EAS
- [ ] Beta test with real friend group

---

## Workflow Improvements (vs. original plan)

The original master doc is solid. Here are adjustments for a smoother build:

### 1. Use Supabase Auth directly from the frontend
**Original:** Build custom auth endpoints in FastAPI.
**Better:** Use `@supabase/supabase-js` on the frontend for signup/login (it handles JWT, refresh tokens, password reset out of the box). The FastAPI backend just *validates* the Supabase JWT on incoming requests — no need to build auth endpoints yourself.

### 2. Use `expo-image-picker` alongside `expo-camera`
**Original:** Only mentions `expo-camera`.
**Better:** Most users will want to pick an existing photo from their gallery too. `expo-image-picker` gives you both camera and gallery in one API and is simpler to set up than raw `expo-camera`.

### 3. Skip Google Cloud Vision — use the LLM directly
**Original:** Two-step pipeline: Cloud Vision OCR → LLM parsing.
**Better:** GPT-4o and Gemini Pro both accept images natively now. Send the receipt image directly to the LLM with a prompt like "Extract items and prices from this receipt as JSON." This eliminates the Cloud Vision dependency, reduces latency, reduces cost, and gives better results since the LLM sees the visual layout (not just raw text). Fall back to Cloud Vision only if LLM vision quality is insufficient.

### 4. Use Supabase Storage for receipt images
**Original:** Not mentioned.
**Better:** Upload receipt photos to Supabase Storage (free 1GB). Store the URL in the `expenses` table. This avoids sending large images through FastAPI and keeps everything in one ecosystem.

### 5. Supabase Edge Functions as an alternative to FastAPI
**Original:** Full FastAPI backend.
**Consider:** For a simpler deployment story, Supabase Edge Functions (Deno/TypeScript) can handle the LLM calls and math logic without needing a separate Python server. However, if you prefer Python for ML flexibility, FastAPI is the right call — just be aware you need to host it somewhere (Railway/Render/Fly.io).

### 6. Use Expo Router (file-based routing)
**Original:** Doesn't specify navigation approach.
**Better:** Expo Router uses file-based routing (like Next.js). It's now the default for new Expo apps and simplifies navigation significantly. Already reflected in the project structure above.

### 7. Mock data first, API second
**Original:** Mentions this but not strongly enough.
**Critical:** Build the entire Split Screen UI with hardcoded JSON before touching the API. This lets you iterate on UX without being blocked by backend work. Already emphasized in Phase 3 above.
