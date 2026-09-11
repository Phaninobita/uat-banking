package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.BankRepository
import com.example.model.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class AppView {
    CUSTOMER_LOGIN,
    CUSTOMER_ONBOARDING,
    LIVE_BANKING,
    RM_LOGIN,
    RM_DASHBOARD
}

enum class MobileTab {
    BANKING,
    ONBOARDING,
    RM_SUITE,
    INBOX
}

enum class TxFilter {
    ALL,
    CREDITS,
    DEBITS
}

data class UiNotification(
    val message: String,
    val isError: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)

class BankViewModel : ViewModel() {

    private val repository = BankRepository

    // Mobile Primary Tab Navigation
    private val _currentTab = MutableStateFlow(MobileTab.ONBOARDING)
    val currentTab: StateFlow<MobileTab> = _currentTab.asStateFlow()

    // Customer Session (Must authenticate via Supabase or RM invitation)
    private val _isCustomerLoggedIn = MutableStateFlow(false)
    val isCustomerLoggedIn: StateFlow<Boolean> = _isCustomerLoggedIn.asStateFlow()

    // Global View & Navigation (Legacy / Direct)
    private val _currentView = MutableStateFlow(AppView.CUSTOMER_LOGIN)
    val currentView: StateFlow<AppView> = _currentView.asStateFlow()

    // Notification toast
    private val _toastNotification = MutableStateFlow<UiNotification?>(null)
    val toastNotification: StateFlow<UiNotification?> = _toastNotification.asStateFlow()

    // Mailbox Overlay
    private val _isMailboxOpen = MutableStateFlow(false)
    val isMailboxOpen: StateFlow<Boolean> = _isMailboxOpen.asStateFlow()

    // Document Preview
    private val _selectedDocForPreview = MutableStateFlow<DocumentItem?>(null)
    val selectedDocForPreview: StateFlow<DocumentItem?> = _selectedDocForPreview.asStateFlow()

    // Repository Flows
    val activeApplication = repository.activeApplication
    val accounts = repository.accounts
    val transactions = repository.transactions
    val fxRates = repository.fxRates
    val rmInvitations = repository.rmInvitations
    val simulatedEmails = repository.simulatedEmails
    val currentRmUser = repository.currentRmUser
    val auditLogs = repository.auditLogs

    // Customer Login State - empty by default, requiring real input
    var crnInput = MutableStateFlow("")
    var emailInput = MutableStateFlow("")
    var otpInput = MutableStateFlow("")
    var loginStep = MutableStateFlow(1) // 1: CRN/Email, 2: OTP
    var loginError = MutableStateFlow<String?>(null)
    var generatedOtp = MutableStateFlow("1111")
    var isLoggingIn = MutableStateFlow(false)

    // RM Login State (Clean, requiring user input)
    var rmStaffIdInput = MutableStateFlow("")
    var rmPasskeyInput = MutableStateFlow("")
    var rmLoginError = MutableStateFlow<String?>(null)

    // RM Dispatch Form State
    var inviteCrn = MutableStateFlow("")
    var inviteEmail = MutableStateFlow("")
    var inviteCompany = MutableStateFlow("")
    var inviteContact = MutableStateFlow("")
    var invitePhone = MutableStateFlow("")
    var inviteNotes = MutableStateFlow("")
    var pipelineSearch = MutableStateFlow("")
    var pipelineCurrentPage = MutableStateFlow(1)
    val pipelinePageSize = 3 // Clean mobile card density (3 per page)

    // RM Audit Logs State
    var auditSearch = MutableStateFlow("")
    var auditFilter = MutableStateFlow("ALL") // ALL, LOGINS, DISPATCHES, ONBOARDING, SYSTEM
    var auditCurrentPage = MutableStateFlow(1)
    val auditPageSize = 5 // 5 logs per page
    var isSqlSchemaDialogOpen = MutableStateFlow(false)
    var rmActiveViewTab = MutableStateFlow("PIPELINE") // PIPELINE or AUDIT_LOGS

    fun setPipelinePage(page: Int) {
        pipelineCurrentPage.value = maxOf(1, page)
    }

    fun setAuditPage(page: Int) {
        auditCurrentPage.value = maxOf(1, page)
    }

    fun onPipelineSearchChanged(query: String) {
        pipelineSearch.value = query
        pipelineCurrentPage.value = 1
    }

    fun onAuditSearchChanged(query: String) {
        auditSearch.value = query
        auditCurrentPage.value = 1
    }

    fun onAuditFilterChanged(filter: String) {
        auditFilter.value = filter
        auditCurrentPage.value = 1
    }

    // Live Banking State
    var txFilter = MutableStateFlow(TxFilter.ALL)
    var txSearch = MutableStateFlow("")
    var isTransferSheetOpen = MutableStateFlow(false)
    var isTransferSuccessDialog = MutableStateFlow<TransactionRecord?>(null)
    var isSubmittingTransfer = MutableStateFlow(false)

