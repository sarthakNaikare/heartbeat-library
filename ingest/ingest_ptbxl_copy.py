import wfdb
import psycopg2
import numpy as np
import os
import io
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

DB_CONFIG = {
    "host": "ddtq3qq9v4.qcb4hae6z1.tsdb.cloud.timescale.com",
    "port": 36243,
    "database": "tsdb",
    "user": "tsdbadmin",
    "password": "Zenitsu@8055",
    "sslmode": "require"
}

DATA_DIR = "data/ptb-xl"
BASE_TIME = datetime(2001, 1, 1, tzinfo=timezone.utc).timestamp()

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

def get_ingested():
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT patient_id FROM ecg_recordings WHERE source_db = 'ptb-xl'")
        result = set(r[0] for r in cur.fetchall())
    conn.close()
    return result

def ingest_record(record_path):
    full_path = f"{DATA_DIR}/{record_path}"
    record_id = record_path.replace('/', '_')

    try:
        record = wfdb.rdrecord(full_path)
    except Exception:
        return 0

    fs = record.fs
    n_samples = record.sig_len
    leads = record.sig_name
    duration = n_samples / fs
    interval = 1.0 / fs

    # Build CSV buffer in memory
    buf = io.StringIO()
    for j, lead in enumerate(leads):
        signal = record.p_signal[:, j]
        for i, voltage in enumerate(signal):
            if not np.isnan(voltage):
                t = datetime.fromtimestamp(
                    BASE_TIME + i * interval, tz=timezone.utc
                ).isoformat()
                buf.write(f"{t}\t{record_id}\t{lead}\t{voltage}\n")

    buf.seek(0)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ecg_recordings (patient_id, source_db, fs_hz, duration_sec, leads)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (patient_id) DO NOTHING
            """, (record_id, 'ptb-xl', fs, duration, leads))
            cur.copy_from(buf, 'ecg_samples',
                         columns=('time','patient_id','lead','voltage_mv'))
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return 0
    finally:
        conn.close()

    return n_samples * len(leads)

def main():
    records = get_all_records()
    ingested = get_ingested()
    todo = [r for r in records if r.replace('/', '_') not in ingested]
    print(f"Found {len(records)} | Already done: {len(ingested)} | To ingest: {len(todo)}")

    total = 0
    done = 0

    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(ingest_record, r): r for r in todo}
        for future in as_completed(futures):
            rows = future.result()
            total += rows
            done += 1
            if done % 50 == 0:
                print(f"  [{done}/{len(todo)}] {total:,} rows inserted")

    print(f"\nDone. Total rows: {total:,}")

if __name__ == "__main__":
    main()
