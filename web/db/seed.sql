-- ============================================================================
-- First National Bank â€” Clean Database Seed
-- Dedicated Table: rm_users (Relationship Manager Executives & Staff)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rm_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(128) NOT NULL DEFAULT 'Senior Relationship Manager Â· Corporate Banking',
    branch VARCHAR(128) DEFAULT 'New York Financial Center',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rm_users_username ON rm_users (LOWER(username));

-- Primary RM Executive: Phanee / Visionbank@324
INSERT INTO rm_users (username, password_hash, full_name, email, role, branch, status)
VALUES (
    'phanee',
    'Visionbank@324',
    'Phanee',
    'phanee@fnb-us.com',
    'Senior Relationship Manager Â· Corporate Banking',
    'New York Financial Center',
    'active'
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

