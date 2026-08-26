-- PostgreSQL initialization for Sefalana-portal
-- Enables pgcrypto for secure password hashing (bcrypt-compatible)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  format VARCHAR(100) NOT NULL, -- e.g., 'Hyper', 'Shopper', 'Cash & Carry'
  address TEXT,
  city VARCHAR(100) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  phone VARCHAR(50),
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Specials / weekly combos
CREATE TABLE IF NOT EXISTS specials (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price_bwp NUMERIC(10,2) NOT NULL,
  original_price_bwp NUMERIC(10,2),
  savings_bwp NUMERIC(10,2) GENERATED ALWAYS AS (COALESCE(original_price_bwp,0) - price_bwp) STORED,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  start_date DATE DEFAULT current_date,
  end_date DATE DEFAULT (current_date + INTERVAL '7 days'),
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Supplier inquiries (B2B form submissions)
CREATE TABLE IF NOT EXISTS supplier_inquiries (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  message TEXT NOT NULL,
  sanitized BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed admin user (password hashed in SQL using crypt() and gen_salt)
-- Default seeded admin: email: admin@sefalana.co.bw password: AdminPass123!
INSERT INTO admin_users (email, password_hash, full_name, role)
VALUES
('admin@sefalana.co.bw', crypt('AdminPass123!', gen_salt('bf', 10)), 'Sefalana Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Seed stores with realistic Sefalana locations in Botswana
INSERT INTO stores (name, format, address, city, latitude, longitude, phone)
VALUES
('Sefalana Hyper Gaborone', 'Hyper', 'Plot 203, CBD, Gaborone', 'Gaborone', -24.6581, 25.9101, '+267 391 0000'),
('Sefalana Shopper Gaborone Mall', 'Shopper', 'Gaborone Mall, Gaborone', 'Gaborone', -24.6590, 25.9115, '+267 392 0001'),
('Sefalana Cash & Carry Broadhurst', 'Cash & Carry', 'Broadhurst Industrial, Gaborone', 'Broadhurst', -24.6280, 25.9210, '+267 392 0022'),
('Sefalana Hyper Francistown', 'Hyper', 'Towers Mall, Francistown', 'Francistown', -21.1644, 27.5051, '+267 241 0000'),
('Sefalana Shopper Maun', 'Shopper', 'Main St, Maun', 'Maun', -19.9833, 23.4167, '+267 680 0100');

-- Seed weekly specials & combos
INSERT INTO specials (title, description, price_bwp, original_price_bwp, image_url, active)
VALUES
('Tiger Combo', 'Tiger Lager (330ml x6) + Snack Pack - great for weekend deals', 85.00, 100.00, 'https://assets.sefalana.co.bw/images/tiger-combo.jpg', TRUE),
('Economy Combo', 'Rice 10kg + Cooking Oil 2L - value combo for families', 220.00, 260.00, 'https://assets.sefalana.co.bw/images/economy-combo.jpg', TRUE),
('Family Feast', 'Bulk chicken packs + frozen veg - perfect for family dinners', 320.00, 380.00, 'https://assets.sefalana.co.bw/images/family-feast.jpg', TRUE);

-- Example supplier inquiry sample (sanitized false initially, processed by server)
INSERT INTO supplier_inquiries (company_name, contact_name, contact_email, contact_phone, message, sanitized)
VALUES
('Botswana Fresh Farms', 'P. Kgosi', 'p.kgosi@freshfarms.bw', '+267 75000001', 'We supply fresh produce distributed weekly. Interested in supplying across all formats.', FALSE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
CREATE INDEX IF NOT EXISTS idx_stores_format ON stores(format);
CREATE INDEX IF NOT EXISTS idx_specials_active_start_end ON specials(active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_email ON supplier_inquiries(contact_email);