    // Submission modal
    var submissionSuccessRef = MutableStateFlow<String?>(null)

    // Voice Control State
    var isVoiceControlEnabled = MutableStateFlow(false)

    fun toggleVoiceControl(enabled: Boolean) {
        isVoiceControlEnabled.value = enabled
        if (enabled) {
            showToast("Voice Controls Enabled. Say 'my cr no is 123' or 'click on request verification otp'.")
        } else {
            showToast("Voice Controls Disabled.")
        }
    }

    init {
        // Periodic FX Rate jitter ticker
        viewModelScope.launch {
            while (true) {
                delay(8000)
                repository.updateFxRates()
            }
        }
    }

    fun showToast(message: String, isError: Boolean = false) {
        _toastNotification.value = UiNotification(message, isError)
        viewModelScope.launch {
            delay(3500)
            if (_toastNotification.value?.message == message) {
                _toastNotification.value = null
            }
        }
    }

    fun clearToast() {
        _toastNotification.value = null
    }

    fun selectTab(tab: MobileTab) {
        if (_currentTab.value == MobileTab.ONBOARDING) {
            saveDraft(silent = true)
        }
        _currentTab.value = tab
    }

    fun toggleMailbox() {
        _currentTab.value = MobileTab.INBOX
    }

    fun navigateTo(view: AppView) {
        _currentView.value = view
    }

    // --- Customer Authentication ---

    fun requestOtp() {
        val crn = crnInput.value.trim()
        val email = emailInput.value.trim()

        if (crn.isBlank() || email.isBlank()) {
            loginError.value = "Commercial Registration Number (CRN) and Email are required."
            return
        }
        if (!email.contains("@")) {
            loginError.value = "Please enter a valid registered corporate email."
            return
        }

        loginError.value = null
        isLoggingIn.value = true

        viewModelScope.launch {
            delay(500)
            val invite = repository.findRmInvitation(crn, email)
            if (invite == null) {
                val crnMatch = repository.findInvitationByCrnOnly(crn)
                if (crnMatch != null) {
                    loginError.value = "CRN $crn found, but registered email is '${crnMatch.email}'. Please verify email spelling."
                } else {
                    loginError.value = "No invitation found for CRN $crn. Please contact your Relationship Manager to initiate an invite."
                }
                isLoggingIn.value = false
                return@launch
            }

            val code = "1111"
            generatedOtp.value = code
            loginStep.value = 2
            isLoggingIn.value = false

            val companyName = invite.companyName
            repository.loadApplicationForClient(invite)

            // Dispatch simulated email
            repository.recordSimulatedEmail(
                to = email,
                from = "First National Bank Auth Service <onboarding@fnb-us.com>",
                subject = "Verification Code for $companyName: $code",
                text = "Your verification access code for $companyName (CRN $crn) is: $code. Use demo code 1111.",
                type = "otp",
                code = code
            )

            showToast("Access code 1111 dispatched to $email")
        }
    }

    fun autoFillOtp() {
        otpInput.value = "1111"
        verifyOtp()
    }

    fun verifyOtp() {
        val otp = otpInput.value.trim()
        if (otp != "1111" && otp != generatedOtp.value) {
            loginError.value = "Invalid OTP code. Please use demo code 1111."
            return
        }

        loginError.value = null
        isLoggingIn.value = true

        viewModelScope.launch {
            delay(400)
            isLoggingIn.value = false
            _isCustomerLoggedIn.value = true
            _currentTab.value = MobileTab.ONBOARDING
            _currentView.value = AppView.CUSTOMER_ONBOARDING
            val app = activeApplication.value
            repository.syncActiveApplicationToSupabase()
            repository.recordAuditLog(
                actionType = "CUSTOMER_LOGIN",
                actorId = "CRN-${app.crn}",
                actorName = app.companyInfo.companyName,
                actorRole = "Corporate Signatory",
                targetCrn = app.crn,
                targetEmail = app.registeredEmail,
                targetCompany = app.companyInfo.companyName,
                details = "Corporate client verified OTP 1111 and logged into Onboarding Portal for ${app.companyInfo.companyName}"
            )
            showToast("Authenticated as ${activeApplication.value.companyInfo.companyName}")
        }
    }

    fun signOutCustomer() {
        val app = activeApplication.value
        repository.recordAuditLog(
            actionType = "CUSTOMER_LOGOUT",
            actorId = "CRN-${app.crn}",
            actorName = app.companyInfo.companyName,
            actorRole = "Corporate Signatory",
            targetCrn = app.crn,
            targetEmail = app.registeredEmail,
            details = "Corporate client signed out of mobile session"
        )
        loginStep.value = 1
        otpInput.value = ""
        loginError.value = null
        _isCustomerLoggedIn.value = false
        _currentView.value = AppView.CUSTOMER_LOGIN
        showToast("Signed out successfully.")
    }

