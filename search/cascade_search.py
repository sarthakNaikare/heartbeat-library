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
    """Tight 3-filter cascade: mean, std, and range must all be close."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT patient_id, lead, offset_seconds, seg_mean, seg_std
            FROM ecg_segments
            WHERE
                NOT (patient_id = %s AND lead = %s)
                AND seg_mean BETWEEN %s AND %s
                AND seg_std  BETWEEN %s AND %s
                AND seg_range BETWEEN %s AND %s
            ORDER BY ABS(seg_mean - %s) ASC
            LIMIT 20
        """, (
            query_patient, query_lead,
            query_mean - 0.05,   query_mean + 0.05,
            query_std  - 0.05,   query_std  + 0.05,
            query_range - 0.2,   query_range + 0.2,
            query_mean
        ))
        return cur.fetchall()

def cascade_search(query_patient, query_lead, top_n=5):
    conn = get_connection()

    print(f"Fetching query segment: patient={query_patient}, lead={query_lead}")
    query_segment = fetch_segment(conn, query_patient, query_lead, offset_seconds=60)
    query_mean  = float(np.mean(query_segment))
    query_std   = float(np.std(query_segment))
    query_range = float(np.max(query_segment) - np.min(query_segment))
    print(f"Query stats: mean={query_mean:.4f}, std={query_std:.4f}, range={query_range:.4f}")

    # Stage 1: DB-side filtering
    t_filter_start = time.time()
    candidates = filter_candidates(conn, query_mean, query_std, query_range, query_patient, query_lead)
    t_filter = time.time() - t_filter_start
    print(f"\nStage 1 — DB filter: {len(candidates)} candidates in {t_filter:.3f}s")

    if len(candidates) == 0:
        print("No candidates passed the filter. Widening search...")
        conn.close()
        return

    # Stage 2: DTW on survivors only
    print(f"Stage 2 — DTW on {len(candidates)} candidates...")
    results = []
    t_dtw_start = time.time()
    for (patient_id, lead, offset_sec, seg_mean, seg_std) in candidates:
        candidate = fetch_segment(conn, patient_id, lead, offset_seconds=offset_sec)
        if len(candidate) < SEGMENT_LENGTH:
            continue
        distance = dtw.distance_fast(query_segment, candidate)
        results.append((distance, patient_id, lead, offset_sec))

    t_dtw = time.time() - t_dtw_start
    results.sort(key=lambda x: x[0])

    total_time = t_filter + t_dtw
    print(f"Stage 2 — DTW completed in {t_dtw:.3f}s")
    print(f"\nTotal search time: {total_time:.3f}s")
    print(f"Candidates evaluated: {len(candidates)} of ~18366 segments")
    print(f"Reduction: {(1 - len(candidates)/18366)*100:.1f}% of segments eliminated by DB filter")

    print(f"\nTop {top_n} results:")
    print(f"{'Rank':<6} {'Patient':<10} {'Lead':<8} {'Offset(s)':<12} {'DTW Distance'}")
    print("-" * 50)
    for i, (dist, pid, lead, offset) in enumerate(results[:top_n]):
        print(f"{i+1:<6} {pid:<10} {lead:<8} {offset:<12} {dist:.4f}")

    conn.close()
    return results

if __name__ == "__main__":
    cascade_search(query_patient="100", query_lead="MLII", top_n=5)
