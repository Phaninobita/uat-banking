# First National Bank — Corporate Banking & Onboarding Suite

A native Android application written in Kotlin and Jetpack Compose, rewritten from the corporate banking portal and microservices demo.

## Key Features

- **Corporate Account Onboarding Portal**:
  - Secure authentication via Commercial Registration Number (CRN) & Corporate Email with OTP 4-digit code verification.
  - Complete 7-Step regulatory onboarding state machine:
    - Step 1: Documents & Verification (Trade Licence, Cert of Incorporation, Board Resolution with OCR simulation and custom uploads)
    - Step 2: Company Information (Legal entity parameters, licensing jurisdiction, VAT/TRN, contact persons)
    - Step 3: Ultimate Beneficial Owners (UBO Identification, shareholding percentages, voting rights, PEP declaration)
    - Step 4: Ownership Structure & Cap Table (Shareholders, categories, share classes, countries)
    - Step 5: Corporate Governance & Signatory Roles (Authorities, specimen verification)
    - Step 6: FATCA & CRS Regulatory Tax Compliance
    - Step 7: Review & Final Submission (auto-generating `AB-2026-XXXX` reference code)
  - Interactive Rework Simulation Mode for compliance feedback and correction.

- **Live Core Banking & Treasury Hub**:
  - Multi-Currency Corporate Operating Accounts (AED, USD, EUR) with live balances and one-tap IBAN copying.
  - Total Aggregated Liquidity overview with real-time conversion.
  - Animated Live FX Rates Ticker (USD/AED, EUR/AED, GBP/AED, EUR/USD, GBP/USD).
  - Instant Corporate Wire Transfers (Fedwire & SWIFT GPI) with UETR generation and live balance debiting.
  - Real-Time Transaction Ledger with search and All/Credits/Debits filtering.

- **Relationship Manager (RM) Executive Suite**:
  - RM Executive authentication (Staff ID `phanee` / Passkey `Visionbank@324`).
  - Executive Dashboard with metrics (Invitations sent, in progress, KYC review, activated).
  - Customer Invitation Dispatch form generating corporate magic onboarding links.
  - Live Client Pipeline with direct shortcuts to open client views.

- **Simulated Corporate Mailbox**:
  - Live notification center for OTP codes, RM invitations, wire receipts, and submission confirmations.

## Technology Stack

- **Platform**: Android SDK 36 (minSdk 24)
- **Language**: Kotlin 2.2
- **UI Framework**: Jetpack Compose (Material Design 3)
- **Architecture**: MVVM with Kotlin Coroutines & StateFlow
- **Build System**: Gradle 9.3.1 with Android Gradle Plugin 9.1.1