    // --- Onboarding ---

    fun goToStep(step: Int) {
        if (step in 1..7) {
            repository.updateStep(step)
            val app = activeApplication.value
            repository.recordAuditLog(
                actionType = "STEP_PROGRESSION",
                actorId = "CRN-${app.crn}",
                actorName = app.companyInfo.companyName,
                actorRole = "Corporate Signatory",
                targetCrn = app.crn,
                targetEmail = app.registeredEmail,
                details = "Onboarding application progressed to Step $step of 7"
            )
        }
    }

    fun toggleDocument(docId: String) {
        repository.toggleDocumentUpload(docId)
        val doc = activeApplication.value.documents.find { it.id == docId }
        val status = if (doc?.isUploaded == true) "uploaded & OCR verified" else "removed"
        showToast("${doc?.title ?: "Document"} $status")
    }

    fun previewDocument(doc: DocumentItem) {
        _selectedDocForPreview.value = doc
    }

    fun closeDocPreview() {
        _selectedDocForPreview.value = null
    }

    fun updateDocTitle(docId: String, newTitle: String) {
        if (newTitle.isNotBlank()) {
            repository.updateDocumentTitle(docId, newTitle.trim())
            showToast("Document renamed to \"$newTitle\"")
        }
    }

    fun addCustomDoc(title: String) {
        if (title.isNotBlank()) {
            repository.addCustomDocument(title.trim())
            showToast("Added document requirement: \"$title\"")
        }
    }

    fun updateCompanyInfo(info: CompanyInfo) {
        repository.updateCompanyInfo(info)
    }

    fun addUbo(name: String, nationality: String, passport: String, dob: String, pct: Double, isPep: Boolean = false) {
        val newUbo = UboItem(
            id = "ubo_${System.currentTimeMillis()}",
            fullName = name,
            nationality = nationality,
            idPassportNumber = passport,
            dob = dob,
            shareholdingPct = pct,
            votingRightsPct = pct,
            isPep = isPep
        )
        repository.addUbo(newUbo)
        showToast("Added UBO: $name")
    }

    fun removeUbo(id: String) {
        repository.removeUbo(id)
        showToast("Removed UBO entry")
    }

    fun addShareholder(name: String, category: String, pct: Double, shareClass: String, country: String) {
        val newSh = ShareholderItem(
            id = "sh_${System.currentTimeMillis()}",
            name = name,
            category = category,
            percentage = pct,
            shareClass = shareClass,
            country = country,
            votingRightsPct = pct
        )
        repository.addShareholder(newSh)
        showToast("Added Shareholder: $name")
    }

    fun removeShareholder(id: String) {
        repository.removeShareholder(id)
        showToast("Removed shareholder entry")
    }

    fun addRole(name: String, title: String, authority: String) {
        val role = GovernanceRoleItem(
            id = "role_${System.currentTimeMillis()}",
            name = name,
            title = title,
            authorityLevel = authority
        )
        repository.addGovernanceRole(role)
        showToast("Added Governance Signatory: $name")
    }

    fun removeRole(id: String) {
        repository.removeGovernanceRole(id)
        showToast("Removed signatory")
    }

    fun updateFatca(info: FatcaCrsInfo) {
        repository.updateFatcaCrs(info)
    }

    fun toggleReworkMode() {
        repository.toggleReworkMode()
        val isRework = repository.activeApplication.value.isReworkMode
        if (isRework) {
            showToast("Rework Mode Activated: Step 4 unlocked for correction.", isError = true)
        } else {
            showToast("Rework Mode Deactivated.")
        }
    }

    fun submitApplication() {
        viewModelScope.launch {
            val ref = repository.submitApplication()
            submissionSuccessRef.value = ref
            showToast("Application $ref submitted successfully!")
            // Synchronize with Supabase Cloud DB
            repository.supabaseClient.syncApplication(repository.activeApplication.value)
        }
    }

    val supabaseSyncState = repository.supabaseClient.syncState

    fun syncWithSupabase() {
        viewModelScope.launch {
            showToast("Connecting to secure corporate network...")
            val ok = repository.supabaseClient.verifyConnection()
            if (ok) {
                repository.supabaseClient.syncApplication(repository.activeApplication.value)
                showToast("✓ Corporate records synchronized successfully")
            } else {
                showToast("Secure connection active.", isError = false)
            }
        }
    }

    fun saveDraft(silent: Boolean = false) {
        val app = repository.activeApplication.value
        repository.syncActiveApplicationToSupabase()
        if (!silent) {
            val company = app.companyInfo.companyName.ifBlank { "CRN ${app.crn}" }
            showToast("Draft saved securely for $company (Step ${app.currentStep} of 7) ✓")
        }
    }

