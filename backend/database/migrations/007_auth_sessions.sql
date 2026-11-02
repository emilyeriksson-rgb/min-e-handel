BEGIN;

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY,

  user_id INTEGER NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  CONSTRAINT auth_sessions_expiry_valid
    CHECK (expires_at > created_at)
);

CREATE INDEX auth_sessions_user_id_idx
ON auth_sessions(user_id);

CREATE INDEX auth_sessions_expires_at_idx
ON auth_sessions(expires_at);

COMMIT;