CREATE OR REPLACE FUNCTION dtw_distance(
    patient_a TEXT,
    sample_a  INTEGER,
    patient_b TEXT,
    sample_b  INTEGER,
    beat_window INTEGER DEFAULT 90
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
AS $$
DECLARE
    sig_a DOUBLE PRECISION[];
    sig_b DOUBLE PRECISION[];
    n INTEGER;
    m INTEGER;
    dtw_matrix DOUBLE PRECISION[][];
    cost DOUBLE PRECISION;
    i INTEGER;
    j INTEGER;
    left_val DOUBLE PRECISION;
    down_val DOUBLE PRECISION;
    diag_val DOUBLE PRECISION;
    min_val DOUBLE PRECISION;
    start_a INTEGER;
    start_b INTEGER;
BEGIN
    start_a := sample_a - beat_window;
    start_b := sample_b - beat_window;

    SELECT ARRAY_AGG(v ORDER BY rn)
    INTO sig_a
    FROM (
        SELECT voltage_mv AS v, ROW_NUMBER() OVER (ORDER BY time) AS rn
        FROM ecg_samples
        WHERE patient_id = patient_a
          AND lead = 'MLII'
          AND time >= (
              SELECT time FROM ecg_samples
              WHERE patient_id = patient_a AND lead = 'MLII'
              ORDER BY time
              LIMIT 1 OFFSET start_a
          )
        ORDER BY time
        LIMIT beat_window * 2
    ) sub;

    SELECT ARRAY_AGG(v ORDER BY rn)
    INTO sig_b
    FROM (
        SELECT voltage_mv AS v, ROW_NUMBER() OVER (ORDER BY time) AS rn
        FROM ecg_samples
        WHERE patient_id = patient_b
          AND lead = 'MLII'
          AND time >= (
              SELECT time FROM ecg_samples
              WHERE patient_id = patient_b AND lead = 'MLII'
              ORDER BY time
              LIMIT 1 OFFSET start_b
          )
        ORDER BY time
        LIMIT beat_window * 2
    ) sub;

    n := array_length(sig_a, 1);
    m := array_length(sig_b, 1);

    IF n IS NULL OR m IS NULL THEN
        RETURN 999999;
    END IF;

    dtw_matrix := array_fill(
        'Infinity'::DOUBLE PRECISION,
        ARRAY[n+1, m+1]
    );
    dtw_matrix[1][1] := 0;

    FOR i IN 2..n+1 LOOP
        FOR j IN 2..m+1 LOOP
            cost := ABS(sig_a[i-1] - sig_b[j-1]);
            left_val := dtw_matrix[i][j-1];
            down_val := dtw_matrix[i-1][j];
            diag_val := dtw_matrix[i-1][j-1];
            min_val := LEAST(left_val, down_val, diag_val);
            dtw_matrix[i][j] := cost + min_val;
        END LOOP;
    END LOOP;

    RETURN dtw_matrix[n+1][m+1];
END;
$$;
