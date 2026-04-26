import wfdb
import psycopg2
from psycopg2.extras import execute_values
import numpy as np
import os
import time

DB_CONFIG = {
    "host": "ddtq3qq9v4.qcb4hae6z1.tsdb.cloud.timescale.com",
    "port": 36243,
    "database": "tsdb",
    "user": "tsdbadmin",
    "password": "Zenitsu@8055",
    "sslmode": "require"
}

DATA_DIR = "data/ptb-xl"
FS = 100
LEADS = ['I','II','III','AVR','AVL','AVF','V1','V2','V3','V4','V5','V6']

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def get_all_records():
    records = []
    for root, dirs, files in os.walk(DATA_DIR):
        for f in files:
            if f.endswith('.hea'):
                rel = os.path.relpath(os.path.join(root, f), DATA_DIR)
                records.append(rel.replace('.hea', ''))
    return sorted(records)

def get_ingested(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT patient_id FROM ecg_recordings WHERE source_db = 'ptb-xl'")
        return set(r[0] for r in cur.fetchall())

def ingest_record(conn, record_path):
    full_path = f"{DATA_DIR}/{record_path}"
    record_id = record_path.replace('/', '_')

    try:
        record = wfdb.rdrecord(full_path)
    except Exception as e:
        return 0

    fs = record.fs
    n_samples = record.sig_len
    leads = record.sig_name
    duration = n_samples / fs

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO ecg_recordings (patient_id, source_db, fs_hz, duration_sec, leads)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (patient_id) DO NOTHING
        """, (record_id, 'ptb-xl', fs, duration, leads))

    from datetime import datetime, timezone
    base_time = datetime(2001, 1, 1, tzinfo=timezone.utc).timestamp()
    interval = 1.0 / fs

    rows = []
    for j, lead in enumerate(leads):
        signal = record.p_signal[:, j]
        for i, voltage in enumerate(signal):
            if not np.isnan(voltage):
                from datetime import datetime, timezone
                t = datetime.fromtimestamp(base_time + i * interval, tz=timezone.utc)
                rows.append((t, record_id, lead, float(voltage)))

    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO ecg_samples (time, patient_id, lead, voltage_mv)
            VALUES %s
        """, rows, page_size=10000)

    conn.commit()
    return len(rows)

def main():
    records = get_all_records()
    print(f"Found {len(records)} PTB-XL records")

    conn = get_connection()
    ingested = get_ingested(conn)
    print(f"Already ingested: {len(ingested)}")

    todo = [r for r in records if r.replace('/', '_') not in ingested]
    print(f"To ingest: {len(todo)}")

    total = 0
    for i, record_path in enumerate(todo):
        try:
            conn = get_connection()
            rows = ingest_record(conn, record_path)
            total += rows
            if (i+1) % 50 == 0:
                print(f"  [{i+1}/{len(todo)}] {record_path} — {total:,} rows so far")
        except Exception as e:
            print(f"  Error on {record_path}: {e}")
            time.sleep(2)
            continue

    conn.close()
    print(f"\nDone. Total rows inserted: {total:,}")

if __name__ == "__main__":
    main()
