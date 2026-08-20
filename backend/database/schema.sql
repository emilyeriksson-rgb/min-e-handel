CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    sale_price NUMERIC(10, 2),
    is_on_sale BOOLEAN DEFAULT false,
    short_description VARCHAR(300),
    description TEXT,
    image_url TEXT,
    category VARCHAR(100),
    study_pace VARCHAR(100),
    learning_format VARCHAR(50) NOT NULL,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    address VARCHAR(255)
);

CREATE TABLE course_sessions (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    available_seats INTEGER,
    location_type VARCHAR(50) NOT NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    duration VARCHAR(100),
    is_self_paced BOOLEAN DEFAULT false
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_email VARCHAR(255) NOT NULL,
    material_email VARCHAR(255) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    course_session_id INTEGER NOT NULL REFERENCES course_sessions(id) ON DELETE RESTRICT,
    course_title VARCHAR(255) NOT NULL,
    price_at_purchase NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'invoice',
    invoice_number VARCHAR(100) UNIQUE,
    invoice_status VARCHAR(50) DEFAULT 'unpaid',
    invoice_due_date DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
