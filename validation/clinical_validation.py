import wfdb
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
DATA_DIR = "data/mit-bih"

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def get_dominant_beat_type(ann, offset_seconds, duration_seconds=10):
    """Return the most common beat type in a time window."""
    start_sample = offset_seconds * FS
    end_sample = (offset_seconds + duration_seconds) * FS
    mask = (ann.sample >= start_sample) & (ann.sample < end_sample)
    symbols = [s for s, m in zip(ann.symbol, mask) if m and s not in ('+', '~', '|')]
    if not symbols:
        return 'U'  # unknown
    from collections import Counter
    return Counter(symbols).most_common(1)[0][0]

def fetch_segment(conn, patient_id, lead, offset_seconds):
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
            LIMIT 50
        """, (
            query_patient, query_lead,
            query_mean  - 0.1, query_mean  + 0.1,
            query_std   - 0.1, query_std   + 0.1,
            query_range - 0.3, query_range + 0.3,
            query_mean
        ))
        return cur.fetchall()

def validate(query_patient, query_lead, query_offset, label):
    conn = get_connection()
    ann_query = wfdb.rdann(f"{DATA_DIR}/{query_patient}", 'atr')

    print(f"\nQuery: patient={query_patient}, lead={query_lead}, offset={query_offset}s")
    print(f"Query beat type: {label}")

    query_segment = fetch_segment(conn, query_patient, query_lead, query_offset)
    query_mean  = float(np.mean(query_segment))
    query_std   = float(np.std(query_segment))
    query_range = float(np.max(query_segment) - np.min(query_segment))

    candidates = filter_candidates(conn, query_mean, query_std, query_range, query_patient, query_lead)
    print(f"Candidates after DB filter: {len(candidates)}")

    results = []
    for (pid, lead, offset) in candidates:
        candidate = fetch_segment(conn, pid, lead, offset)
        if len(candidate) < SEGMENT_LENGTH:
            continue
        distance = dtw.distance_fast(query_segment, candidate)
        ann = wfdb.rdann(f"{DATA_DIR}/{pid}", 'atr')
        beat_type = get_dominant_beat_type(ann, offset)
        results.append((distance, pid, lead, offset, beat_type))

    results.sort(key=lambda x: x[0])
    top10 = results[:10]

    print(f"\nTop 10 matches:")
    print(f"{'Rank':<5} {'Patient':<10} {'Lead':<8} {'Offset':<10} {'DTW':<10} {'Beat Type':<10} {'Match?'}")
    print("-" * 65)
    correct = 0
    for i, (dist, pid, lead, offset, beat_type) in enumerate(top10):
        match = "✓" if beat_type == label else "✗"
        if beat_type == label:
            correct += 1
        print(f"{i+1:<5} {pid:<10} {lead:<8} {offset:<10} {dist:<10.4f} {beat_type:<10} {match}")

    precision = correct / len(top10) * 100
    print(f"\nPrecision@10: {correct}/10 = {precision:.0f}%")
    conn.close()
    return precision

if __name__ == "__main__":
    # Test 1: PVC query from patient 208 (992 PVCs)
    p1 = validate("208", "MLII", 100, "V")

    # Test 2: Normal query from patient 200
    p2 = validate("200", "MLII", 300, "N")

    print(f"\n{'='*40}")
    print(f"Overall average precision: {(p1+p2)/2:.0f}%")
