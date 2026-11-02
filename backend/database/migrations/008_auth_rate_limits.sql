BEGIN;

CREATE TABLE auth_rate_limits (
  bucket_key TEXT PRIMARY KEY,

  attempts INTEGER NOT NULL
    CHECK (attempts > 0),

  resets_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX auth_rate_limits_resets_at_idx
ON auth_rate_limits(resets_at);

COMMIT;