import wfdb
import psycopg2
import numpy as np
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from dtaidistance import dtw
import time
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
ES_INDEX = "ecg_beats"

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def get_es_client():
    return Elasticsearch("http://localhost:9200")

def fetch_beat_signal(record_name, sample):
    record = wfdb.rdrecord(f"{DATA_DIR}/{record_name}")
    signal = record.p_signal
    leads = record.sig_name
    mlii_idx = leads.index('MLII') if 'MLII' in leads else 0
    start = sample - BEAT_WINDOW
    end = sample + BEAT_WINDOW
    return signal[start:end, mlii_idx].astype(np.float64)

def create_es_index(es):
    if es.indices.exists(index=ES_INDEX):
        print("ES index already exists, skipping creation.")
        return
    es.indices.create(
        index=ES_INDEX,
        mappings={
            "properties": {
                "patient_id":  {"type": "keyword"},
                "lead":        {"type": "keyword"},
                "beat_type":   {"type": "keyword"},
                "beat_sample": {"type": "integer"},
                "beat_mean":   {"type": "float"},
                "beat_std":    {"type": "float"},
                "beat_range":  {"type": "float"}
            }
        }
    )
    print("ES index created.")

def index_beats(es, conn):
    print("Indexing beats into Elasticsearch...")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT patient_id, lead, beat_sample, beat_type, beat_mean, beat_std, beat_range
            FROM ecg_beats WHERE lead = 'MLII'
        """)
        rows = cur.fetchall()

    actions = [
        {
            "_index": ES_INDEX,
            "_source": {
                "patient_id":  r[0],
                "lead":        r[1],
                "beat_sample": r[2],
                "beat_type":   r[3],
                "beat_mean":   float(r[4]),
                "beat_std":    float(r[5]),
                "beat_range":  float(r[6])
            }
        }
        for r in rows
    ]
    bulk(es, actions)
    es.indices.refresh(index=ES_INDEX)
    print(f"Indexed {len(actions)} beats into Elasticsearch.")

def es_search(es, query_mean, query_std, query_range, query_patient, beat_type):
    t_start = time.time()
    resp = es.search(
        index=ES_INDEX,
        size=50,
        query={
            "bool": {
                "must": [
                    {"term":  {"beat_type": beat_type}},
                    {"range": {"beat_mean":  {"gte": query_mean  - 0.15, "lte": query_mean  + 0.15}}},
                    {"range": {"beat_std":   {"gte": query_std   - 0.15, "lte": query_std   + 0.15}}},
                    {"range": {"beat_range": {"gte": query_range - 0.50, "lte": query_range + 0.50}}}
                ],
                "must_not": [{"term": {"patient_id": query_patient}}]
            }
        }
    )
    t_filter = time.time() - t_start
    candidates = [
        (hit["_source"]["patient_id"], hit["_source"]["beat_sample"])
        for hit in resp["hits"]["hits"]
    ]
    return candidates, t_filter

def tsdb_search(conn, query_mean, query_std, query_range, query_patient, beat_type):
    t_start = time.time()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT patient_id, beat_sample
            FROM ecg_beats
            WHERE
                beat_type = %s AND lead = 'MLII'
                AND patient_id != %s
                AND beat_mean  BETWEEN %s AND %s
                AND beat_std   BETWEEN %s AND %s
                AND beat_range BETWEEN %s AND %s
            ORDER BY ABS(beat_mean - %s) ASC
            LIMIT 50
        """, (
            beat_type, query_patient,
            query_mean  - 0.15, query_mean  + 0.15,
            query_std   - 0.15, query_std   + 0.15,
            query_range - 0.50, query_range + 0.50,
            query_mean
        ))
        candidates = cur.fetchall()
    t_filter = time.time() - t_start
    return candidates, t_filter

def dtw_rerank(query_signal, candidates):
    t_start = time.time()
    results = []
    for (pid, beat_sample) in candidates:
        candidate_signal = fetch_beat_signal(pid, beat_sample)
        if len(candidate_signal) < BEAT_LENGTH:
            continue
        distance = dtw.distance_fast(query_signal, candidate_signal)
        results.append((distance, pid, beat_sample))
    t_dtw = time.time() - t_start
    results.sort(key=lambda x: x[0])
    return results, t_dtw

def run_benchmark(query_patient, beat_type, nth=10):
    conn = get_db_connection()
    es = get_es_client()

    create_es_index(es)
    if es.count(index=ES_INDEX)["count"] == 0:
        index_beats(es, conn)

    with conn.cursor() as cur:
        cur.execute("""
            SELECT beat_sample, beat_mean, beat_std, beat_range
            FROM ecg_beats
            WHERE patient_id = %s AND beat_type = %s AND lead = 'MLII'
            ORDER BY beat_sample LIMIT 1 OFFSET %s
        """, (query_patient, beat_type, nth))
        row = cur.fetchone()

    sample, q_mean, q_std, q_range = row
    query_signal = fetch_beat_signal(query_patient, sample)

    print(f"\nBenchmark: patient={query_patient}, beat_type={beat_type}")
    print(f"Query stats: mean={q_mean:.4f}, std={q_std:.4f}, range={q_range:.4f}")
    print("-" * 60)

    es_candidates, es_filter_time = es_search(es, q_mean, q_std, q_range, query_patient, beat_type)
    es_results, es_dtw_time = dtw_rerank(query_signal, es_candidates)
    es_total = es_filter_time + es_dtw_time
    print(f"Elasticsearch: filter={es_filter_time:.3f}s | DTW={es_dtw_time:.3f}s | total={es_total:.3f}s | candidates={len(es_candidates)}")

    tsdb_candidates, tsdb_filter_time = tsdb_search(conn, q_mean, q_std, q_range, query_patient, beat_type)
    tsdb_results, tsdb_dtw_time = dtw_rerank(query_signal, tsdb_candidates)
    tsdb_total = tsdb_filter_time + tsdb_dtw_time
    print(f"TimescaleDB:   filter={tsdb_filter_time:.3f}s | DTW={tsdb_dtw_time:.3f}s | total={tsdb_total:.3f}s | candidates={len(tsdb_candidates)}")

    print(f"\nSpeedup: TimescaleDB is {es_total/tsdb_total:.2f}x faster than Elasticsearch")

    conn.close()
    return es_total, tsdb_total

if __name__ == "__main__":
    print("=" * 60)
    print("ECG SIMILARITY SEARCH BENCHMARK")
    print("TimescaleDB vs Elasticsearch")
    print("=" * 60)

    e1, t1 = run_benchmark("208", "V", nth=10)
    e2, t2 = run_benchmark("200", "N", nth=10)
    e3, t3 = run_benchmark("209", "A", nth=5)

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'Query':<20} {'Elasticsearch':<20} {'TimescaleDB':<20} {'Speedup'}")
    print("-" * 65)
    print(f"{'PVC (V)':<20} {e1:.3f}s{'':<14} {t1:.3f}s{'':<14} {e1/t1:.2f}x")
    print(f"{'Normal (N)':<20} {e2:.3f}s{'':<14} {t2:.3f}s{'':<14} {e2/t2:.2f}x")
    print(f"{'Atrial (A)':<20} {e3:.3f}s{'':<14} {t3:.3f}s{'':<14} {e3/t3:.2f}x")
    avg_speedup = ((e1/t1) + (e2/t2) + (e3/t3)) / 3
    print(f"\nAverage speedup: {avg_speedup:.2f}x")
