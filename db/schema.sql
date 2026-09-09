-- Apex Bank Corporate Account Portal
-- Database Schema for PostgreSQL / Supabase

CREATE TABLE IF NOT EXISTS corporate_onboarding_applications (
    id BIGSERIAL PRIMARY KEY,
    application_ref VARCHAR(64) UNIQUE NOT NULL,
    crn VARCHAR(64) NOT NULL,
    registered_email VARCHAR(255) NOT NULL,
    current_step INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast authentication lookup by CRN and Email
CREATE INDEX IF NOT EXISTS idx_corp_apps_crn_email 
ON corporate_onboarding_applications (crn, registered_email);

-- Index for fast reference lookup
CREATE INDEX IF NOT EXISTS idx_corp_apps_app_ref 
ON corporate_onboarding_applications (application_ref);

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_corp_apps_updated_at ON corporate_onboarding_applications;

CREATE TRIGGER trg_corp_apps_updated_at
BEFORE UPDATE ON corporate_onboarding_applications
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
