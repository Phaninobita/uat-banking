-- ============================================================================
-- Apex Bank — Initial Seed Data for PostgreSQL / Supabase
-- Populates all 4 core tables:
--   1. corporate_accounts
--   2. account_transactions
--   3. corporate_onboarding_applications
--   4. application_documents
-- ============================================================================

-- 1. Corporate Accounts
INSERT INTO corporate_accounts (
    account_number, iban, currency, account_name, account_type, balance, available_balance, status, application_ref
) VALUES 
(
    '7029841001', 
    'AE29033000007029841001', 
    'AED', 
    'Apex Global Holdings — Operating Account', 
    'Corporate Checking', 
    2450890.50, 
    2435890.50, 
    'active', 
    'AB-2026-DEMO01'
),
(
    '7029841002', 
    'AE44033000007029841002', 
    'USD', 
    'Apex Global Holdings — Global Escrow & Treasury', 
    'Multi-Currency Escrow', 
    850200.00, 
    850200.00, 
    'active', 
    'AB-2026-DEMO01'
),
(
    '7029841003', 
    'AE88033000007029841003', 
    'EUR', 
    'Apex Global Holdings — Trade Settlement EUR', 
    'Corporate Settlement', 
    412750.80, 
    412750.80, 
    'active', 
    'AB-2026-DEMO01'
)
ON CONFLICT (account_number) DO NOTHING;

-- 2. Banking Transactions Ledger
INSERT INTO account_transactions (
    transaction_ref, account_id, account_number, type, amount, currency, counterparty_name, counterparty_iban, description, category, status, channel, created_at
) VALUES 
(
    'TX-SWIFT-89A102',
    (SELECT id FROM corporate_accounts WHERE account_number = '7029841001' LIMIT 1),
    '7029841001',
    'credit',
    250000.00,
    'AED',
    'Al Futtaim Capital LLC',
    'AE08033000001234567890',
    'Commercial Lease & Treasury Advance',
    'Corporate Inflow',
    'settled',
    'swift_gpi',
    NOW() - INTERVAL '4 hours'
),
(
    'TX-CB-994821',
    (SELECT id FROM corporate_accounts WHERE account_number = '7029841001' LIMIT 1),
    '7029841001',
    'debit',
    45200.00,
    'AED',
    'ADGM Licensing & Registration Authority',
    'AE55033000009876543210',
    'Commercial Trade Licence Renewal Fee',
    'Government Fees',
    'settled',
    'portal',
    NOW() - INTERVAL '18 hours'
),
(
    'TX-FX-302911',
    (SELECT id FROM corporate_accounts WHERE account_number = '7029841002' LIMIT 1),
    '7029841002',
    'credit',
    120000.00,
    'USD',
    'Standard Chartered London',
    'GB29SCBL000012345678',
    'Cross-border Corporate Inflow FX',
    'International Wire',
    'settled',
    'swift_gpi',
    NOW() - INTERVAL '2 days'
),
(
    'TX-FTS-551029',
    (SELECT id FROM corporate_accounts WHERE account_number = '7029841001' LIMIT 1),
    '7029841001',
    'debit',
    15000.00,
    'AED',
    'Dubai Electricity & Water Authority (DEWA)',
    'AE12033000005544332211',
    'Corporate Headquarters Utility Settlement',
    'Utilities',
    'settled',
    'portal',
    NOW() - INTERVAL '3 days'
)
ON CONFLICT (transaction_ref) DO NOTHING;

-- 3. Corporate Onboarding Applications
INSERT INTO corporate_onboarding_applications (
    application_ref, crn, registered_email, current_step, status, company_name, trade_name, legal_type, licence_issue_date, licence_expiry_date, licence_issued_by, vat_trn, form_data
) VALUES 
(
    'AB-2026-DEMO01',
    '10029481',
    'finance@apexholdings.ae',
    7,
    'approved',
    'Apex Global Holdings Ltd',
    'Apex Global Holdings',
    'Limited Liability Company (LLC)',
    '2022-01-15',
    '2027-01-14',
    'Abu Dhabi Global Market (ADGM)',
    '100293848100003',
    '{
        "step1": { "crn": "10029481", "email": "finance@apexholdings.ae" },
        "step2": {
            "company_name": "Apex Global Holdings Ltd",
            "trade_name": "Apex Global Holdings",
            "legal_type": "Limited Liability Company (LLC)",
            "issued_by": "Abu Dhabi Global Market (ADGM)",
            "issue_date": "2022-01-15",
            "expiry_date": "2027-01-14",
            "vat_trn": "100293848100003",
            "jurisdiction": "ADGM Free Zone"
        },
        "step3": {
            "registered_address": "Level 14, Al Khatem Tower, ADGM Square, Al Maryah Island",
            "city": "Abu Dhabi",
            "country": "United Arab Emirates",
            "po_box": "11928"
        },
        "step4": {
            "primary_signatory": "Alexander J. Vance",
            "designation": "Managing Director",
            "passport_number": "N7849102",
            "nationality": "British",
            "shareholding_percent": 100
        },
        "step5": {
            "annual_turnover_aed": "25,000,000+",
            "expected_monthly_volume": "2,000,000 - 5,000,000 AED",
            "source_of_funds": "Corporate Commercial Operations & Technology Licensing"
        },
        "step6": {
            "selected_tier": "Corporate VIP Global Treasury",
            "multi_currency": true,
            "debit_cards_requested": 2
        },
        "step7": {
            "compliance_status": "Passed (Automated AML & sanctions screening clean)",
            "approved_at": "2026-02-10T10:00:00Z"
        }
    }'::jsonb
)
ON CONFLICT (application_ref) DO NOTHING;

-- 4. KYC / Base64 Document Vault
INSERT INTO application_documents (
    application_ref, document_type, file_name, file_type, file_size, file_data_base64, ocr_status, extracted_metadata
) VALUES 
(
    'AB-2026-DEMO01',
    'trade_license',
    'Apex_Commercial_License_ADGM.pdf',
    'application/pdf',
    148200,
    'JVBERi0xLjQKJeLjz9MKMSAwIG9iaiA8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iaiA8PC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqIDw8L1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyIDw8L1NpemUgND4+CiUVRU9G',
    'completed',
    '{"entity_name": "Apex Global Holdings Ltd", "license_no": "10029481", "authority": "Abu Dhabi Global Market"}'::jsonb
),
(
    'AB-2026-DEMO01',
    'passport',
    'Managing_Director_Passport_Vance.pdf',
    'application/pdf',
    98400,
    'JVBERi0xLjQKJeLjz9MKMSAwIG9iaiA8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iaiA8PC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqIDw8L1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyIDw8L1NpemUgND4+CiUVRU9G',
    'completed',
    '{"full_name": "Alexander J Vance", "passport_no": "N7849102", "nationality": "British"}'::jsonb
);
