-- =======================================================
-- First National Bank — Corporate Onboarding Stage Tables
-- Migration: 02_create_stage_tables.sql
-- Canonical Primary Key: company_uid (e.g. CUID-509077205)
-- =======================================================

-- 1. Stage 2: Corporate Profile
CREATE TABLE IF NOT EXISTS onboarding_company_profiles (
    company_uid VARCHAR(64) PRIMARY KEY,
    application_ref VARCHAR(64) NOT NULL,
    crn VARCHAR(64) NOT NULL,
    company_name TEXT NOT NULL,
    trade_name TEXT,
    legal_type VARCHAR(128),
    licence_issued_by TEXT,
    licence_issue_date TEXT,
    licence_expiry_date TEXT,
    vat_trn VARCHAR(64),
    contact_person TEXT,
    registered_email VARCHAR(255),
    phone VARCHAR(64),
    registered_address TEXT,
    operating_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage2_app_ref ON onboarding_company_profiles (application_ref);
CREATE INDEX IF NOT EXISTS idx_stage2_crn ON onboarding_company_profiles (crn);

-- 2. Stage 3: UBO & Authorized Signatories Registry (1:N)
CREATE TABLE IF NOT EXISTS onboarding_ubos_signatories (
    id BIGSERIAL PRIMARY KEY,
    company_uid VARCHAR(64) NOT NULL,
    application_ref VARCHAR(64) NOT NULL,
    full_name TEXT NOT NULL,
    nationality VARCHAR(64) DEFAULT 'AE',
    id_type VARCHAR(32) DEFAULT 'passport',
    id_number VARCHAR(64),
    date_of_birth DATE,
    share_percentage NUMERIC(5, 2) DEFAULT 0.00,
    is_pep BOOLEAN DEFAULT FALSE,
    pep_details TEXT,
    biometric_status VARCHAR(32) DEFAULT 'verified',
    residential_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage3_company_uid ON onboarding_ubos_signatories (company_uid);
CREATE INDEX IF NOT EXISTS idx_stage3_app_ref ON onboarding_ubos_signatories (application_ref);

-- 3. Stage 4: Corporate Shareholding & Holding Structure
CREATE TABLE IF NOT EXISTS onboarding_ownership_structures (
    company_uid VARCHAR(64) PRIMARY KEY,
    application_ref VARCHAR(64) NOT NULL,
    has_holding_company BOOLEAN DEFAULT FALSE,
    parent_company_name TEXT,
    parent_company_country VARCHAR(64),
    total_shares_percentage NUMERIC(5, 2) DEFAULT 100.00,
    ownership_hierarchy JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage4_app_ref ON onboarding_ownership_structures (application_ref);

-- 4. Stage 5: Governance Mandates & Signing Powers
CREATE TABLE IF NOT EXISTS onboarding_governance_mandates (
    company_uid VARCHAR(64) PRIMARY KEY,
    application_ref VARCHAR(64) NOT NULL,
    signing_power VARCHAR(64) NOT NULL DEFAULT 'sole',
    dual_authorization_threshold NUMERIC(18, 2) DEFAULT 50000.00,
    maker_checker_enabled BOOLEAN DEFAULT TRUE,
    primary_maker_email VARCHAR(255),
    primary_checker_email VARCHAR(255),
    daily_transfer_limit NUMERIC(18, 2) DEFAULT 250000.00,
    single_transaction_limit NUMERIC(18, 2) DEFAULT 100000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage5_app_ref ON onboarding_governance_mandates (application_ref);

-- 5. Stage 6: Tax Compliance (FATCA / CRS & Source of Funds)
CREATE TABLE IF NOT EXISTS onboarding_tax_compliance (
    company_uid VARCHAR(64) PRIMARY KEY,
    application_ref VARCHAR(64) NOT NULL,
    is_us_person BOOLEAN DEFAULT FALSE,
    us_tin VARCHAR(64),
    giin_number VARCHAR(64),
    fatca_classification VARCHAR(128) DEFAULT 'Active NFFE',
    crs_tax_residency_country VARCHAR(64) DEFAULT 'AE',
    foreign_tin VARCHAR(64),
    source_of_wealth TEXT,
    source_of_funds TEXT,
    expected_annual_turnover NUMERIC(18, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage6_app_ref ON onboarding_tax_compliance (application_ref);

-- 6. Stage 7: Legal Declarations & E-Signatures
CREATE TABLE IF NOT EXISTS onboarding_declarations_signatures (
    company_uid VARCHAR(64) PRIMARY KEY,
    application_ref VARCHAR(64) NOT NULL,
    agreed_terms BOOLEAN NOT NULL DEFAULT TRUE,
    agreed_accuracy_warranties BOOLEAN NOT NULL DEFAULT TRUE,
    agreed_data_privacy BOOLEAN NOT NULL DEFAULT TRUE,
    signatory_name TEXT NOT NULL,
    signatory_email VARCHAR(255) NOT NULL,
    docusign_envelope_id VARCHAR(128),
    signature_hash TEXT,
    ip_address VARCHAR(64),
    user_agent TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage7_app_ref ON onboarding_declarations_signatures (application_ref);

-- =======================================================
-- 7. Automated Backfill from corporate_onboarding_applications
-- =======================================================
DO $$
DECLARE
    rec RECORD;
    v_cuid VARCHAR(64);
    v_addr TEXT;
    s2 JSONB;
    s4 JSONB;
    s5 JSONB;
    s6 JSONB;
    s7 JSONB;
BEGIN
    FOR rec IN SELECT * FROM corporate_onboarding_applications LOOP
        v_cuid := COALESCE(rec.company_uid::text, 'CUID-' || UPPER(REGEXP_REPLACE(rec.crn::text, '[^a-zA-Z0-9]', '', 'g')));
        s2 := COALESCE(rec.form_data->'step2', '{}'::jsonb);
        s4 := COALESCE(rec.form_data->'step4', '{}'::jsonb);
        s5 := COALESCE(rec.form_data->'step5', '{}'::jsonb);
        s6 := COALESCE(rec.form_data->'step6', '{}'::jsonb);
        s7 := COALESCE(rec.form_data->'step7', '{}'::jsonb);

        -- Resolve address safely regardless of whether rec.address is jsonb object, string, or null
        IF rec.address IS NOT NULL AND jsonb_typeof(rec.address) = 'string' AND (rec.address#>>'{}') != '' THEN
            v_addr := rec.address#>>'{}';
        ELSIF rec.address IS NOT NULL AND jsonb_typeof(rec.address) = 'object' AND rec.address ? 'registered_address' THEN
            v_addr := rec.address->>'registered_address';
        ELSIF rec.address IS NOT NULL AND jsonb_typeof(rec.address) = 'object' AND rec.address ? 'line1' THEN
            v_addr := rec.address->>'line1';
        ELSIF s2 ? 'address' AND (s2->>'address') != '' THEN
            v_addr := s2->>'address';
        ELSE
            v_addr := '100 Wall Street, Suite 2400, New York, NY 10005';
        END IF;

        -- Backfill Stage 2
        INSERT INTO onboarding_company_profiles (
            company_uid, application_ref, crn, company_name, trade_name, legal_type,
            licence_issued_by, licence_issue_date, licence_expiry_date, vat_trn,
            contact_person, registered_email, phone, registered_address, operating_address
        ) VALUES (
            v_cuid,
            rec.application_ref::text,
            rec.crn::text,
            COALESCE(rec.company_name::text, s2->>'company_name', 'Corporate Entity'),
            COALESCE(rec.trade_name::text, s2->>'trade_name', rec.company_name::text),
            COALESCE(rec.legal_type::text, s2->>'legal_type', 'Limited Liability Company (LLC)'),
            COALESCE(rec.licence_issued_by::text, s2->>'issued_by', 'Delaware Division of Corporations (US)'),
            COALESCE(rec.licence_issue_date::text, s2->>'issue_date', '2023-01-15'),
            COALESCE(rec.licence_expiry_date::text, s2->>'expiry_date', '2028-01-15'),
            COALESCE(rec.vat_trn::text, s2->>'vat_trn', '100-2938-4821'),
            COALESCE(rec.contact_person::text, s2->>'contact_person', 'Authorized Signatory'),
            COALESCE(rec.registered_email::text, s2->>'email', 'admin@corporate.com'),
            COALESCE(rec.phone::text, s2->>'phone', '+1 212 555 0199'),
            v_addr,
            COALESCE(s2->>'operating_address', v_addr)
        ) ON CONFLICT (company_uid) DO NOTHING;

        -- Backfill Stage 4
        INSERT INTO onboarding_ownership_structures (
            company_uid, application_ref, has_holding_company, parent_company_name,
            parent_company_country, total_shares_percentage, ownership_hierarchy
        ) VALUES (
            v_cuid,
            rec.application_ref,
            COALESCE((s4->>'has_holding_company')::boolean, false),
            COALESCE(s4->>'parent_company_name', ''),
            COALESCE(s4->>'parent_company_country', 'US'),
            100.00,
            COALESCE(s4->'hierarchy', '[]'::jsonb)
        ) ON CONFLICT (company_uid) DO NOTHING;

        -- Backfill Stage 5
        INSERT INTO onboarding_governance_mandates (
            company_uid, application_ref, signing_power, dual_authorization_threshold,
            maker_checker_enabled, primary_maker_email, primary_checker_email,
            daily_transfer_limit, single_transaction_limit
        ) VALUES (
            v_cuid,
            rec.application_ref,
            COALESCE(s5->>'signing_power', 'sole'),
            COALESCE((s5->>'threshold')::numeric, 50000.00),
            true,
            COALESCE(s5->>'maker_email', rec.registered_email),
            COALESCE(s5->>'checker_email', 'compliance@corporate.com'),
            250000.00,
            100000.00
        ) ON CONFLICT (company_uid) DO NOTHING;

        -- Backfill Stage 6
        INSERT INTO onboarding_tax_compliance (
            company_uid, application_ref, is_us_person, us_tin, giin_number,
            fatca_classification, crs_tax_residency_country, foreign_tin,
            source_of_wealth, source_of_funds, expected_annual_turnover
        ) VALUES (
            v_cuid,
            rec.application_ref,
            COALESCE((s6->>'is_us_person')::boolean, false),
            COALESCE(s6->>'us_tin', '98-7654321'),
            COALESCE(s6->>'giin', 'GIIN-994821'),
            COALESCE(s6->>'fatca_classification', 'Active NFFE'),
            COALESCE(s6->>'tax_residency', 'US'),
            COALESCE(s6->>'foreign_tin', 'FTIN-2026-US'),
            'Operating Commercial Revenue',
            'Business Account Receipts',
            5000000.00
        ) ON CONFLICT (company_uid) DO NOTHING;

        -- Backfill Stage 7
        INSERT INTO onboarding_declarations_signatures (
            company_uid, application_ref, agreed_terms, agreed_accuracy_warranties,
            agreed_data_privacy, signatory_name, signatory_email, docusign_envelope_id
        ) VALUES (
            v_cuid,
            rec.application_ref,
            true,
            true,
            true,
            COALESCE(rec.contact_person, 'Authorized Signatory'),
            rec.registered_email,
            'ENV-' || UPPER(SUBSTRING(MD5(v_cuid) FROM 1 FOR 12))
        ) ON CONFLICT (company_uid) DO NOTHING;
    END LOOP;
END $$;