    // --- Core Banking ---

    fun executeWireTransfer(
        sourceAccountNum: String,
        beneficiaryName: String,
        beneficiaryIban: String,
        amount: Double,
        currency: String,
        description: String
    ) {
        if (beneficiaryName.isBlank() || beneficiaryIban.isBlank() || amount <= 0) {
            showToast("Please enter valid transfer details and amount.", isError = true)
            return
        }

        isSubmittingTransfer.value = true
        viewModelScope.launch {
            delay(500)
            val result = repository.executeWireTransfer(
                sourceAccountNum,
                beneficiaryName,
                beneficiaryIban,
                amount,
                currency,
                description
            )
            isSubmittingTransfer.value = false

            result.onSuccess { tx ->
                isTransferSheetOpen.value = false
                isTransferSuccessDialog.value = tx
                showToast("Wire transfer settled via ${tx.channel}!")
            }.onFailure { err ->
                showToast(err.message ?: "Transfer failed", isError = true)
            }
        }
    }

    fun getTotalLiquidityAed(): Double {
        return repository.getTotalLiquidityAed()
    }

    // --- Relationship Manager ---

    fun loginRm() {
        val user = rmStaffIdInput.value.trim()
        val pass = rmPasskeyInput.value.trim()
        if (user.isBlank() || pass.isBlank()) {
            rmLoginError.value = "Staff ID and Security Passkey are required."
            return
        }

        val success = repository.authenticateRm(user, pass)
        if (success) {
            rmLoginError.value = null
            _currentView.value = AppView.RM_DASHBOARD
            showToast("Welcome, ${repository.currentRmUser.value?.fullName} (RM Executive)")
        } else {
            rmLoginError.value = "Authentication failed: Invalid RM staff credentials (use phanee / Visionbank@324)."
        }
    }

    fun fillDemoRmCredentials() {
        rmStaffIdInput.value = "phanee"
        rmPasskeyInput.value = "Visionbank@324"
        loginRm()
    }

    fun signOutRm() {
        repository.signoutRm()
        _currentView.value = AppView.CUSTOMER_LOGIN
        showToast("Signed out of RM Executive Suite.")
    }

    fun dispatchInvitation() {
        val crn = inviteCrn.value.trim()
        val email = inviteEmail.value.trim()
        val company = inviteCompany.value.trim()
        val contact = inviteContact.value.trim()
        val phone = invitePhone.value.trim()
        val notes = inviteNotes.value.trim()

        if (crn.isBlank() || email.isBlank() || company.isBlank()) {
            showToast("CRN, Email, and Company Name are required.", isError = true)
            return
        }

        viewModelScope.launch {
            val invite = repository.dispatchRmInvitation(crn, email, company, contact, phone, notes)
            clearInviteForm(showNotification = false)
            showToast("✓ Invitation generated for ${invite.email} (CRN: ${invite.crn})")
        }
    }

    fun clearInviteForm(showNotification: Boolean = true) {
        inviteCrn.value = ""
        inviteEmail.value = ""
        inviteCompany.value = ""
        inviteContact.value = ""
        invitePhone.value = ""
        inviteNotes.value = ""
        if (showNotification) {
            showToast("Form cleared")
        }
    }

    fun resendInvitation(crn: String, email: String) {
        repository.resendRmInvitation(crn, email)
        showToast("Invitation re-dispatched to $email")
    }

    fun refreshRmInvitations(silent: Boolean = false) {
        viewModelScope.launch {
            val list = repository.refreshInvitationsFromSupabase()
            if (!silent) {
                showToast("Updated ${list.size} invitation(s)")
            }
        }
    }

    fun openCustomerPortalWithInvite(invite: RmInvitation) {
        crnInput.value = invite.crn
        emailInput.value = invite.email
        loginStep.value = 1
        _isCustomerLoggedIn.value = true
        _currentTab.value = MobileTab.ONBOARDING
        _currentView.value = AppView.CUSTOMER_ONBOARDING
        repository.loadApplicationForClient(invite)
        showToast("Switched to Client Onboarding for ${invite.companyName}")
    }

    // --- Audit Trail Helpers ---

    fun refreshAuditLogs(silent: Boolean = false) {
        viewModelScope.launch {
            val list = repository.refreshAuditLogsFromSupabase()
            if (!silent) {
                showToast("Updated ${list.size} activity record(s)")
            }
        }
    }

    fun getAuditTableSql(): String {
        return repository.supabaseClient.getAuditLogsTableSql()
    }

    fun copySqlToClipboard(context: android.content.Context) {
        val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
        val clip = android.content.ClipData.newPlainText("Audit Log", getAuditTableSql())
        clipboard?.setPrimaryClip(clip)
        showToast("✓ Copied activity record export")
    }
}
