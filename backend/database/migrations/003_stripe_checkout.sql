BEGIN;

ALTER TABLE orders
ADD COLUMN stripe_checkout_session_id TEXT;

ALTER TABLE orders
ADD CONSTRAINT orders_stripe_checkout_session_id_unique
UNIQUE (stripe_checkout_session_id);

CREATE TABLE stripe_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    order_id INTEGER NOT NULL
        REFERENCES orders(id) ON DELETE RESTRICT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;