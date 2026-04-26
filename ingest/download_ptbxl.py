import wfdb
import os
import time

DATA_DIR = 'data/ptb-xl'
os.makedirs(DATA_DIR, exist_ok=True)

downloaded = 0
skipped = 0
failed = 0

for folder in range(0, 22):
    folder_str = str(folder * 1000).zfill(5)
    for rec in range(folder * 1000 + 1, min((folder + 1) * 1000 + 1, 21800)):
        rec_str = str(rec).zfill(5)
        record_path = f'records100/{folder_str}/{rec_str}_lr'
        local_dat = f'{DATA_DIR}/{record_path}.dat'

        if os.path.exists(local_dat):
            skipped += 1
            continue

        try:
            wfdb.dl_database('ptb-xl', dl_dir=DATA_DIR, records=[record_path])
            downloaded += 1
            if downloaded % 100 == 0:
                print(f'Downloaded {downloaded}, skipped {skipped}, failed {failed}')
        except Exception as e:
            failed += 1
            continue

        if downloaded >= 2000:
            break
    if downloaded >= 2000:
        break

print(f'\nDone. Downloaded: {downloaded}, Skipped: {skipped}, Failed: {failed}')
