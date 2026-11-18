BEGIN;

CREATE TABLE order_confirmation_emails (
  order_id INTEGER PRIMARY KEY
    REFERENCES orders(id),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),

  resend_email_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error_code TEXT
);

COMMIT;