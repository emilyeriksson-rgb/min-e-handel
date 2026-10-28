BEGIN;

ALTER TABLE orders
ADD COLUMN shipping_method TEXT NOT NULL DEFAULT 'none',
ADD COLUMN shipping_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN shipping_address JSONB,
ADD COLUMN shipping_service_point JSONB,
ADD COLUMN shipping_estimate JSONB;

ALTER TABLE orders
ADD CONSTRAINT orders_shipping_method_valid
CHECK (
  shipping_method IN ('none', 'service_point', 'home')
),

ADD CONSTRAINT orders_shipping_price_nonnegative
CHECK (shipping_price >= 0),

ADD CONSTRAINT orders_shipping_address_object
CHECK (jsonb_typeof(shipping_address) = 'object'),

ADD CONSTRAINT orders_shipping_service_point_object
CHECK (jsonb_typeof(shipping_service_point) = 'object'),

ADD CONSTRAINT orders_shipping_estimate_object
CHECK (jsonb_typeof(shipping_estimate) = 'object'),

ADD CONSTRAINT orders_shipping_selection_valid
CHECK (
  (
    shipping_method = 'none'
    AND shipping_price = 0
    AND shipping_address IS NULL
    AND shipping_service_point IS NULL
    AND shipping_estimate IS NULL
  )
  OR
  (
    shipping_method = 'home'
    AND shipping_address IS NOT NULL
    AND shipping_service_point IS NULL
  )
  OR
  (
    shipping_method = 'service_point'
    AND shipping_address IS NOT NULL
    AND shipping_service_point IS NOT NULL
  )
);

CREATE TABLE order_book_items (
  id SERIAL PRIMARY KEY,

  order_id INTEGER NOT NULL
    REFERENCES orders(id)
    ON DELETE CASCADE,

  book_id INTEGER
    REFERENCES books(id)
    ON DELETE SET NULL,

  book_sku TEXT NOT NULL,
  book_title TEXT NOT NULL,

  price_at_purchase NUMERIC(12, 2) NOT NULL
    CHECK (price_at_purchase >= 0),

  quantity INTEGER NOT NULL
    CHECK (quantity > 0),

  CONSTRAINT order_book_items_sku_not_empty
    CHECK (TRIM(book_sku) <> ''),

  CONSTRAINT order_book_items_title_not_empty
    CHECK (TRIM(book_title) <> ''),

  CONSTRAINT order_book_items_unique_sku
    UNIQUE (order_id, book_sku)
);

CREATE INDEX order_book_items_order_id_idx
ON order_book_items(order_id);

COMMIT;