<div align="center">

<img src="https://raw.githubusercontent.com/sarthakNaikare/heartbeat-library/main/gui/frontend/public/favicon.ico" width="64" alt="Heartbeat Library Logo" onerror="this.style.display='none'"/>

# 🫀 Heartbeat Library

### *The world's first TimescaleDB-powered ECG similarity search engine*

[![Live Demo](https://img.shields.io/badge/🟢%20LIVE%20DEMO-heartbeat--library--wt5u.vercel.app-00ff88?style=for-the-badge&logoColor=white)](https://heartbeat-library-wt5u.vercel.app)
[![Backend](https://img.shields.io/badge/⚡%20API-Render%20%7C%20Singapore-46e3b7?style=for-the-badge)](https://heartbeat-library-api.onrender.com/health)
[![Database](https://img.shields.io/badge/🐘%20TimescaleDB-Timescale%20Cloud%20AP--SOUTH--1-FDB515?style=for-the-badge)](https://www.timescale.com)
[![Portfolio](https://img.shields.io/badge/🧑‍💻%20Portfolio-sarthaknaikare.github.io-ff6b6b?style=for-the-badge)](https://sarthaknaikare.github.io)

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![Python](https://img.shields.io/badge/Python%203.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/sarthakNaikare/heartbeat-library)

</div>

---

## ⚡ What Is This?

> **"Shazam, but for hearts."**

Heartbeat Library answers one question: *given any ECG waveform, find the most similar cardiac patterns across a 99.6-million-sample clinical database — in under half a second.*

It uses **Cascade DTW filtering** + **in-database PL/pgSQL DTW** on TimescaleDB hypertables to retrieve ECG matches with zero network round-trips between filtering and scoring. Built on the **MIT-BIH Arrhythmia** and **PTB-XL** datasets from PhysioNet — 2,821 real patients, 48 hours of annotated cardiac data.

---

## 🚀 Live Links

| Service | URL | Status |
|---------|-----|--------|
| 🌐 **Frontend** | [heartbeat-library-wt5u.vercel.app](https://heartbeat-library-wt5u.vercel.app) | 🟢 Live |
| ⚙️ **Backend API** | [heartbeat-library-api.onrender.com](https://heartbeat-library-api.onrender.com/health) | 🟢 Live |
| 🐘 **Database** | Timescale Cloud · AP-SOUTH-1 | 🟢 Live |
| 📁 **GitHub** | [github.com/sarthakNaikare/heartbeat-library](https://github.com/sarthakNaikare/heartbeat-library) | ✅ Public |
| 🧑‍💻 **Portfolio** | [sarthaknaikare.github.io](https://sarthaknaikare.github.io) | 🟢 Live |

---

## 📊 Benchmark — The Numbers

> All benchmarks run against **99,600,000 ECG samples** across **2,821 patients**

| Method | Wall Time | Filter Latency | Notes |
|--------|-----------|----------------|-------|
| 🐢 Naive DTW | \`53.4s\` | — | Full scan baseline |
| ⚡ Cascade v1 | \`15.3s\` | \`84ms\` | 99.9% candidate elimination |
| 🔁 Cascade v2 | \`17.0s\` | \`84ms\` | Batch fetch variant |
| 🏆 **In-DB DTW** | **\`0.46s\`** | **\`3.1ms\`** | PL/pgSQL, zero network trips |
| 🔍 Elasticsearch | \`~1s\` | \`18–125ms\` | Industry benchmark |

### 🏅 Key Stats

\`\`\`
📦 Compression:     9 GB → 839 MB      (91.2% · 11.3× ratio)
🎯 Precision@10:    100%               (PVC · Normal · Atrial beats)
⚡ Filter speedup:  40×                (3.1ms vs 125ms Elasticsearch)
🚀 Total speedup:   116×               (Naive DTW → In-DB DTW)
\`\`\`

---

## 🏗️ Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (React)                      │
│   Splash · Search · Dashboard · Benchmarks · Upload     │
│              heartbeat-library-wt5u.vercel.app          │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS REST
┌──────────────────────────▼──────────────────────────────┐
│                  BACKEND (FastAPI)                       │
│    /search · /upload-search · /stats · /generate-report  │
│           heartbeat-library-api.onrender.com            │
└──────────────────────────┬──────────────────────────────┘
                           │ psycopg2
┌──────────────────────────▼──────────────────────────────┐
│              DATABASE (TimescaleDB 2.26)                 │
│                 Timescale Cloud · AP-SOUTH-1             │
│                                                         │
│  ecg_samples   ← 99.6M rows · hypertable · compressed  │
│  ecg_recordings ← 2,821 patients                        │
│  ecg_beats     ← 201,680 individual beats               │
│  ecg_segments  ← 18,366 segment-level stats             │
│  dtw_distance() ← PL/pgSQL in-database DTW function     │
└─────────────────────────────────────────────────────────┘
\`\`\`

---

## 🧠 How It Works — Cascade DTW

\`\`\`
Stage 1 — Statistical Pre-filter (SQL)
  └─ Filter by mean ± σ, amplitude range → eliminates 99.9% of candidates

Stage 2 — Euclidean Distance (Python)
  └─ Fast L2 distance on surviving candidates → narrows to top-k

Stage 3 — In-Database DTW (PL/pgSQL)
  └─ Full DTW on final candidates, computed inside Timescale
     → Zero network round-trips, sub-500ms wall time
\`\`\`

---

## 🗄️ Database Schema

\`\`\`sql
-- Hypertable: 99.6M rows, chunked by time, 91.2% columnar compressed
CREATE TABLE ecg_samples (
  sample_id     BIGSERIAL,
  recording_id  INTEGER REFERENCES ecg_recordings(recording_id),
  sample_index  INTEGER,
  timestamp     TIMESTAMPTZ NOT NULL,
  signal_value  FLOAT4,
  lead          TEXT DEFAULT 'MLII'
);
SELECT create_hypertable('ecg_samples', 'timestamp');

-- In-database DTW — zero network trips
CREATE OR REPLACE FUNCTION dtw_distance(
  seq1 FLOAT4[], seq2 FLOAT4[]
) RETURNS FLOAT8 LANGUAGE plpgsql AS \$\$
DECLARE
  -- Dynamic Time Warping matrix computed in pure SQL
  ...
\$\$;
\`\`\`

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| 🗄️ **Database** | TimescaleDB 2.26 · Timescale Cloud | Hypertables, columnar compression, time-series native |
| ⚙️ **Backend** | FastAPI · Python 3.11.9 · Render | Async, typed, auto-docs |
| 🌐 **Frontend** | React · Vercel | Component-driven, edge CDN |
| 📡 **Uptime** | UptimeRobot (5-min pings) | Keeps Render free tier awake 24/7 |
| 📊 **Data** | MIT-BIH + PTB-XL · PhysioNet | Gold-standard clinical ECG datasets |
| 🔌 **Ingestion** | wfdb + psycopg2 COPY protocol | Bulk-load 99.6M rows efficiently |

---

## 🌟 Features

### 🔍 Search
- **Patient + beat type selector** — query by specific arrhythmia class
- **Demo pills** — one-click preset queries for PVC, Normal, Atrial
- **Live similarity results** — DTW scores, waveform visualizations
- **Upload your own ECG** — drag & drop CSV/TXT/DAT, get instant matches

### 📊 Dashboard
- Live stats pulled from Timescale Cloud API
- Compression ratios, row counts, chunk statistics

### 📈 Benchmarks
- Bar charts comparing all methods
- Precision@10 table across beat types
- Compression comparison vs raw storage

### 📄 Medical Report
- Download a professional HTML report with DTW scores, similarity bars, methodology, and disclaimer

---

## 📁 Project Structure

\`\`\`
heartbeat-library/
├── gui/
│   ├── frontend/          ← React app (Vercel)
│   │   ├── src/
│   │   │   ├── App.js     ← React.createElement (no JSX)
│   │   │   ├── Search.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Benchmarks.js
│   │   │   └── Upload.js
│   │   └── .env           ← REACT_APP_API_URL
│   └── backend/           ← FastAPI app (Render)
│       ├── main.py        ← /search /upload-search /stats /generate-report
│       ├── dtw.py         ← Cascade DTW pipeline
│       ├── requirements.txt
│       └── .python-version ← Pinned 3.11.9
├── ingestion/             ← wfdb → TimescaleDB pipeline
└── README.md
\`\`\`

---

## 🚦 API Endpoints

\`\`\`
GET  /health          → Uptime check (HEAD + GET, for UptimeRobot)
GET  /stats           → Live database statistics
POST /search          → Cascade DTW search by patient/beat type
POST /upload-search   → Upload ECG file → normalize → cascade → results
POST /generate-report → Professional HTML medical report download
\`\`\`

---

## 📦 Data

| Dataset | Patients | Source |
|---------|----------|--------|
| MIT-BIH Arrhythmia Database | 48 | [PhysioNet](https://physionet.org/content/mitdb/1.0.0/) |
| PTB-XL ECG Dataset | 2,773 | [PhysioNet](https://physionet.org/content/ptb-xl/1.0.3/) |
| **Total** | **2,821** | — |

---

## 🧑‍💻 Author

**Sarthak Naikare**  
CS Graduate · MIT ADT University, Pune · 2025

[![Portfolio](https://img.shields.io/badge/Portfolio-sarthaknaikare.github.io-ff6b6b?style=flat-square)](https://sarthaknaikare.github.io)
[![GitHub](https://img.shields.io/badge/GitHub-sarthakNaikare-181717?style=flat-square&logo=github)](https://github.com/sarthakNaikare)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Sarthak%20Naikare-0077B5?style=flat-square&logo=linkedin)](https://linkedin.com/in/sarthak-naikare)

---

## 🗺️ Roadmap

- [ ] 📝 Publish research paper — *Computers in Biology and Medicine* + VLDB Industrial Track
- [ ] 🚀 Migrate database to Fly.io (post Timescale Cloud trial)
- [ ] 🎙️ Add voiceover to demo video
- [ ] 🔒 Build Ghost + TimescaleDB real-time network intrusion detection SIEM

---

<div align="center">

*Built with 🫀 and TimescaleDB in Pune, India*

[![Live Demo](https://img.shields.io/badge/🟢%20Try%20It%20Live-heartbeat--library--wt5u.vercel.app-00ff88?style=for-the-badge)](https://heartbeat-library-wt5u.vercel.app)

</div>
