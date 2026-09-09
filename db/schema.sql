-- Apex Bank Corporate Account Portal & Core Banking Mesh
-- Database Schema for PostgreSQL / Supabase

-- 1. Corporate Onboarding Applications Table
CREATE TABLE IF NOT EXISTS corporate_onboarding_applications (
    id BIGSERIAL PRIMARY KEY,
    application_ref VARCHAR(64) UNIQUE NOT NULL,
    crn VARCHAR(64) NOT NULL,
    registered_email VARCHAR(255) NOT NULL,
    current_step INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    company_name TEXT,
    trade_name TEXT,
    legal_type TEXT,
    licence_issue_date TEXT,
    licence_expiry_date TEXT,
    licence_issued_by TEXT,
    vat_trn TEXT,
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

-- 2. Base64 Documents Vault Table
CREATE TABLE IF NOT EXISTS application_documents (
    id BIGSERIAL PRIMARY KEY,
    application_ref VARCHAR(64) NOT NULL,
    document_type VARCHAR(64) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(64) NOT NULL,
    file_size INT NOT NULL,
    file_data_base64 TEXT NOT NULL,
    ocr_status VARCHAR(32) DEFAULT 'completed',
    extracted_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_docs_ref 
ON application_documents (application_ref);

CREATE INDEX IF NOT EXISTS idx_app_docs_type 
ON application_documents (application_ref, document_type);

-- 3. Core Banking Accounts Table (Live Banking)
CREATE TABLE IF NOT EXISTS corporate_accounts (
    id BIGSERIAL PRIMARY KEY,
    account_number VARCHAR(32) UNIQUE NOT NULL,
    iban VARCHAR(64) UNIQUE NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'AED',
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(64) NOT NULL DEFAULT 'Corporate Checking',
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    application_ref VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Banking Transactions Ledger Table
CREATE TABLE IF NOT EXISTS account_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_ref VARCHAR(64) UNIQUE NOT NULL,
    account_id BIGINT REFERENCES corporate_accounts(id),
    account_number VARCHAR(32) NOT NULL,
    type VARCHAR(32) NOT NULL, -- 'credit', 'debit', 'wire_transfer', 'fx_exchange'
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'AED',
    counterparty_name VARCHAR(255),
    counterparty_iban VARCHAR(64),
    description TEXT,
    category VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'settled',
    channel VARCHAR(32) NOT NULL DEFAULT 'portal', -- 'portal', 'mobile', 'swift_gpi'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acc_tx_acc_num 
ON account_transactions (account_number);

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

DROP TRIGGER IF EXISTS trg_app_docs_updated_at ON application_documents;
CREATE TRIGGER trg_app_docs_updated_at
BEFORE UPDATE ON application_documents
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
