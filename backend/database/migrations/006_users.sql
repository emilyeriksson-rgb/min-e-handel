BEGIN;

CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'admin')),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_not_empty
    CHECK (TRIM(email) <> ''),

  CONSTRAINT users_first_name_not_empty
    CHECK (TRIM(first_name) <> ''),

  CONSTRAINT users_last_name_not_empty
    CHECK (TRIM(last_name) <> '')
);

CREATE UNIQUE INDEX users_email_unique
ON users (LOWER(TRIM(email)));

ALTER TABLE orders
ADD COLUMN user_id INTEGER
  REFERENCES users(id)
  ON DELETE SET NULL;

CREATE INDEX orders_user_id_idx
ON orders(user_id);

COMMIT;