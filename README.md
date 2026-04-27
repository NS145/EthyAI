# TruthLense — Ethical AI for Digital Misinformation Detection

> **Multimodal Explainability · Multilingual Support · Human-in-the-Loop**

![TruthLense](public/logo.png)

## 🔬 Overview

TruthLense is a production-grade AI system for detecting digital misinformation across text, images, and video. It combines state-of-the-art NLP models (XLM-RoBERTa, RemBERT), computer vision (ResNet-50), temporal analysis (CNN + BiLSTM), and graph-based reasoning (GraphSAGE) through a multi-head attention fusion architecture.

Every prediction is **explainable** via LIME text highlights and SHAP feature importance, making AI decisions transparent and auditable.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Layer 5: UI + HITL + API               │
│  React/TS + Tailwind + shadcn/ui │ FastAPI REST Endpoints │
├──────────────────────────────────────────────────────────┤
│              Layer 4: Classification + XAI                │
│       MLP Classifier │ LIME Highlights │ SHAP Values      │
├──────────────────────────────────────────────────────────┤
│           Layer 3: Multi-Head Attention Fusion            │
│    8-head cross-attention │ Modality gating │ FFN          │
├──────────────────────────────────────────────────────────┤
│              Layer 2: Feature Extraction                  │
│  XLM-RoBERTa│RemBERT │ ResNet-50 │ BiLSTM │ GraphSAGE    │
├──────────────────────────────────────────────────────────┤
│             Layer 1: Input & Preprocessing                │
│  Text cleaning │ Lang detect │ Image norm │ Frame extract  │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
truthlense/
├── src/                          # React Frontend
│   ├── components/               # UI Components
│   │   ├── UploadZone.tsx        # Multimodal input (text/image/video)
│   │   ├── VeracityMeter.tsx     # Circular truth probability gauge
│   │   ├── TransparencyPanel.tsx # LIME highlights + SHAP visualization
│   │   ├── EvidenceFeed.tsx      # Source verification evidence
│   │   ├── DisputeButton.tsx     # Human-in-the-loop dispute
│   │   ├── AnalysisModules.tsx   # Pipeline status indicators
│   │   ├── ResearchAgent.tsx     # AI research assistant chat
│   │   ├── ThemeToggle.tsx       # Dark/light mode
│   │   └── ui/                   # shadcn/ui component library (49 components)
│   ├── pages/
│   │   ├── Index.tsx             # Main analysis page
│   │   ├── Auth.tsx              # Login/Signup
│   │   ├── Dashboard.tsx         # Statistics & recent analyses
│   │   ├── ReviewQueue.tsx       # HITL review queue
│   │   ├── Admin.tsx             # Audit logs & admin panel
│   │   ├── ContentDetail.tsx     # Detailed analysis results
│   │   └── NotFound.tsx          # 404 page
│   ├── hooks/
│   │   ├── useAuth.ts            # Supabase auth state management
│   │   ├── useRealtime.ts        # Supabase Realtime subscriptions
│   │   ├── use-mobile.tsx        # Mobile detection
│   │   └── use-toast.ts          # Toast notifications
│   ├── services/
│   │   └── api.ts                # Centralized API client
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Supabase client
│   │       └── types.ts          # Database type definitions
│   └── lib/
│       └── utils.ts              # Utility functions
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── main.py               # FastAPI application
│   │   ├── config.py             # Configuration (env vars)
│   │   ├── auth.py               # JWT auth middleware
│   │   ├── database.py           # Supabase client
│   │   ├── routes/
│   │   │   ├── analyze.py        # POST /analyze, GET /results/{id}
│   │   │   └── dashboard.py      # Dashboard, review, feedback, audit
│   │   └── models/
│   │       ├── preprocessing.py  # Layer 1: Input processing
│   │       ├── feature_extraction.py  # Layer 2: Feature extractors
│   │       ├── fusion.py         # Layer 3: Multi-head attention
│   │       ├── classifier.py     # Layer 4: Classification + XAI
│   │       └── pipeline.py       # Full pipeline orchestrator
│   └── requirements.txt
├── supabase/
│   ├── schema.sql                # Full database schema + RLS
│   ├── config.toml               # Supabase project config
│   └── functions/
│       ├── analyze-text/         # AI text analysis edge function
│       └── research-agent/       # Research assistant edge function
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── docker-compose.yml
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **ML Models** | XLM-RoBERTa, RemBERT, ResNet-50, BiLSTM, GraphSAGE, PyTorch |
| **Explainability** | LIME, SHAP |
| **Database** | Supabase (PostgreSQL), Row Level Security |
| **Auth** | Supabase Auth (JWT) |
| **Realtime** | Supabase Realtime (WebSocket) |
| **Storage** | Supabase Storage (images/videos) |
| **Deployment** | Docker, Docker Compose |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (optional)
- Supabase account

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the schema in the SQL Editor:
   ```
   Copy contents of supabase/schema.sql → Supabase Dashboard → SQL Editor → Run
   ```
3. Create a Storage bucket named `content-uploads` (private)
4. Note your project URL, anon key, service role key, and JWT secret

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your Supabase credentials
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:8080`

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env template
cp .env.example .env
# Edit .env with Supabase service role key and JWT secret

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at `http://localhost:8000`

### 4. Docker (Full Stack)

```bash
# Set env variables
export VITE_SUPABASE_URL=https://your-project.supabase.co
export VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Start all services
docker-compose up --build
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/analyze` | Submit content for analysis | Optional |
| `GET` | `/api/results/{id}` | Get analysis results | Optional |
| `GET` | `/api/dashboard` | Dashboard statistics | Required |
| `POST` | `/api/feedback` | Submit dispute/feedback | Required |
| `GET` | `/api/review-queue` | Get review queue items | Reviewer+ |
| `POST` | `/api/review-action` | Approve/reject/escalate | Reviewer+ |
| `GET` | `/api/audit-report` | Audit trail | Admin |

---

## 🔐 Authentication & Roles

| Role | Permissions |
|------|------------|
| `user` | Analyze content, view own results, submit disputes |
| `reviewer` | All user permissions + access review queue |
| `admin` | All permissions + audit logs + user management |

---

## 🧠 ML Pipeline Details

### Text Analysis
- **High-resource languages** (EN, FR, DE, etc.): XLM-RoBERTa-base
- **Low-resource languages**: RemBERT
- Auto-detection via `langdetect` with model routing

### Image Analysis
- ResNet-50 pretrained on ImageNet
- 2048-dim feature vectors

### Video Analysis
- Frame extraction (uniform sampling, max 16 frames)
- Per-frame ResNet-50 features → BiLSTM temporal modeling
- 512-dim bidirectional hidden states

### Graph Analysis
- GraphSAGE-style mean aggregation
- Models claim ↔ evidence relationships

### Fusion
- 8-head multi-head attention across modalities
- GELU activation, layer normalization, dropout
- 512-dim unified representation

### Explainability
- **LIME**: Word-level importance highlights with color coding
- **SHAP**: Feature-level impact visualization (sensationalism, credibility, etc.)

---

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User profiles (extends Supabase Auth) |
| `content` | Analyzed content items |
| `analysis_results` | ML analysis output |
| `review_queue` | HITL review items |
| `feedback` | User disputes & corrections |
| `audit_logs` | Full audit trail |

All tables have Row Level Security (RLS) policies. Realtime subscriptions are enabled for `content`, `analysis_results`, and `review_queue`.

---

## 📄 License

MIT
