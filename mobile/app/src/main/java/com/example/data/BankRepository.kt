package com.example.data

import android.util.Log
import com.example.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import kotlin.random.Random

object BankRepository {

    private val dateFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US)
    private fun currentTimestamp(): String = dateFormat.format(Date())

    // --- State Holders ---

    private val _accounts = MutableStateFlow<List<CorporateAccount>>(emptyList())
    val accounts: StateFlow<List<CorporateAccount>> = _accounts.asStateFlow()

    private val _transactions = MutableStateFlow<List<TransactionRecord>>(emptyList())
    val transactions: StateFlow<List<TransactionRecord>> = _transactions.asStateFlow()

    private val _fxRates = MutableStateFlow<List<FxRate>>(emptyList())
    val fxRates: StateFlow<List<FxRate>> = _fxRates.asStateFlow()

    private val _rmInvitations = MutableStateFlow<List<RmInvitation>>(emptyList())
    val rmInvitations: StateFlow<List<RmInvitation>> = _rmInvitations.asStateFlow()

    private val _simulatedEmails = MutableStateFlow<List<SimulatedEmail>>(emptyList())
    val simulatedEmails: StateFlow<List<SimulatedEmail>> = _simulatedEmails.asStateFlow()

    private val _activeApplication = MutableStateFlow(createInitialApplication())
    val activeApplication: StateFlow<OnboardingApplication> = _activeApplication.asStateFlow()

    private val _currentRmUser = MutableStateFlow<RmUser?>(null)
    val currentRmUser: StateFlow<RmUser?> = _currentRmUser.asStateFlow()

    private val _auditLogs = MutableStateFlow<List<MobileAuditLog>>(emptyList())
    val auditLogs: StateFlow<List<MobileAuditLog>> = _auditLogs.asStateFlow()

    // Supabase Cloud Database Client
    val supabaseClient = com.example.data.supabase.SupabaseDatabaseClient()

    init {
        seedInitialData()
    }

    private fun createInitialApplication(): OnboardingApplication {
        val docs = listOf(
            DocumentItem(
                id = "doc_1",
                title = "Trade Licence (recommended)",
                recommended = true,
                isUploaded = false,
                fileName = "",
                fileSizeKb = 0,
                ocrStatus = "Pending",
                extractedInfo = ""
            ),
            DocumentItem(
                id = "doc_2",
                title = "Certificate of Incorporation",
                recommended = true,
                isUploaded = false,
                fileName = "",
                fileSizeKb = 0,
                ocrStatus = "Pending",
                extractedInfo = ""
            ),
            DocumentItem(
                id = "doc_3",
                title = "Board Resolution",
                recommended = true,
                isUploaded = false,
                fileName = "",
                fileSizeKb = 0,
                ocrStatus = "Pending",
                extractedInfo = ""
            ),
            DocumentItem(
                id = "doc_4",
                title = "Tax Residency Certificate / TRN",
                recommended = false,
                isUploaded = false,
                fileName = "",
                fileSizeKb = 0,
                ocrStatus = "Pending",
                extractedInfo = ""
            )
        )

        return OnboardingApplication(
            appRef = "",
            crn = "",
            registeredEmail = "",
            currentStep = 1,
            status = "draft",
            companyInfo = CompanyInfo(),
            documents = docs,
            ubos = emptyList(),
            ownership = emptyList(),
            roles = emptyList(),
            fatcaCrs = FatcaCrsInfo(),
            isReworkMode = false,
            reworkComment = ""
        )
    }

    private fun seedInitialData() {
        // 1. Core Banking Accounts (Clean initial state)
        _accounts.value = emptyList()

        // 2. Transactions (Clean initial state)
        _transactions.value = emptyList()

        // 3. FX Rates
        updateFxRates()

        // 4. RM Invitations (Empty by default until loaded from Supabase or initiated by RM)
        _rmInvitations.value = emptyList()

        // 5. Initial Audit Logs (Clean state until loaded from Supabase)
        _auditLogs.value = emptyList()

        // Fetch existing invitations & audit logs from Supabase so web and mobile are immediately in sync
        CoroutineScope(Dispatchers.IO).launch {
            try {
                refreshInvitationsFromSupabase()
            } catch (e: Exception) {
                Log.w("BankRepository", "Initial Supabase invitations fetch: ${e.message}")
            }
            try {
                refreshAuditLogsFromSupabase()
            } catch (e: Exception) {
                Log.w("BankRepository", "Initial Supabase audit logs fetch: ${e.message}")
            }
        }
    }

    fun updateFxRates() {
        val baseRates = mapOf(
            "USD/AED" to 3.6725,
            "EUR/AED" to 4.0210,
            "GBP/AED" to 4.7180,
            "EUR/USD" to 1.0945,
            "GBP/USD" to 1.2842,
            "SAR/AED" to 0.9790
        )
        val list = baseRates.map { (pair, base) ->
            val jitter = Random.nextDouble(-0.003, 0.003)
            val rate = Math.round((base + jitter) * 10000.0) / 10000.0
            val pct = (jitter / base * 100)
            val sign = if (pct >= 0) "+" else ""
            val change = "$sign${String.format(Locale.US, "%.2f", pct)}%"
            FxRate(pair, rate, change, "Live")
        }
        _fxRates.value = list
    }

    // --- Onboarding Operations ---

    fun syncActiveApplicationToSupabase() {
        val app = _activeApplication.value
        if (app.crn.isNotBlank() && app.registeredEmail.isNotBlank()) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    supabaseClient.syncApplication(app)
                } catch (e: Exception) {
                    Log.e("BankRepository", "Failed auto-syncing application: ${e.message}")
                }
            }
        }
    }

    fun updateStep(step: Int) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(currentStep = step)
        syncInvitationProgress(app.crn, app.registeredEmail, step)
        syncActiveApplicationToSupabase()
    }

    fun updateCompanyInfo(info: CompanyInfo) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(companyInfo = info)
        syncActiveApplicationToSupabase()
    }

    companion object {
        private const val SAMPLE_BASE64_PDF = "JVBERi0xLjQKJeLjz9MKMSAwIG9iaiA8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqIDw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+ZW5kb2JqCjMgMCBvYmogPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0+PmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTggMDAwMDAgbiAKMDAwMDAwMDA3NyAwMDAwMCBuIAowMDAwMDAwMTMzIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTk5CiUlRU9G"
        private const val SAMPLE_BASE64_IMG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }

    fun toggleDocumentUpload(docId: String, fileName: String = "Uploaded_Doc.pdf") {
        val app = _activeApplication.value
        val isImg = fileName.endsWith(".png", true) || fileName.endsWith(".jpg", true) || fileName.endsWith(".jpeg", true)
        val sampleB64 = if (isImg) SAMPLE_BASE64_IMG else SAMPLE_BASE64_PDF
        val mimeType = if (isImg) "image/png" else "application/pdf"
        var toggledDoc: DocumentItem? = null

        val updatedDocs = app.documents.map { doc ->
            if (doc.id == docId) {
                val newStatus = !doc.isUploaded
                val updated = doc.copy(
                    isUploaded = newStatus,
                    fileName = if (newStatus) fileName else "",
                    fileSizeKb = if (newStatus) 1240 else 0,
                    ocrStatus = if (newStatus) "Verified ✓" else "Pending",
                    fileDataBase64 = if (newStatus) sampleB64 else "",
                    fileType = if (newStatus) mimeType else "application/pdf"
                )
                toggledDoc = updated
                updated
            } else doc
        }
        val cuid = if (app.companyUid.isNotBlank()) app.companyUid else "CUID-${app.crn.trim().uppercase().replace("[^A-Z0-9]".toRegex(), "")}"
        val updatedApp = app.copy(companyUid = cuid, documents = updatedDocs)
        _activeApplication.value = updatedApp

        // Vault directly to Supabase application_documents & sync application
        toggledDoc?.let { doc ->
            if (doc.isUploaded) {
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        supabaseClient.saveDocument(doc, updatedApp.appRef, cuid)
                    } catch (e: Exception) {
                        Log.w("BankRepository", "Failed saving document to vault: ${e.message}")
                    }
                }
                recordAuditLog(
                    actionType = "DOCUMENT_UPLOADED",
                    actorId = "CLIENT-" + app.crn,
                    actorName = app.companyInfo.companyName.ifBlank { "Client" },
                    actorRole = "Client Signatory",
                    companyUid = cuid,
                    targetCrn = app.crn,
                    targetEmail = app.registeredEmail,
                    targetCompany = app.companyInfo.companyName,
                    details = "Document ${doc.title} (${doc.fileName}) uploaded and Base64 vaulted into secure storage"
                )
            } else {
                recordAuditLog(
                    actionType = "DOCUMENT_REMOVED",
                    actorId = "CLIENT-" + app.crn,
                    actorName = app.companyInfo.companyName.ifBlank { "Client" },
                    actorRole = "Client Signatory",
                    companyUid = cuid,
                    targetCrn = app.crn,
                    targetEmail = app.registeredEmail,
                    targetCompany = app.companyInfo.companyName,
                    details = "Document ${doc.title} removed from vault"
                )
            }
        }
        syncActiveApplicationToSupabase()
    }

    fun updateDocumentTitle(docId: String, newTitle: String) {
        val app = _activeApplication.value
        val updatedDocs = app.documents.map { doc ->
            if (doc.id == docId) doc.copy(title = newTitle) else doc
        }
        _activeApplication.value = app.copy(documents = updatedDocs)
        syncActiveApplicationToSupabase()
    }

    fun addCustomDocument(title: String) {
        val app = _activeApplication.value
        val newDoc = DocumentItem(
            id = "doc_${System.currentTimeMillis()}",
            title = title,
            recommended = false,
            isUploaded = false
        )
        _activeApplication.value = app.copy(documents = app.documents + newDoc)
        syncActiveApplicationToSupabase()
    }

    fun addUbo(ubo: UboItem) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(ubos = app.ubos + ubo)
        syncActiveApplicationToSupabase()
    }

    fun removeUbo(id: String) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(ubos = app.ubos.filterNot { it.id == id })
        syncActiveApplicationToSupabase()
    }

    fun updateUbo(updated: UboItem) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(ubos = app.ubos.map { if (it.id == updated.id) updated else it })
        syncActiveApplicationToSupabase()
    }

    fun addShareholder(item: ShareholderItem) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(ownership = app.ownership + item)
        syncActiveApplicationToSupabase()
    }

    fun updateShareholder(updated: ShareholderItem) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(ownership = app.ownership.map { if (it.id == updated.id) updated else it })
        syncActiveApplicationToSupabase()
    }

    fun removeShareholder(id: String) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(ownership = app.ownership.filterNot { it.id == id })
        syncActiveApplicationToSupabase()
    }

    fun addGovernanceRole(role: GovernanceRoleItem) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(roles = app.roles + role)
        syncActiveApplicationToSupabase()
    }

    fun removeGovernanceRole(id: String) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(roles = app.roles.filterNot { it.id == id })
        syncActiveApplicationToSupabase()
    }

    fun updateFatcaCrs(info: FatcaCrsInfo) {
        val app = _activeApplication.value
        _activeApplication.value = app.copy(fatcaCrs = info)
        syncActiveApplicationToSupabase()
    }

    fun toggleReworkMode() {
        val app = _activeApplication.value
        val newMode = !app.isReworkMode
        val updatedOwnership = app.ownership.mapIndexed { idx, sh ->
            if (idx == 1) sh.copy(isFlaggedForRework = newMode) else sh
        }
        _activeApplication.value = app.copy(
            isReworkMode = newMode,
            ownership = updatedOwnership
        )
        syncActiveApplicationToSupabase()
    }

    fun submitApplication(): String {
        val app = _activeApplication.value
        val newRef = if (app.appRef.isNotBlank() && app.appRef.startsWith("AB-2026-")) app.appRef else ("AB-2026-" + String.format(Locale.US, "%04X", Random.nextInt(0x1000, 0xFFFF)))
        _activeApplication.value = app.copy(
            appRef = newRef,
            status = "submitted",
            currentStep = 7
        )
        syncActiveApplicationToSupabase()

        // Record submission confirmation email
        recordSimulatedEmail(
            to = app.registeredEmail,
            from = "First National Bank Compliance Desk <onboarding@fnb-us.com>",
            subject = "First National Bank — Application Received ($newRef)",
            text = "Your corporate account application for ${app.companyInfo.companyName} ($newRef) has been received. Assigned RM: Michael Vance.",
            type = "application_submitted"
        )

        // Sync with RM invitation status
        syncInvitationCompleted(app.crn, app.registeredEmail)
        return newRef
    }

    // --- Core Banking Operations ---

    fun executeWireTransfer(
        sourceAccountNum: String,
        beneficiaryName: String,
        beneficiaryIban: String,
        amount: Double,
        currency: String,
        description: String
    ): Result<TransactionRecord> {
        val accountList = _accounts.value.toMutableList()
        val accountIndex = accountList.indexOfFirst { it.accountNumber == sourceAccountNum }

        if (accountIndex == -1) {
            return Result.failure(Exception("Source account not found."))
        }

        val acc = accountList[accountIndex]
        if (acc.availableBalance < amount) {
            return Result.failure(Exception("Insufficient available balance ($currency ${acc.availableBalance})."))
        }

        val updatedBalance = acc.balance - amount
        val updatedAvail = acc.availableBalance - amount
        accountList[accountIndex] = acc.copy(
            balance = updatedBalance,
            availableBalance = updatedAvail
        )
        _accounts.value = accountList

        val txRef = "TX-FTS-" + String.format(Locale.US, "%04X", Random.nextInt(0x1000, 0xFFFF))
        val swiftUetr = UUID.randomUUID().toString()
        val newTx = TransactionRecord(
            id = System.currentTimeMillis(),
            transactionRef = txRef,
            swiftUetr = swiftUetr,
            accountNumber = sourceAccountNum,
            type = "debit",
            amount = amount,
            currency = currency,
            counterpartyName = beneficiaryName,
            counterpartyIban = beneficiaryIban,
            description = description.ifBlank { "Corporate Wire Transfer" },
            category = "Commercial Wire Payment",
            status = "settled",
            channel = "Fedwire Funds Service",
            timestamp = "Just now"
        )

        _transactions.value = listOf(newTx) + _transactions.value

        // Dispatch simulated wire transfer notification email
        recordSimulatedEmail(
            to = _activeApplication.value.registeredEmail,
            from = "First National Bank Operations Desk <operations@fnb-us.com>",
            subject = "Transfer Executed: $currency ${String.format(Locale.US, "%,.2f", amount)} to $beneficiaryName",
            text = "Your payment of $currency $amount has cleared via Fedwire Funds Service. Reference: $txRef, SWIFT UETR: $swiftUetr.",
            type = "transfer_executed"
        )

        return Result.success(newTx)
    }

    fun getTotalLiquidityAed(): Double {
        return _accounts.value.sumOf { acc ->
            when (acc.currency) {
                "AED" -> acc.balance
                "USD" -> acc.balance * 3.6725
                "EUR" -> acc.balance * 4.0210
                else -> acc.balance
            }
        }
    }

    // --- RM Operations ---

    fun authenticateRm(staffId: String, passkey: String): Boolean {
        if (staffId.trim().equals("phanee", ignoreCase = true) &&
            passkey.trim() == "Visionbank@324"
        ) {
            val user = RmUser(
                username = "phanee",
                fullName = "Phanee",
                email = "phanee@fnb-us.com",
                role = "Senior Relationship Manager · Corporate Banking",
                branch = "New York Financial Center"
            )
            _currentRmUser.value = user

            recordAuditLog(
                actionType = "RM_LOGIN",
                actorId = "RM-PHANEE",
                actorName = "Phanee (Senior RM)",
                actorRole = "RM Executive",
                details = "RM Phanee authenticated successfully into Mobile Banking Suite (Branch: New York Financial Center)",
                status = "SUCCESS"
            )
            return true
        }
        recordAuditLog(
            actionType = "RM_LOGIN",
            actorId = "RM-UNKNOWN",
            actorName = staffId.ifBlank { "Anonymous" },
            actorRole = "RM Candidate",
            details = "Failed authentication attempt for RM staff ID '$staffId'",
            status = "FAILED"
        )
        return false
    }

    fun signoutRm() {
        val user = _currentRmUser.value
        recordAuditLog(
            actionType = "RM_LOGOUT",
            actorId = "RM-" + (user?.username?.uppercase() ?: "PHANEE"),
            actorName = user?.fullName ?: "Phanee",
            actorRole = "RM Executive",
            details = "RM Executive Phanee logged out of Mobile Banking Suite",
            status = "SUCCESS"
        )
        _currentRmUser.value = null
    }

    suspend fun dispatchRmInvitation(
        crn: String,
        email: String,
        companyName: String,
        contactPerson: String,
        phone: String,
        notes: String
    ): RmInvitation {
        val cleanCrn = crn.trim().uppercase()
        val cleanEmail = email.trim().lowercase()
        val cuid = "CUID-${cleanCrn.replace("[^A-Z0-9]".toRegex(), "")}"
        val token = "inv_" + UUID.randomUUID().toString().take(8)
        val link = "https://fnb-corp.bank/portal?crn=$cleanCrn&email=$cleanEmail&token=$token"

        val invite = RmInvitation(
            crn = cleanCrn,
            email = cleanEmail,
            companyUid = cuid,
            companyName = companyName.trim(),
            contactPerson = contactPerson.trim().ifBlank { "Authorized Signatory" },
            phone = phone.trim(),
            rmName = _currentRmUser.value?.fullName ?: "Phanee (Senior RM)",
            rmId = "RM-" + (_currentRmUser.value?.username?.uppercase() ?: "PHANEE"),
            inviteToken = token,
            status = "invited",
            inviteLink = link,
            notes = notes.trim(),
            currentStep = 1,
            createdAt = currentTimestamp()
        )

        _rmInvitations.value = listOf(invite) + _rmInvitations.value.filterNot {
            it.crn.equals(cleanCrn, ignoreCase = true) && it.email.equals(cleanEmail, ignoreCase = true)
        }

        // Store invitation in Supabase PostgreSQL Cloud Database
        supabaseClient.saveInvitationToDatabase(invite)

        // Record dispatch in Mobile Audit Trail
        recordAuditLog(
            actionType = "INVITATION_DISPATCHED",
            actorId = "RM-" + (_currentRmUser.value?.username?.uppercase() ?: "PHANEE"),
            actorName = _currentRmUser.value?.fullName ?: "Phanee (Senior RM)",
            actorRole = "RM Executive",
            companyUid = cuid,
            targetCrn = cleanCrn,
            targetEmail = cleanEmail,
            targetCompany = companyName.trim(),
            details = "Generated & dispatched dedicated onboarding link to $cleanEmail for $companyName (CRN: $cleanCrn). Security Token: $token"
        )

        // Record dispatch email
        recordSimulatedEmail(
            to = cleanEmail,
            from = "Michael Vance — First National Bank Corporate Banking <m.vance@fnb-us.com>",
            subject = "Invitation to Onboard: First National Bank Corporate Banking for ${companyName.trim()}",
            text = "Welcome to First National Bank. Your corporate onboarding link is: $link (CRN: $cleanCrn). Access code 1111.",
            type = "rm_invitation"
        )

        return invite
    }

    fun resendRmInvitation(crn: String, email: String) {
        val invite = _rmInvitations.value.find {
            it.crn.equals(crn, ignoreCase = true) && it.email.equals(email, ignoreCase = true)
        } ?: return

        recordAuditLog(
            actionType = "INVITATION_RESENT",
            actorId = "RM-" + (_currentRmUser.value?.username?.uppercase() ?: "PHANEE"),
            actorName = _currentRmUser.value?.fullName ?: "Phanee (Senior RM)",
            actorRole = "RM Executive",
            targetCrn = invite.crn,
            targetEmail = invite.email,
            targetCompany = invite.companyName,
            details = "Re-dispatched onboarding invitation email notification to ${invite.email} (CRN: ${invite.crn})"
        )

        recordSimulatedEmail(
            to = invite.email,
            from = "Michael Vance — First National Bank <m.vance@fnb-us.com>",
            subject = "Reminder: Complete Your First National Bank Onboarding for ${invite.companyName}",
            text = "Please continue your onboarding at ${invite.inviteLink} for CRN ${invite.crn}.",
            type = "rm_invitation"
        )
    }

    private fun syncInvitationProgress(crn: String, email: String, step: Int) {
        val updated = _rmInvitations.value.map { inv ->
            if (inv.crn.equals(crn, ignoreCase = true) && inv.email.equals(email, ignoreCase = true)) {
                inv.copy(
                    currentStep = step,
                    status = if (inv.status == "completed") "completed" else "in_progress"
                )
            } else inv
        }
        _rmInvitations.value = updated
    }

    private fun syncInvitationCompleted(crn: String, email: String) {
        val updated = _rmInvitations.value.map { inv ->
            if (inv.crn.equals(crn, ignoreCase = true) && inv.email.equals(email, ignoreCase = true)) {
                inv.copy(status = "completed", currentStep = 7)
            } else inv
        }
        _rmInvitations.value = updated
    }

    suspend fun refreshInvitationsFromSupabase(): List<RmInvitation> {
        val result = supabaseClient.fetchAllInvitations()
        val list = result.getOrDefault(emptyList())
        if (list.isNotEmpty()) {
            _rmInvitations.value = list
        }
        recordAuditLog(
            actionType = "PIPELINE_SYNC",
            actorId = "RM-" + (_currentRmUser.value?.username?.uppercase() ?: "PHANEE"),
            actorName = _currentRmUser.value?.fullName ?: "Phanee (Senior RM)",
            actorRole = "RM Executive",
            details = "Synchronized customer invitations pipeline (${list.size} records)",
            status = "SUCCESS"
        )
        return _rmInvitations.value
    }

    suspend fun refreshAuditLogsFromSupabase(): List<MobileAuditLog> {
        val result = supabaseClient.fetchAuditLogs()
        val list = result.getOrDefault(emptyList())
        if (list.isNotEmpty()) {
            val current = _auditLogs.value
            val merged = (list + current).distinctBy { it.id }
            _auditLogs.value = merged
        }
        return _auditLogs.value
    }

    fun recordAuditLog(
        actionType: String,
        actorId: String,
        actorName: String,
        actorRole: String = "RM Executive",
        companyUid: String = "",
        targetCrn: String? = null,
        targetEmail: String? = null,
        targetCompany: String? = null,
        details: String,
        status: String = "SUCCESS",
        deviceInfo: String = "Android Mobile (Google Pixel / API 34)",
        ipAddress: String = "10.0.2.16 (Secure Core VPN)"
    ): MobileAuditLog {
        val resolvedCuid = if (companyUid.isNotBlank()) companyUid else if (!targetCrn.isNullOrBlank()) "CUID-${targetCrn.uppercase().replace("[^A-Z0-9]".toRegex(), "")}" else ""
        val log = MobileAuditLog(
            id = UUID.randomUUID().toString(),
            timestamp = currentTimestamp(),
            actionType = actionType,
            actorId = actorId,
            actorName = actorName,
            actorRole = actorRole,
            companyUid = resolvedCuid,
            targetCrn = targetCrn,
            targetEmail = targetEmail,
            targetCompany = targetCompany,
            details = details,
            status = status,
            deviceInfo = deviceInfo,
            ipAddress = ipAddress
        )
        _auditLogs.value = listOf(log) + _auditLogs.value

        // Asynchronously persist to Supabase mobile_audit_logs table
        CoroutineScope(Dispatchers.IO).launch {
            try {
                supabaseClient.saveAuditLog(log)
            } catch (e: Exception) {
                Log.w("BankRepository", "Failed saving audit log to cloud: ${e.message}")
            }
        }
        return log
    }

    suspend fun findRmInvitation(crn: String, email: String): RmInvitation? {
        val cleanCrn = crn.trim()
        val cleanEmail = email.trim()

        // 1. Query live Supabase Cloud Database first (prioritize cloud database for web/mobile sync)
        val cloudQuery = supabaseClient.queryCustomerCredentials(cleanCrn, cleanEmail)
        val cloudInvite = cloudQuery.getOrNull()
        if (cloudInvite != null) {
            // Cache in local repository state
            _rmInvitations.value = listOf(cloudInvite) + _rmInvitations.value.filterNot {
                it.crn.equals(cloudInvite.crn, ignoreCase = true) &&
                        (it.email.equals(cloudInvite.email, ignoreCase = true) ||
                         normalizeEmail(it.email) == normalizeEmail(cloudInvite.email))
            }
            return cloudInvite
        }

        // 2. Check local in-memory state
        val local = _rmInvitations.value.find {
            it.crn.equals(cleanCrn, ignoreCase = true) &&
                    (it.email.equals(cleanEmail, ignoreCase = true) ||
                     normalizeEmail(it.email) == normalizeEmail(cleanEmail))
        }
        if (local != null) return local

        return null
    }

    suspend fun findInvitationByCrnOnly(crn: String): RmInvitation? {
        val cleanCrn = crn.trim()
        val local = _rmInvitations.value.find { it.crn.equals(cleanCrn, ignoreCase = true) }
        if (local != null) return local
        return supabaseClient.queryInvitationByCrn(cleanCrn).getOrNull()
    }

    private fun normalizeEmail(email: String): String {
        return email.trim().lowercase()
            .replace("@yopmial.com", "@yopmail.com")
            .replace("@yopmail.con", "@yopmail.com")
            .replace("@gamil.com", "@gmail.com")
            .replace("@gmail.con", "@gmail.com")
            .replace("@hotmial.com", "@hotmail.com")
            .replace("@outlok.com", "@outlook.com")
    }

    fun loadApplicationForClient(invite: RmInvitation) {
        val docs = listOf(
            DocumentItem(id = "doc_1", title = "Trade Licence (recommended)", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
            DocumentItem(id = "doc_2", title = "Certificate of Incorporation", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
            DocumentItem(id = "doc_3", title = "Board Resolution", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
            DocumentItem(id = "doc_4", title = "Tax Residency Certificate / TRN", recommended = false, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = "")
        )

        val cleanCrn = invite.crn.trim().uppercase()
        val cuid = if (invite.companyUid.isNotBlank()) invite.companyUid else "CUID-${cleanCrn.replace("[^A-Z0-9]".toRegex(), "")}"
        val generatedRef = "AB-2026-" + UUID.randomUUID().toString().replace("-", "").take(6).uppercase()
        val initialApp = OnboardingApplication(
            appRef = generatedRef,
            crn = invite.crn,
            registeredEmail = invite.email,
            companyUid = cuid,
            currentStep = 1,
            status = invite.status.ifBlank { "draft" },
            companyInfo = CompanyInfo(
                crn = invite.crn,
                email = invite.email,
                companyUid = cuid,
                companyName = invite.companyName,
                tradeName = invite.companyName,
                contactPerson = invite.contactPerson,
                phone = invite.phone
            ),
            documents = docs,
            ubos = emptyList(),
            ownership = emptyList(),
            roles = emptyList(),
            fatcaCrs = FatcaCrsInfo(),
            isReworkMode = false,
            reworkComment = ""
        )
        _activeApplication.value = initialApp

        // Post-login Supabase synchronization
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val existing = supabaseClient.fetchApplicationForCrn(invite.crn).getOrNull()
                if (existing != null) {
                    val mergedInfo = existing.companyInfo.copy(
                        companyUid = cuid,
                        companyName = existing.companyInfo.companyName.ifBlank { invite.companyName },
                        tradeName = existing.companyInfo.tradeName.ifBlank { invite.companyName },
                        contactPerson = existing.companyInfo.contactPerson.ifBlank { invite.contactPerson },
                        phone = existing.companyInfo.phone.ifBlank { invite.phone }
                    )
                    _activeApplication.value = existing.copy(
                        companyUid = if (existing.companyUid.isNotBlank()) existing.companyUid else cuid,
                        companyInfo = mergedInfo
                    )
                    Log.d("BankRepository", "Restored existing application from Supabase for CRN ${invite.crn}")
                } else {
                    // Immediately create the application row in Supabase post-login
                    supabaseClient.syncApplication(_activeApplication.value)
                    Log.d("BankRepository", "Created new application in Supabase for CRN ${invite.crn}")
                }
            } catch (e: Exception) {
                Log.e("BankRepository", "Error syncing post-login application: ${e.message}", e)
            }
        }
    }

    fun loadApplicationForClient(crn: String, email: String, companyName: String) {
        val cleanCrn = crn.trim().uppercase()
        val matchingInvite = _rmInvitations.value.find { it.crn.equals(cleanCrn, ignoreCase = true) }
        if (matchingInvite != null) {
            loadApplicationForClient(matchingInvite)
        } else {
            val docs = listOf(
                DocumentItem(id = "doc_1", title = "Trade Licence (recommended)", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
                DocumentItem(id = "doc_2", title = "Certificate of Incorporation", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
                DocumentItem(id = "doc_3", title = "Board Resolution", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
                DocumentItem(id = "doc_4", title = "Tax Residency Certificate / TRN", recommended = false, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = "")
            )
            val cuid = "CUID-${cleanCrn.replace("[^A-Z0-9]".toRegex(), "")}"
            val generatedRef = "AB-2026-" + UUID.randomUUID().toString().replace("-", "").take(6).uppercase()
            _activeApplication.value = OnboardingApplication(
                appRef = generatedRef,
                crn = cleanCrn,
                registeredEmail = email.trim(),
                companyUid = cuid,
                currentStep = 1,
                status = "draft",
                companyInfo = CompanyInfo(
                    crn = cleanCrn,
                    email = email.trim(),
                    companyUid = cuid,
                    companyName = companyName,
                    tradeName = companyName
                ),
                documents = docs,
                ubos = emptyList(),
                ownership = emptyList(),
                roles = emptyList(),
                fatcaCrs = FatcaCrsInfo(),
                isReworkMode = false,
                reworkComment = ""
            )

            // Post-login Supabase sync
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val existing = supabaseClient.fetchApplicationForCrn(cleanCrn).getOrNull()
                    if (existing != null) {
                        _activeApplication.value = existing.copy(
                            companyUid = if (existing.companyUid.isNotBlank()) existing.companyUid else cuid,
                            companyInfo = existing.companyInfo.copy(companyUid = cuid)
                        )
                        Log.d("BankRepository", "Restored existing application from Supabase for CRN $cleanCrn")
                    } else {
                        supabaseClient.syncApplication(_activeApplication.value)
                        Log.d("BankRepository", "Created new application in Supabase for CRN $cleanCrn")
                    }
                } catch (e: Exception) {
                    Log.e("BankRepository", "Error syncing post-login application: ${e.message}", e)
                }
            }
        }
    }

    // --- Mailbox ---

    fun recordSimulatedEmail(to: String, from: String, subject: String, text: String, type: String, code: String? = null) {
        val item = SimulatedEmail(
            id = "eml_" + System.currentTimeMillis() + "_" + Random.nextInt(100, 999),
            to = to,
            from = from,
            subject = subject,
            text = text,
            type = type,
            code = code,
            timestamp = currentTimestamp()
        )
        _simulatedEmails.value = listOf(item) + _simulatedEmails.value.take(49)
    }
}
