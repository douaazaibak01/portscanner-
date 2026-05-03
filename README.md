# PortScan Pro — Web App (No-Auth Edition)

A full-stack network port scanner and insecure protocol detector.

```
Stack: FastAPI (Python) + React + Tailwind CSS
```

---

## Project Structure

```
portscan_pro/
├── backend/
│   ├── main.py               ← FastAPI app (POST /scan, GET /scan/stream)
│   ├── requirements.txt
│   └── scanner/
│       ├── tcp_scanner.py
│       ├── banner.py
│       ├── protocols.py
│       ├── risk.py
│       └── udp_scanner.py
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── public/index.html
    └── src/
        ├── App.jsx
        ├── index.js / index.css
        ├── hooks/
        │   ├── useScan.js
        │   └── usePdf.js
        └── components/
            ├── Header.jsx
            ├── ScanForm.jsx      ← ownership checkbox enforced here
            ├── ScanProgress.jsx
            ├── StatsBar.jsx
            ├── FindingsPanel.jsx
            ├── PortsTable.jsx
            └── ProtocolRef.jsx
```

---

## Running Locally

### 1 — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API live at http://localhost:8000  
Docs at http://localhost:8000/docs

### 2 — Frontend

```bash
cd frontend
npm install
npm start
```

UI opens at http://localhost:3000

---

## Security Notes

- **Ownership checkbox is enforced server-side** — it cannot be bypassed by editing the frontend.
- **Rate limiting** — max 10 scans/hour per IP address.
- **Audit log** — every scan is recorded in `scan_logs.db` (SQLite).
- **Only scan targets you own or have explicit written permission to scan.**

---

## Deploying to Production (Render.com)

See DEPLOY.md for step-by-step hosting instructions.
