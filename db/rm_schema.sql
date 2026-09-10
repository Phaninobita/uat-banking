-- ==============================================================================
-- Apex Bank Relationship Manager (RM) Customer Onboarding Schema
-- Table: rm_customer_invitations
-- Composite Primary Key: (crn, email)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rm_customer_invitations (
    crn VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company_name TEXT NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(64),
    rm_name VARCHAR(128) NOT NULL DEFAULT 'Sarah Al-Qassimi (VP Corporate Banking)',
    rm_id VARCHAR(64) NOT NULL DEFAULT 'RM-ADGM-9042',
    invite_token VARCHAR(128) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'invited', -- invited | viewed | in_progress | completed
    invite_link TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (crn, email)
);

CREATE INDEX IF NOT EXISTS idx_rm_invites_status ON rm_customer_invitations (status);
CREATE INDEX IF NOT EXISTS idx_rm_invites_token ON rm_customer_invitations (invite_token);
