BEGIN;

ALTER TABLE users
ADD COLUMN github_id TEXT UNIQUE,
ADD COLUMN github_login TEXT;

ALTER TABLE users
ALTER COLUMN email DROP NOT NULL;

CREATE TABLE github_login_attempts (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX github_login_attempts_expires_at_idx
ON github_login_attempts (expires_at);

COMMIT;