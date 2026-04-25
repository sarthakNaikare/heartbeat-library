import wfdb
import psycopg2
import numpy as np
from dtaidistance import dtw
import os

DB_CONFIG = {
    "host": "ddtq3qq9v4.qcb4hae6z1.tsdb.cloud.timescale.com",
    "port": 36243,
    "database": "tsdb",
    "user": "tsdbadmin",
    "password": "Zenitsu@8055",
    "sslmode": "require"
}

DATA_DIR = "data/mit-bih"
FS = 360
BEAT_WINDOW = 90
BEAT_LENGTH = BEAT_WINDOW * 2

# Tolerances per beat type based on morphological variability
TOLERANCES = {
    'N': (0.05, 0.05, 0.10),
    'V': (0.05, 0.05, 0.10),
    'L': (0.05, 0.05, 0.10),
    'R': (0.05, 0.05, 0.10),
    'A': (0.15, 0.15, 0.50),  # wider — APBs are morphologically variable
    'F': (0.15, 0.15, 0.50),
}
DEFAULT_TOLERANCE = (0.10, 0.10, 0.30)

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def fetch_beat_signal(record_name, sample):
    record = wfdb.rdrecord(f"{DATA_DIR}/{record_name}")
    signal = record.p_signal
    leads = record.sig_name
    mlii_idx = leads.index('MLII') if 'MLII' in leads else 0
    start = sample - BEAT_WINDOW
    end = sample + BEAT_WINDOW
    return signal[start:end, mlii_idx].astype(np.float64)

def get_query_beat(conn, patient_id, beat_type, nth=0):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT beat_sample, beat_mean, beat_std, beat_range
            FROM ecg_beats
            WHERE patient_id = %s AND beat_type = %s AND lead = 'MLII'
            ORDER BY beat_sample
            LIMIT 1 OFFSET %s
        """, (patient_id, beat_type, nth))
        return cur.fetchone()

def filter_candidate_beats(conn, query_mean, query_std, query_range, query_patient, beat_type):
    mean_tol, std_tol, range_tol = TOLERANCES.get(beat_type, DEFAULT_TOLERANCE)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT patient_id, beat_sample, beat_mean, beat_std
            FROM ecg_beats
            WHERE
                beat_type = %s
                AND lead = 'MLII'
                AND patient_id != %s
                AND beat_mean  BETWEEN %s AND %s
                AND beat_std   BETWEEN %s AND %s
                AND beat_range BETWEEN %s AND %s
            ORDER BY ABS(beat_mean - %s) ASC
            LIMIT 50
        """, (
            beat_type, query_patient,
            query_mean  - mean_tol,  query_mean  + mean_tol,
            query_std   - std_tol,   query_std   + std_tol,
            query_range - range_tol, query_range + range_tol,
            query_mean
        ))
        return cur.fetchall()

def validate_beat(query_patient, beat_type, nth=5):
    conn = get_connection()

    result = get_query_beat(conn, query_patient, beat_type, nth)
    if not result:
        print(f"No {beat_type} beat found for patient {query_patient}")
        conn.close()
        return None

    sample, q_mean, q_std, q_range = result
    print(f"\nQuery: patient={query_patient}, beat_type={beat_type}, sample={sample}")
    print(f"Stats: mean={q_mean:.4f}, std={q_std:.4f}, range={q_range:.4f}")

    query_signal = fetch_beat_signal(query_patient, sample)
    candidates = filter_candidate_beats(conn, q_mean, q_std, q_range, query_patient, beat_type)
    print(f"Candidates after DB filter: {len(candidates)}")

    if not candidates:
        print("No candidates found.")
        conn.close()
        return 0.0

    results = []
    for (pid, beat_sample, bm, bs) in candidates:
        candidate_signal = fetch_beat_signal(pid, beat_sample)
        if len(candidate_signal) < BEAT_LENGTH:
            continue
        distance = dtw.distance_fast(query_signal, candidate_signal)
        results.append((distance, pid, beat_sample))

    results.sort(key=lambda x: x[0])
    top10 = results[:10]

    print(f"\nTop 10 matches:")
    print(f"{'Rank':<5} {'Patient':<10} {'Sample':<10} {'DTW':<10} {'Beat Type':<10} {'Match?'}")
    print("-" * 55)

    correct = 0
    for i, (dist, pid, beat_sample) in enumerate(top10):
        with conn.cursor() as cur:
            cur.execute("""
                SELECT beat_type FROM ecg_beats
                WHERE patient_id = %s AND beat_sample = %s AND lead = 'MLII'
            """, (pid, beat_sample))
            row = cur.fetchone()
            result_type = row[0] if row else 'U'
        match = "✓" if result_type == beat_type else "✗"
        if result_type == beat_type:
            correct += 1
        print(f"{i+1:<5} {pid:<10} {beat_sample:<10} {dist:<10.4f} {result_type:<10} {match}")

    precision = correct / len(top10) * 100 if top10 else 0
    print(f"\nPrecision@10: {correct}/10 = {precision:.0f}%")
    conn.close()
    return precision

if __name__ == "__main__":
    p1 = validate_beat("208", "V", nth=10)
    p2 = validate_beat("200", "N", nth=10)
    p3 = validate_beat("209", "A", nth=5)

    print(f"\n{'='*40}")
    print(f"PVC Precision@10:    {p1:.0f}%")
    print(f"Normal Precision@10: {p2:.0f}%")
    print(f"APB Precision@10:    {p3:.0f}%")
    print(f"Average:             {(p1+p2+p3)/3:.0f}%")
