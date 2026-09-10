package com.example.model

import kotlinx.serialization.Serializable

// --- ONBOARDING MODELS ---

data class DocumentItem(
    val id: String,
    val title: String,
    val recommended: Boolean = false,
    val isUploaded: Boolean = false,
    val fileName: String = "",
    val fileSizeKb: Int = 0,
    val ocrStatus: String = "Ready",
    val extractedInfo: String = ""
)

data class CompanyInfo(
    val crn: String = "",
    val email: String = "",
    val companyUid: String = "",
    val companyName: String = "",
    val tradeName: String = "",
    val legalType: String = "",
    val issueDate: String = "",
    val expiryDate: String = "",
    val issuedBy: String = "",
    val vatTrn: String = "",
    val contactPerson: String = "",
    val phone: String = "",
    val address: String = ""
)

data class UboItem(
    val id: String,
    val fullName: String,
    val nationality: String,
    val idPassportNumber: String,
    val dob: String,
    val shareholdingPct: Double,
    val votingRightsPct: Double,
    val isPep: Boolean = false
)

data class ShareholderItem(
    val id: String,
    val name: String,
    val category: String, // Individual, Corporate, Trust, Institutional
    val percentage: Double,
    val shareClass: String, // Ordinary, Preferred Class A
    val country: String,
    val votingRightsPct: Double,
    val isFlaggedForRework: Boolean = false,
    val reworkNotes: String = ""
)

data class GovernanceRoleItem(
    val id: String,
    val name: String,
    val title: String, // Managing Director, Director, CFO
    val authorityLevel: String, // Sole Signatory, Joint Signatory (Any 2), Joint with Board Approval
    val isSignatureUploaded: Boolean = false
)

data class FatcaCrsInfo(
    val isUsPerson: Boolean = false,
    val usTin: String = "",
    val primaryTaxCountry: String = "",
    val taxIdNumber: String = "",
    val entityClassification: String = "",
    val crsConfirmed: Boolean = false
)

data class OnboardingApplication(
    val appRef: String = "",
    val crn: String = "",
    val registeredEmail: String = "",
    val companyUid: String = "",
    val currentStep: Int = 1,
    val status: String = "draft", // draft, in_review, submitted, approved
    val companyInfo: CompanyInfo = CompanyInfo(),
    val documents: List<DocumentItem> = emptyList(),
    val ubos: List<UboItem> = emptyList(),
    val ownership: List<ShareholderItem> = emptyList(),
    val roles: List<GovernanceRoleItem> = emptyList(),
    val fatcaCrs: FatcaCrsInfo = FatcaCrsInfo(),
    val isReworkMode: Boolean = false,
    val reworkComment: String = ""
)

// --- CORE BANKING MODELS ---

data class CorporateAccount(
    val id: Long,
    val accountNumber: String,
    val iban: String,
    val currency: String,
    val accountName: String,
    val accountType: String,
    val balance: Double,
    val availableBalance: Double,
    val companyUid: String = ""
)

data class TransactionRecord(
    val id: Long,
    val transactionRef: String,
    val swiftUetr: String,
    val accountNumber: String,
    val type: String, // credit, debit
    val amount: Double,
    val currency: String,
    val counterpartyName: String,
    val counterpartyIban: String,
    val description: String,
    val category: String,
    val status: String = "settled",
    val channel: String = "Fedwire Funds Service",
    val timestamp: String
)

data class FxRate(
    val pair: String,
    val rate: Double,
    val change24h: String,
    val updatedAt: String
)

// --- RELATIONSHIP MANAGER (RM) MODELS ---

data class RmInvitation(
    val crn: String,
    val email: String,
    val companyUid: String = "",
    val companyName: String,
    val contactPerson: String,
    val phone: String,
    val rmName: String = "Phanee (Senior Relationship Manager)",
    val rmId: String = "RM-PHANEE",
    val inviteToken: String,
    val status: String = "invited", // invited, in_progress, completed
    val inviteLink: String,
    val notes: String = "",
    val currentStep: Int = 1,
    val createdAt: String
)

data class RmUser(
    val username: String,
    val fullName: String,
    val email: String,
    val role: String,
    val branch: String
)

data class SimulatedEmail(
    val id: String,
    val to: String,
    val from: String,
    val subject: String,
    val text: String,
    val type: String, // otp, rm_invitation, transfer_executed, application_submitted
    val code: String? = null,
    val timestamp: String
)

// --- MOBILE AUDIT LOG MODEL ---

data class MobileAuditLog(
    val id: String,
    val timestamp: String,
    val actionType: String, // RM_LOGIN, RM_LOGOUT, INVITATION_DISPATCHED, INVITATION_RESENT, CUSTOMER_LOGIN, CUSTOMER_LOGOUT, STEP_PROGRESSION, DB_SYNC
    val actorId: String,
    val actorName: String,
    val actorRole: String = "RM Executive",
    val companyUid: String = "",
    val targetCrn: String? = null,
    val targetEmail: String? = null,
    val targetCompany: String? = null,
    val details: String,
    val status: String = "SUCCESS", // SUCCESS, FAILED, WARNING
    val deviceInfo: String = "Android Mobile (Google Pixel / API 34)",
    val ipAddress: String = "10.0.2.16 (Secure Core VPN)"
)
