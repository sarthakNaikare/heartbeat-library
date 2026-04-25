-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- One row per ECG sample
CREATE TABLE ecg_samples (
    time        TIMESTAMPTZ     NOT NULL,
    patient_id  TEXT            NOT NULL,
    lead        TEXT            NOT NULL,
    voltage_mv  DOUBLE PRECISION NOT NULL
);

-- Convert to hypertable, partitioned by time
SELECT create_hypertable('ecg_samples', 'time');

-- Index for fast patient lookups
CREATE INDEX ON ecg_samples (patient_id, time DESC);

-- Metadata table: one row per recording
CREATE TABLE ecg_recordings (
    patient_id      TEXT PRIMARY KEY,
    source_db       TEXT NOT NULL,
    fs_hz           INTEGER NOT NULL,
    duration_sec    DOUBLE PRECISION NOT NULL,
    leads           TEXT[] NOT NULL,
    notes           TEXT
);
