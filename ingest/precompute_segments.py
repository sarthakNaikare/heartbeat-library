import psycopg2
from psycopg2.extras import execute_values
import numpy as np

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

def get_all_patient_leads(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT patient_id, lead
            FROM ecg_samples
            ORDER BY patient_id, lead
        """)
        return cur.fetchall()

def fetch_full_signal(conn, patient_id, lead):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT voltage_mv FROM ecg_samples
            WHERE patient_id = %s AND lead = %s
            ORDER BY time
        """, (patient_id, lead))
        rows = cur.fetchall()
    return np.array([r[0] for r in rows], dtype=np.float64)

def compute_segments(signal, patient_id, lead):
    rows = []
    n_segments = len(signal) // SEGMENT_LENGTH
    for i in range(n_segments):
        start = i * SEGMENT_LENGTH
        end = start + SEGMENT_LENGTH
        seg = signal[start:end]
        rows.append((
            patient_id,
            lead,
            i * SEGMENT_SECONDS,
            float(np.mean(seg)),
            float(np.std(seg)),
            float(np.min(seg)),
            float(np.max(seg)),
            float(np.max(seg) - np.min(seg))
        ))
    return rows

def main():
    conn = get_connection()
    pairs = get_all_patient_leads(conn)
    print(f"Found {len(pairs)} patient/lead pairs")

    all_rows = []
    for patient_id, lead in pairs:
        print(f"  Computing segments for {patient_id}/{lead}...")
        signal = fetch_full_signal(conn, patient_id, lead)
        rows = compute_segments(signal, patient_id, lead)
        all_rows.extend(rows)
        print(f"    {len(rows)} segments")

    print(f"\nInserting {len(all_rows)} total segment records...")
    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO ecg_segments
                (patient_id, lead, offset_seconds, seg_mean, seg_std, seg_min, seg_max, seg_range)
            VALUES %s
        """, all_rows, page_size=1000)
    conn.commit()
    print("Done.")
    conn.close()

if __name__ == "__main__":
    main()
