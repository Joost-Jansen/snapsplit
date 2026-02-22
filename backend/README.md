# SnapSplit Backend

FastAPI backend for receipt scanning, expense splitting, and group management.

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`
