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

SEGMENT_SECONDS = 10
FS = 360
SEGMENT_LENGTH = SEGMENT_SECONDS * FS

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def fetch_segment(conn, patient_id, lead, offset_seconds=0):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT voltage_mv FROM ecg_samples
            WHERE patient_id = %s AND lead = %s
            ORDER BY time
            LIMIT %s OFFSET %s
        """, (patient_id, lead, SEGMENT_LENGTH, offset_seconds * FS))
        rows = cur.fetchall()
    return np.array([r[0] for r in rows], dtype=np.float64)

def fetch_all_patient_leads(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT patient_id, lead
            FROM ecg_samples
            ORDER BY patient_id, lead
        """)
        return cur.fetchall()

def search(query_patient, query_lead, top_n=5):
    conn = get_connection()

    print(f"Fetching query segment: patient={query_patient}, lead={query_lead}, {SEGMENT_SECONDS}s")
    query_segment = fetch_segment(conn, query_patient, query_lead, offset_seconds=60)

    if len(query_segment) < SEGMENT_LENGTH:
        print(f"Not enough data for query segment.")
        return

    print(f"Query segment shape: {query_segment.shape}")
    print(f"Searching across all patients...\n")

    candidates = fetch_all_patient_leads(conn)
    results = []

    for (patient_id, lead) in candidates:
        if patient_id == query_patient and lead == query_lead:
            continue

        candidate = fetch_segment(conn, patient_id, lead, offset_seconds=60)
        if len(candidate) < SEGMENT_LENGTH:
            continue

        start = time.time()
        distance = dtw.distance_fast(query_segment, candidate)
        elapsed = time.time() - start

        results.append((distance, patient_id, lead, elapsed))
        print(f"  {patient_id}/{lead}: DTW={distance:.4f} ({elapsed:.2f}s)")

    results.sort(key=lambda x: x[0])

    print(f"\nTop {top_n} most similar segments to patient {query_patient}/{query_lead}:")
    print(f"{'Rank':<6} {'Patient':<10} {'Lead':<8} {'DTW Distance':<15} {'Time(s)'}")
    print("-" * 50)
    for i, (dist, pid, lead, t) in enumerate(results[:top_n]):
        print(f"{i+1:<6} {pid:<10} {lead:<8} {dist:<15.4f} {t:.2f}s")

    conn.close()
    return results

if __name__ == "__main__":
    search(query_patient="100", query_lead="MLII", top_n=5)
