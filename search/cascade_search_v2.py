import psycopg2
import numpy as np
from dtaidistance import dtw
import time

DB_CONFIG = {
    "host": "ddtq3qq9v4.qcb4hae6z1.tsdb.cloud.timescale.com",
    "port": 36243,
    "database": "tsdb",
    "user": "tsdbadmin",
    "password": "Zenitsu@8055",
    "sslmode": "require"
}

FS = 360
SEGMENT_SECONDS = 10
SEGMENT_LENGTH = FS * SEGMENT_SECONDS

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def fetch_segment(conn, patient_id, lead, offset_seconds=60):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT voltage_mv FROM ecg_samples
            WHERE patient_id = %s AND lead = %s
            ORDER BY time
            LIMIT %s OFFSET %s
        """, (patient_id, lead, SEGMENT_LENGTH, offset_seconds * FS))
        rows = cur.fetchall()
    return np.array([r[0] for r in rows], dtype=np.float64)

def filter_candidates(conn, query_mean, query_std, query_range, query_patient, query_lead):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT patient_id, lead, offset_seconds
            FROM ecg_segments
            WHERE
                NOT (patient_id = %s AND lead = %s)
                AND seg_mean  BETWEEN %s AND %s
                AND seg_std   BETWEEN %s AND %s
                AND seg_range BETWEEN %s AND %s
            ORDER BY ABS(seg_mean - %s) ASC
            LIMIT 20
        """, (
            query_patient, query_lead,
            query_mean  - 0.05, query_mean  + 0.05,
            query_std   - 0.05, query_std   + 0.05,
            query_range - 0.2,  query_range + 0.2,
            query_mean
        ))
        return cur.fetchall()

def batch_fetch_candidates(conn, candidates):
    """Fetch all candidate segments in a single query."""
    if not candidates:
        return {}

    conditions = " OR ".join(
        f"(patient_id = '{pid}' AND lead = '{lead}' AND time >= '2000-01-01 00:00:{offset_seconds:02d}+00' + interval '{offset_seconds} seconds' - interval '{offset_seconds} seconds' + interval '{offset_seconds} seconds')"
        for pid, lead, offset_seconds in candidates
    )

    # Build using UNION ALL for clarity and correctness
    unions = " UNION ALL ".join([
        f"""(SELECT voltage_mv, '{pid}' as patient_id, '{lead}' as lead, {offset} as offset_sec
             FROM ecg_samples
             WHERE patient_id = '{pid}' AND lead = '{lead}'
             ORDER BY time
             LIMIT {SEGMENT_LENGTH} OFFSET {offset * FS})"""
        for pid, lead, offset in candidates
    ])

    with conn.cursor() as cur:
        cur.execute(unions)
        rows = cur.fetchall()

    # Group by (patient_id, lead, offset)
    segments = {}
    for voltage, pid, lead, offset in rows:
        key = (pid, lead, offset)
        if key not in segments:
            segments[key] = []
        segments[key].append(voltage)

    return {k: np.array(v, dtype=np.float64) for k, v in segments.items()}

def cascade_search_v2(query_patient, query_lead, top_n=5):
    conn = get_connection()

    print(f"Fetching query segment: patient={query_patient}, lead={query_lead}")
    query_segment = fetch_segment(conn, query_patient, query_lead, offset_seconds=60)
    query_mean  = float(np.mean(query_segment))
    query_std   = float(np.std(query_segment))
    query_range = float(np.max(query_segment) - np.min(query_segment))
    print(f"Query stats: mean={query_mean:.4f}, std={query_std:.4f}, range={query_range:.4f}")

    # Stage 1: DB filter
    t1 = time.time()
    candidates = filter_candidates(conn, query_mean, query_std, query_range, query_patient, query_lead)
    t_filter = time.time() - t1
    print(f"\nStage 1 — DB filter: {len(candidates)} candidates in {t_filter:.3f}s")

    if not candidates:
        print("No candidates passed the filter.")
        conn.close()
        return

    # Stage 2: Batch fetch all segments in ONE query
    t2 = time.time()
    segments = batch_fetch_candidates(conn, candidates)
    t_fetch = time.time() - t2
    print(f"Stage 2 — Batch fetch {len(segments)} segments in {t_fetch:.3f}s")

    # Stage 3: DTW
    t3 = time.time()
    results = []
    for (pid, lead, offset), signal in segments.items():
        if len(signal) < SEGMENT_LENGTH:
            continue
        distance = dtw.distance_fast(query_segment, signal)
        results.append((distance, pid, lead, offset))
    t_dtw = time.time() - t3

    results.sort(key=lambda x: x[0])
    total = t_filter + t_fetch + t_dtw

    print(f"Stage 3 — DTW on {len(results)} segments in {t_dtw:.3f}s")
    print(f"\nTotal search time: {total:.3f}s")
    print(f"  Filter: {t_filter:.3f}s | Fetch: {t_fetch:.3f}s | DTW: {t_dtw:.3f}s")

    print(f"\nTop {top_n} results:")
    print(f"{'Rank':<6} {'Patient':<10} {'Lead':<8} {'Offset(s)':<12} {'DTW Distance'}")
    print("-" * 50)
    for i, (dist, pid, lead, offset) in enumerate(results[:top_n]):
        print(f"{i+1:<6} {pid:<10} {lead:<8} {offset:<12} {dist:.4f}")

    conn.close()
    return results

if __name__ == "__main__":
    cascade_search_v2(query_patient="100", query_lead="MLII", top_n=5)
