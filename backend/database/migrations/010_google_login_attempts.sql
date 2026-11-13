BEGIN;

CREATE TABLE google_login_attempts (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX google_login_attempts_expires_at_idx
ON google_login_attempts (expires_at);

COMMIT;