import wfdb
import psycopg2
from psycopg2.extras import execute_values
import numpy as np
from datetime import datetime, timezone
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

DATA_DIR = "data/mit-bih"

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def get_records():
    files = os.listdir(DATA_DIR)
    return sorted(set(f.split(".")[0] for f in files if f.endswith(".hea")))

def get_already_ingested(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT patient_id FROM ecg_recordings")
        return set(row[0] for row in cur.fetchall())

def ingest_record(conn, record_name):
    record = wfdb.rdrecord(f"{DATA_DIR}/{record_name}")
    fs = record.fs
    n_samples = record.sig_len
    leads = record.sig_name
    duration = n_samples / fs

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO ecg_recordings (patient_id, source_db, fs_hz, duration_sec, leads)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (patient_id) DO NOTHING
        """, (record_name, "mit-bih", fs, duration, leads))

    base_time = datetime(2000, 1, 1, tzinfo=timezone.utc).timestamp()
    interval = 1.0 / fs

    rows = []
    for j, lead in enumerate(leads):
        signal = record.p_signal[:, j]
        for i, voltage in enumerate(signal):
            if not np.isnan(voltage):
                t = datetime.fromtimestamp(base_time + i * interval, tz=timezone.utc)
                rows.append((t, record_name, lead, float(voltage)))

    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO ecg_samples (time, patient_id, lead, voltage_mv)
            VALUES %s
        """, rows, page_size=10000)

    conn.commit()
    print(f"  Inserted {len(rows)} rows for record {record_name}")
    return len(rows)

def main():
    records = get_records()
    print(f"Found {len(records)} records")

    conn = get_connection()
    print("Connected to Timescale Cloud.")

    already_done = get_already_ingested(conn)
    print(f"Already ingested: {sorted(already_done)}")

    total = 0
    for record_name in records:
        if record_name in already_done:
            print(f"  Skipping {record_name} (already ingested)")
            continue

        print(f"Ingesting {record_name}...")
        retries = 3
        for attempt in range(retries):
            try:
                conn = get_connection()
                total += ingest_record(conn, record_name)
                break
            except Exception as e:
                print(f"  Error on {record_name} attempt {attempt+1}: {e}")
                time.sleep(5)
                if attempt == retries - 1:
                    print(f"  Giving up on {record_name}")

    conn.close()
    print(f"\nDone. Total rows inserted this run: {total}")

if __name__ == "__main__":
    main()
