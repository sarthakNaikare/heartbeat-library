import wfdb
import psycopg2
from psycopg2.extras import execute_values
import numpy as np
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
BEAT_WINDOW = 90  # samples before and after R-peak = 180 samples total (0.5s)
VALID_BEATS = {'N', 'V', 'A', 'L', 'R', 'F'}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def get_records():
    return sorted(set(f.split(".")[0] for f in os.listdir(DATA_DIR) if f.endswith(".hea")))

def extract_beats(record_name):
    record = wfdb.rdrecord(f"{DATA_DIR}/{record_name}")
    ann = wfdb.rdann(f"{DATA_DIR}/{record_name}", 'atr')
    signal = record.p_signal
    leads = record.sig_name
    n_samples = record.sig_len

    rows = []
    for i, (sample, symbol) in enumerate(zip(ann.sample, ann.symbol)):
        if symbol not in VALID_BEATS:
            continue
        start = sample - BEAT_WINDOW
        end = sample + BEAT_WINDOW
        if start < 0 or end >= n_samples:
            continue

        for j, lead in enumerate(leads):
            beat = signal[start:end, j].astype(np.float64)
            if np.any(np.isnan(beat)):
                continue
            rows.append((
                record_name,
                lead,
                int(sample),
                symbol,
                float(np.mean(beat)),
                float(np.std(beat)),
                float(np.max(beat) - np.min(beat))
            ))
    return rows

def main():
    conn = get_connection()
    records = get_records()
    print(f"Extracting beats from {len(records)} records...")

    total = 0
    for record_name in records:
        rows = extract_beats(record_name)
        if not rows:
            continue
        with conn.cursor() as cur:
            execute_values(cur, """
                INSERT INTO ecg_beats
                    (patient_id, lead, beat_sample, beat_type, beat_mean, beat_std, beat_range)
                VALUES %s
            """, rows, page_size=1000)
        conn.commit()
        print(f"  {record_name}: {len(rows)} beats")
        total += len(rows)

    conn.close()
    print(f"\nDone. Total beats inserted: {total}")

if __name__ == "__main__":
    main()
