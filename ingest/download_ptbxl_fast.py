import wfdb
import os
import concurrent.futures
import threading

DATA_DIR = 'data/ptb-xl'
os.makedirs(DATA_DIR, exist_ok=True)

lock = threading.Lock()
counters = {'downloaded': 0, 'skipped': 0, 'failed': 0}

def download_record(args):
    folder_str, rec = args
    rec_str = str(rec).zfill(5)
    record_path = f'records100/{folder_str}/{rec_str}_lr'
    local_dat = f'{DATA_DIR}/{record_path}.dat'

    if os.path.exists(local_dat):
        with lock:
            counters['skipped'] += 1
        return 'skipped'

    try:
        wfdb.dl_database('ptb-xl', dl_dir=DATA_DIR, records=[record_path])
        with lock:
            counters['downloaded'] += 1
            total = counters['downloaded']
            if total % 50 == 0:
                print(f"Downloaded {total} | Skipped {counters['skipped']} | Failed {counters['failed']}")
        return 'ok'
    except Exception:
        with lock:
            counters['failed'] += 1
        return 'fail'

# Build full task list
tasks = []
for folder in range(0, 22):
    folder_str = str(folder * 1000).zfill(5)
    for rec in range(folder * 1000 + 1, min((folder + 1) * 1000 + 1, 21800)):
        tasks.append((folder_str, rec))

print(f"Total tasks: {len(tasks)}")
print("Starting parallel download with 8 workers...")

TARGET = 2000
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    for result in executor.map(download_record, tasks):
        with lock:
            total_done = counters['downloaded'] + counters['skipped']
        if counters['downloaded'] >= TARGET:
            break

print(f"\nDone. Downloaded: {counters['downloaded']} | Skipped: {counters['skipped']} | Failed: {counters['failed']}")
