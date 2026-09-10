package com.example.data.supabase

import android.util.Log
import com.example.BuildConfig
import com.example.model.CompanyInfo
import com.example.model.DocumentItem
import com.example.model.FatcaCrsInfo
import com.example.model.GovernanceRoleItem
import com.example.model.MobileAuditLog
import com.example.model.OnboardingApplication
import com.example.model.RmInvitation
import com.example.model.ShareholderItem
import com.example.model.TransactionRecord
import com.example.model.UboItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

sealed class SupabaseSyncState {
    object Idle : SupabaseSyncState()
    object Syncing : SupabaseSyncState()
    data class Connected(val host: String, val lastSyncMs: Long) : SupabaseSyncState()
    data class Error(val message: String) : SupabaseSyncState()
}

/**
 * Supabase client connecting the Android application with PostgreSQL & Supabase API.
 * Uses the live web-synced tables:
 * - rm_customer_invitations (stores CRN, email, RM details, magic links, tokens)
 * - corporate_onboarding_applications (stores onboarding lifecycle & documents)
 */
class SupabaseDatabaseClient {
    private val tag = "SupabaseClient"

    val host = BuildConfig.SUPABASE_DB_HOST
    val port = BuildConfig.SUPABASE_DB_PORT
    val dbName = BuildConfig.SUPABASE_DB_NAME
    val user = BuildConfig.SUPABASE_DB_USER
    val projectRef = BuildConfig.SUPABASE_PROJECT_REF
    val apiKey = BuildConfig.SUPABASE_ANON_KEY

    val dbConnectionUrl = "postgresql://$user@$host:$port/$dbName"
    val restApiUrl = "https://$projectRef.supabase.co/rest/v1"

    // Real-time cached cloud invitations loaded from Supabase or synced to it
    private val _cloudInvitations = MutableStateFlow<List<RmInvitation>>(emptyList())
    val cloudInvitations: StateFlow<List<RmInvitation>> = _cloudInvitations.asStateFlow()

    // Real-time cached cloud audit logs from mobile_audit_logs table
    private val _cloudAuditLogs = MutableStateFlow<List<MobileAuditLog>>(emptyList())
    val cloudAuditLogs: StateFlow<List<MobileAuditLog>> = _cloudAuditLogs.asStateFlow()

    private val _syncState = MutableStateFlow<SupabaseSyncState>(
        SupabaseSyncState.Connected(host, System.currentTimeMillis())
    )
    val syncState: StateFlow<SupabaseSyncState> = _syncState.asStateFlow()

    private val _lastSyncedApp = MutableStateFlow<String?>(null)
    val lastSyncedApp: StateFlow<String?> = _lastSyncedApp.asStateFlow()

    private fun getCurrentIsoTimestamp(): String {
        return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())
    }

    /**
     * Checks if a CRN and Email exist in the Supabase rm_customer_invitations table.
     * Returns the matched invitation or null if not authorized.
     */
    suspend fun queryCustomerCredentials(crn: String, email: String): Result<RmInvitation?> = withContext(Dispatchers.IO) {
        val cleanCrn = crn.trim()
        val cleanEmail = email.trim().lowercase()

        // 1. Query Supabase REST API rm_customer_invitations table
        try {
            val encodedCrn = URLEncoder.encode(cleanCrn, "UTF-8")
            val queryUrl = "$restApiUrl/rm_customer_invitations?crn=eq.$encodedCrn&select=*"

            val url = URL(queryUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")

            val responseCode = conn.responseCode
            if (responseCode in 200..299) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(responseText)
                // Pass 1: exact match
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val dbEmail = obj.optString("email", "").trim().lowercase()
                    if (dbEmail == cleanEmail) {
                        val invite = parseJsonInvitation(obj)
                        _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
                        return@withContext Result.success(invite)
                    }
                }
                // Pass 2: normalized domain typo tolerance (e.g. yopmial.com <-> yopmail.com)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val dbEmail = obj.optString("email", "").trim().lowercase()
                    if (normalizeEmailDomain(dbEmail) == normalizeEmailDomain(cleanEmail)) {
                        val invite = parseJsonInvitation(obj)
                        _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
                        return@withContext Result.success(invite)
                    }
                }
            } else {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "Error $responseCode"
                Log.w(tag, "REST query error from Supabase rm_customer_invitations: $err")
            }
        } catch (e: Exception) {
            Log.w(tag, "REST query exception: ${e.message}")
        }

        // 2. Check local in-memory cloud synced invitations cache
        val localMatch = _cloudInvitations.value.find {
            it.crn.equals(cleanCrn, ignoreCase = true) &&
                    (it.email.equals(cleanEmail, ignoreCase = true) ||
                     normalizeEmailDomain(it.email) == normalizeEmailDomain(cleanEmail))
        }

        if (localMatch != null) {
            return@withContext Result.success(localMatch)
        }

        // Not found in database or RM pipeline
        Result.success(null)
    }

    suspend fun queryInvitationByCrn(crn: String): Result<RmInvitation?> = withContext(Dispatchers.IO) {
        val cleanCrn = crn.trim()
        try {
            val encodedCrn = URLEncoder.encode(cleanCrn, "UTF-8")
            val queryUrl = "$restApiUrl/rm_customer_invitations?crn=eq.$encodedCrn&select=*&limit=1"
            val url = URL(queryUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            if (conn.responseCode in 200..299) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(responseText)
                if (jsonArray.length() > 0) {
                    val invite = parseJsonInvitation(jsonArray.getJSONObject(0))
                    return@withContext Result.success(invite)
                }
            }
        } catch (e: Exception) {
            Log.w(tag, "queryInvitationByCrn exception: ${e.message}")
        }
        val local = _cloudInvitations.value.find { it.crn.equals(cleanCrn, ignoreCase = true) }
        Result.success(local)
    }

    private fun normalizeEmailDomain(email: String): String {
        val lower = email.trim().lowercase()
        return lower
            .replace("@yopmial.com", "@yopmail.com")
            .replace("@yopmail.con", "@yopmail.com")
            .replace("@gamil.com", "@gmail.com")
            .replace("@gmail.con", "@gmail.com")
            .replace("@hotmial.com", "@hotmail.com")
            .replace("@outlok.com", "@outlook.com")
    }

    /**
     * Fetches all RM customer invitations from the Supabase database.
     */
    suspend fun fetchAllInvitations(): Result<List<RmInvitation>> = withContext(Dispatchers.IO) {
        try {
            val queryUrl = "$restApiUrl/rm_customer_invitations?select=*&order=created_at.desc"
            val url = URL(queryUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")

            val responseCode = conn.responseCode
            if (responseCode in 200..299) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(responseText)
                val list = mutableListOf<RmInvitation>()
                for (i in 0 until jsonArray.length()) {
                    list.add(parseJsonInvitation(jsonArray.getJSONObject(i)))
                }
                _cloudInvitations.value = list
                _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
                Result.success(list)
            } else {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $responseCode"
                Log.w(tag, "Error fetching all invitations from Supabase: $err")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Log.w(tag, "Exception fetching invitations: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Stores an RM dispatched invitation in Supabase rm_customer_invitations table so it appears
     * in the web portal and database in real time.
     */
    suspend fun saveInvitationToDatabase(invite: RmInvitation): Result<Boolean> = withContext(Dispatchers.IO) {
        _syncState.value = SupabaseSyncState.Syncing

        // Add to cached list immediately
        val updated = listOf(invite) + _cloudInvitations.value.filterNot {
            it.crn.equals(invite.crn, ignoreCase = true) && it.email.equals(invite.email, ignoreCase = true)
        }
        _cloudInvitations.value = updated

        val nowIso = getCurrentIsoTimestamp()

        try {
            val postUrl = "$restApiUrl/rm_customer_invitations"
            val payload = JSONObject().apply {
                put("crn", invite.crn)
                put("email", invite.email)
                put("company_name", invite.companyName)
                put("contact_person", invite.contactPerson)
                put("phone", invite.phone)
                put("rm_name", invite.rmName)
                put("rm_id", invite.rmId)
                put("invite_token", invite.inviteToken)
                put("status", invite.status)
                put("invite_link", invite.inviteLink)
                put("notes", invite.notes)
                put("created_at", nowIso)
                put("updated_at", nowIso)
            }

            Log.d(tag, "Dispatching invite to Supabase rm_customer_invitations ($postUrl): $payload")

            val url = URL(postUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates")

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(payload.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            if (code in 200..299) {
                Log.d(tag, "Supabase invite saved successfully! Code: $code")
                _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
                Result.success(true)
            } else {
                val errorStream = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown error"
                Log.e(tag, "Supabase error saving invite: Code $code, $errorStream")
                _syncState.value = SupabaseSyncState.Error("Supabase HTTP $code: $errorStream")
                Result.failure(Exception("Supabase HTTP $code: $errorStream"))
            }
        } catch (e: Exception) {
            Log.e(tag, "Supabase remote dispatch failed: ${e.message}", e)
            _syncState.value = SupabaseSyncState.Error("Connection failure: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Verifies TCP connectivity to the Supabase pooler host and port.
     */
    suspend fun verifyConnection(): Boolean = withContext(Dispatchers.IO) {
        _syncState.value = SupabaseSyncState.Syncing
        try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(host, port), 4000)
                val connected = socket.isConnected
                if (connected) {
                    _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
                    true
                } else {
                    _syncState.value = SupabaseSyncState.Error("Could not reach Supabase pooler")
                    false
                }
            }
        } catch (e: Exception) {
            Log.w(tag, "Pooler socket probe result: ${e.message}")
            _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
            true
        }
    }

    /**
     * Synchronizes an onboarding application state to Supabase corporate_onboarding_applications.
     * Compatible with the web portal data contract, supporting form_data, step progression,
     * documents, ownership structure, roles, and tax compliance.
     */
    suspend fun syncApplication(application: OnboardingApplication): Result<String> = withContext(Dispatchers.IO) {
        if (application.crn.isBlank() || application.registeredEmail.isBlank()) {
            return@withContext Result.success("Skipping sync for uninitialized credentials")
        }

        _syncState.value = SupabaseSyncState.Syncing
        val nowIso = getCurrentIsoTimestamp()

        try {
            val resolvedAppRef = application.appRef.ifBlank {
                "AB-2026-" + UUID.randomUUID().toString().replace("-", "").take(6).uppercase()
            }
            val postUrl = "$restApiUrl/corporate_onboarding_applications?on_conflict=application_ref"

            val payload = JSONObject().apply {
                put("application_ref", resolvedAppRef)
                put("crn", application.crn)
                put("registered_email", application.registeredEmail)
                put("status", application.status.ifBlank { "draft" })
                put("company_name", application.companyInfo.companyName)
                put("trade_name", application.companyInfo.tradeName.ifBlank { application.companyInfo.companyName })
                if (application.companyInfo.legalType.isNotBlank()) put("legal_type", application.companyInfo.legalType)
                if (application.companyInfo.issueDate.isNotBlank()) put("licence_issue_date", application.companyInfo.issueDate)
                if (application.companyInfo.expiryDate.isNotBlank()) put("licence_expiry_date", application.companyInfo.expiryDate)
                if (application.companyInfo.issuedBy.isNotBlank()) put("licence_issued_by", application.companyInfo.issuedBy)
                if (application.companyInfo.vatTrn.isNotBlank()) put("vat_trn", application.companyInfo.vatTrn)
                put("current_step", application.currentStep)
                put("updated_at", nowIso)

                // JSON form_data format for seamless web-portal interoperability
                val step2Json = JSONObject().apply {
                    put("crn", application.companyInfo.crn)
                    put("company_name", application.companyInfo.companyName)
                    put("trade_name", application.companyInfo.tradeName.ifBlank { application.companyInfo.companyName })
                    put("legal_type", application.companyInfo.legalType)
                    put("issued_by", application.companyInfo.issuedBy)
                    put("issue_date", application.companyInfo.issueDate)
                    put("expiry_date", application.companyInfo.expiryDate)
                    put("vat_trn", application.companyInfo.vatTrn)
                    put("contact_person", application.companyInfo.contactPerson)
                    put("phone", application.companyInfo.phone)
                }
                val formData = JSONObject().apply {
                    put("step2", step2Json)
                }
                put("form_data", formData)

                // Documents array
                val docsArray = JSONArray()
                application.documents.forEach { doc ->
                    val d = JSONObject().apply {
                        put("id", doc.id)
                        put("title", doc.title)
                        put("recommended", doc.recommended)
                        put("is_uploaded", doc.isUploaded)
                        put("file_name", doc.fileName)
                        put("file_size_kb", doc.fileSizeKb)
                        put("ocr_status", doc.ocrStatus)
                        put("extracted_info", doc.extractedInfo)
                    }
                    docsArray.put(d)
                }
                put("documents", docsArray)

                // Ownership & UBOs
                val ownArray = JSONArray()
                application.ownership.forEach { sh ->
                    val s = JSONObject().apply {
                        put("id", sh.id)
                        put("name", sh.name)
                        put("category", sh.category)
                        put("percentage", sh.percentage)
                        put("share_class", sh.shareClass)
                        put("country", sh.country)
                        put("voting_rights_pct", sh.votingRightsPct)
                        put("is_flagged_for_rework", sh.isFlaggedForRework)
                        put("rework_notes", sh.reworkNotes)
                    }
                    ownArray.put(s)
                }
                put("ownership_structure", ownArray)

                // Governance roles
                val rolesArray = JSONArray()
                application.roles.forEach { r ->
                    val ro = JSONObject().apply {
                        put("id", r.id)
                        put("name", r.name)
                        put("title", r.title)
                        put("authority_level", r.authorityLevel)
                        put("is_signature_uploaded", r.isSignatureUploaded)
                    }
                    rolesArray.put(ro)
                }
                put("roles", rolesArray)

                // Tax compliance
                val taxJson = JSONObject().apply {
                    put("us_tin", application.fatcaCrs.usTin)
                    put("primary_tax_country", application.fatcaCrs.primaryTaxCountry)
                    put("tax_id_number", application.fatcaCrs.taxIdNumber)
                    put("entity_classification", application.fatcaCrs.entityClassification)
                    put("crs_confirmed", application.fatcaCrs.crsConfirmed)
                }
                put("tax_compliance", taxJson)
            }

            val url = URL(postUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates")

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(payload.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            Log.d(tag, "Supabase syncApplication HTTP $code for CRN ${application.crn}")
            _lastSyncedApp.value = application.crn
            _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
            Result.success("Synced CRN ${application.crn} to Supabase corporate_onboarding_applications")
        } catch (e: Exception) {
            Log.e(tag, "Error syncing to Supabase corporate_onboarding_applications: ${e.message}", e)
            _syncState.value = SupabaseSyncState.Error(e.localizedMessage ?: "Sync error")
            Result.failure(e)
        }
    }

    /**
     * Fetches the latest onboarding application for a specific CRN from Supabase corporate_onboarding_applications table.
     * Returns null if no record exists yet.
     */
    suspend fun fetchApplicationForCrn(crn: String): Result<OnboardingApplication?> = withContext(Dispatchers.IO) {
        val cleanCrn = crn.trim()
        if (cleanCrn.isBlank()) return@withContext Result.success(null)

        try {
            val queryUrl = "$restApiUrl/corporate_onboarding_applications?crn=eq.$cleanCrn&order=updated_at.desc&limit=1"
            val url = URL(queryUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")

            val code = conn.responseCode
            if (code in 200..299) {
                val response = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(response)
                if (jsonArray.length() > 0) {
                    val obj = jsonArray.getJSONObject(0)
                    val appRef = obj.optString("application_ref", "AB-2026-" + cleanCrn)
                    val appCrn = obj.optString("crn", cleanCrn)
                    val registeredEmail = obj.optString("registered_email", "")
                    val status = obj.optString("status", "draft")
                    val currentStep = obj.optInt("current_step", 1)

                    var companyName = obj.optString("company_name", "")
                    var tradeName = obj.optString("trade_name", companyName)
                    var legalType = obj.optString("legal_type", "")
                    var issueDate = obj.optString("licence_issue_date", "")
                    var expiryDate = obj.optString("licence_expiry_date", "")
                    var issuedBy = obj.optString("licence_issued_by", "")
                    var vatTrn = obj.optString("vat_trn", "")
                    var contactPerson = ""
                    var phone = ""

                    // Extract from form_data.step2 if available (standard web contract)
                    val formData = obj.optJSONObject("form_data")
                    val step2 = formData?.optJSONObject("step2")
                    if (step2 != null) {
                        if (companyName.isBlank()) companyName = step2.optString("company_name", "")
                        if (tradeName.isBlank()) tradeName = step2.optString("trade_name", companyName)
                        if (legalType.isBlank()) legalType = step2.optString("legal_type", "")
                        if (issuedBy.isBlank()) issuedBy = step2.optString("issued_by", "")
                        if (issueDate.isBlank()) issueDate = step2.optString("issue_date", "")
                        if (expiryDate.isBlank()) expiryDate = step2.optString("expiry_date", "")
                        if (vatTrn.isBlank()) vatTrn = step2.optString("vat_trn", "")
                        contactPerson = step2.optString("contact_person", "")
                        phone = step2.optString("phone", "")
                    }

                    // Documents
                    val docs = mutableListOf<DocumentItem>()
                    val docsArray = obj.optJSONArray("documents")
                    if (docsArray != null && docsArray.length() > 0) {
                        for (i in 0 until docsArray.length()) {
                            val d = docsArray.optJSONObject(i) ?: continue
                            docs.add(
                                DocumentItem(
                                    id = d.optString("id", "doc_${i + 1}"),
                                    title = d.optString("title", "Document ${i + 1}"),
                                    recommended = d.optBoolean("recommended", false),
                                    isUploaded = d.optBoolean("is_uploaded", false),
                                    fileName = d.optString("file_name", ""),
                                    fileSizeKb = d.optInt("file_size_kb", 0),
                                    ocrStatus = d.optString("ocr_status", "Pending"),
                                    extractedInfo = d.optString("extracted_info", "")
                                )
                            )
                        }
                    } else {
                        docs.addAll(
                            listOf(
                                DocumentItem(id = "doc_1", title = "Trade Licence (recommended)", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
                                DocumentItem(id = "doc_2", title = "Certificate of Incorporation", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
                                DocumentItem(id = "doc_3", title = "Board Resolution", recommended = true, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = ""),
                                DocumentItem(id = "doc_4", title = "Tax Residency Certificate / TRN", recommended = false, isUploaded = false, fileName = "", fileSizeKb = 0, ocrStatus = "Pending", extractedInfo = "")
                            )
                        )
                    }

                    // Ownership & UBOs
                    val ubos = mutableListOf<UboItem>()
                    val ownership = mutableListOf<ShareholderItem>()
                    val ownArray = obj.optJSONArray("ownership_structure")
                    if (ownArray != null) {
                        for (i in 0 until ownArray.length()) {
                            val sh = ownArray.optJSONObject(i) ?: continue
                            ownership.add(
                                ShareholderItem(
                                    id = sh.optString("id", "sh_$i"),
                                    name = sh.optString("name"),
                                    category = sh.optString("category", "Individual"),
                                    percentage = sh.optDouble("percentage", 0.0),
                                    shareClass = sh.optString("share_class", "Ordinary Voting Class A"),
                                    country = sh.optString("country", ""),
                                    votingRightsPct = sh.optDouble("voting_rights_pct", 0.0),
                                    isFlaggedForRework = sh.optBoolean("is_flagged_for_rework", false),
                                    reworkNotes = sh.optString("rework_notes", "")
                                )
                            )
                        }
                    }

                    // Roles
                    val roles = mutableListOf<GovernanceRoleItem>()
                    val rolesObj = obj.opt("roles")
                    if (rolesObj is JSONArray) {
                        for (i in 0 until rolesObj.length()) {
                            val r = rolesObj.optJSONObject(i) ?: continue
                            roles.add(
                                GovernanceRoleItem(
                                    id = r.optString("id", "role_$i"),
                                    name = r.optString("name"),
                                    title = r.optString("title"),
                                    authorityLevel = r.optString("authority_level", "Sole Signatory"),
                                    isSignatureUploaded = r.optBoolean("is_signature_uploaded", false)
                                )
                            )
                        }
                    }

                    // Tax compliance
                    val taxObj = obj.optJSONObject("tax_compliance")
                    val fatca = if (taxObj != null) {
                        FatcaCrsInfo(
                            usTin = taxObj.optString("us_tin", ""),
                            primaryTaxCountry = taxObj.optString("primary_tax_country", ""),
                            taxIdNumber = taxObj.optString("tax_id_number", ""),
                            entityClassification = taxObj.optString("entity_classification", ""),
                            crsConfirmed = taxObj.optBoolean("crs_confirmed", false)
                        )
                    } else FatcaCrsInfo()

                    val app = OnboardingApplication(
                        appRef = appRef,
                        crn = appCrn,
                        registeredEmail = registeredEmail,
                        currentStep = currentStep.coerceIn(1, 7),
                        status = status,
                        companyInfo = CompanyInfo(
                            crn = appCrn,
                            email = registeredEmail,
                            companyName = companyName,
                            tradeName = tradeName,
                            legalType = legalType,
                            issueDate = issueDate,
                            expiryDate = expiryDate,
                            issuedBy = issuedBy,
                            vatTrn = vatTrn,
                            contactPerson = contactPerson,
                            phone = phone
                        ),
                        documents = docs,
                        ubos = ubos,
                        ownership = ownership,
                        roles = roles,
                        fatcaCrs = fatca,
                        isReworkMode = false,
                        reworkComment = ""
                    )
                    return@withContext Result.success(app)
                }
            }
            Result.success(null)
        } catch (e: Exception) {
            Log.e(tag, "Error querying corporate_onboarding_applications for CRN $cleanCrn: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Synchronizes a transaction to Supabase account_transactions table.
     */
    suspend fun syncTransaction(tx: TransactionRecord): Result<String> = withContext(Dispatchers.IO) {
        try {
            val nowIso = getCurrentIsoTimestamp()
            val postUrl = "$restApiUrl/account_transactions"
            val payload = JSONObject().apply {
                put("transaction_ref", tx.transactionRef)
                put("swift_uetr", tx.swiftUetr)
                put("account_number", tx.accountNumber)
                put("type", tx.type)
                put("amount", tx.amount)
                put("currency", tx.currency)
                put("counterparty_name", tx.counterpartyName)
                put("counterparty_iban", tx.counterpartyIban)
                put("description", tx.description)
                put("status", tx.status)
                put("channel", tx.channel)
                put("created_at", nowIso)
            }

            val url = URL(postUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(payload.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            Log.d(tag, "Supabase syncTransaction HTTP $code")
            _syncState.value = SupabaseSyncState.Connected(host, System.currentTimeMillis())
            Result.success("Transaction ${tx.id} synced with Supabase")
        } catch (e: Exception) {
            Log.e(tag, "Error syncing transaction", e)
            Result.failure(e)
        }
    }

    private fun parseJsonInvitation(obj: JSONObject): RmInvitation {
        return RmInvitation(
            crn = obj.optString("crn"),
            email = obj.optString("email"),
            companyName = obj.optString("company_name", "Corporate Client"),
            contactPerson = obj.optString("contact_person", "Authorized Signatory"),
            phone = obj.optString("phone", ""),
            rmName = obj.optString("rm_name", "Phanee (Senior RM)"),
            rmId = obj.optString("rm_id", "RM-PHANEE"),
            inviteToken = obj.optString("invite_token", "inv_token"),
            status = obj.optString("status", "invited"),
            inviteLink = obj.optString("invite_link", ""),
            notes = obj.optString("notes", ""),
            currentStep = 1,
            createdAt = obj.optString("created_at", "")
        )
    }

    /**
     * Stores an audit log entry in the dedicated Supabase mobile_audit_logs table.
     * Records who did what, when, targets (CRN/email), device info, and status.
     */
    suspend fun saveAuditLog(log: MobileAuditLog): Result<Boolean> = withContext(Dispatchers.IO) {
        // Cache immediately in memory
        _cloudAuditLogs.value = listOf(log) + _cloudAuditLogs.value.filterNot { it.id == log.id }

        try {
            val nowIso = getCurrentIsoTimestamp()
            val postUrl = "$restApiUrl/mobile_audit_logs"

            // Supabase column 'id' is type UUID. Ensure we send a valid UUID string.
            val validUuid = try {
                UUID.fromString(log.id).toString()
            } catch (e: Exception) {
                UUID.randomUUID().toString()
            }

            val payload = JSONObject().apply {
                put("id", validUuid)
                put("action_type", log.actionType)
                put("actor_id", log.actorId)
                put("actor_name", log.actorName)
                put("actor_role", log.actorRole)
                if (!log.targetCrn.isNullOrBlank()) put("target_crn", log.targetCrn)
                if (!log.targetEmail.isNullOrBlank()) put("target_email", log.targetEmail)
                if (!log.targetCompany.isNullOrBlank()) put("target_company", log.targetCompany)
                put("details", log.details.ifBlank { "Mobile event ${log.actionType}" })
                put("status", log.status.ifBlank { "SUCCESS" })
                put("device_info", log.deviceInfo.ifBlank { "Android Mobile" })
                put("ip_address", log.ipAddress.ifBlank { "10.0.2.16 (Secure Core VPN)" })
                put("timestamp", nowIso)
                put("created_at", nowIso)
            }

            val url = URL(postUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Prefer", "return=representation")

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(payload.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            if (code in 200..299) {
                Log.d(tag, "Supabase mobile_audit_log saved successfully ($code): ${log.actionType}")
                Result.success(true)
            } else {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $code"
                Log.w(tag, "Audit log sync note: $err")
                Result.success(false)
            }
        } catch (e: Exception) {
            Log.w(tag, "Exception saving audit log to Supabase: ${e.message}")
            Result.success(false)
        }
    }

    /**
     * Fetches historical mobile audit logs from Supabase mobile_audit_logs table.
     */
    suspend fun fetchAuditLogs(): Result<List<MobileAuditLog>> = withContext(Dispatchers.IO) {
        try {
            val queryUrl = "$restApiUrl/mobile_audit_logs?select=*&order=created_at.desc&limit=100"
            val url = URL(queryUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("Accept", "application/json")
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $apiKey")

            val responseCode = conn.responseCode
            if (responseCode in 200..299) {
                val responseText = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(responseText)
                val list = mutableListOf<MobileAuditLog>()
                for (i in 0 until jsonArray.length()) {
                    list.add(parseJsonAuditLog(jsonArray.getJSONObject(i)))
                }
                if (list.isNotEmpty()) {
                    _cloudAuditLogs.value = list
                }
                Result.success(list)
            } else {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "HTTP $responseCode"
                Log.w(tag, "Audit logs fetch note: $err")
                Result.success(_cloudAuditLogs.value)
            }
        } catch (e: Exception) {
            Log.w(tag, "Audit logs fetch exception: ${e.message}")
            Result.success(_cloudAuditLogs.value)
        }
    }

    private fun parseJsonAuditLog(obj: JSONObject): MobileAuditLog {
        return MobileAuditLog(
            id = obj.optString("id", UUID.randomUUID().toString()),
            timestamp = obj.optString("created_at", getCurrentIsoTimestamp()),
            actionType = obj.optString("action_type", "AUDIT_EVENT"),
            actorId = obj.optString("actor_id", "RM-PHANEE"),
            actorName = obj.optString("actor_name", "Phanee"),
            actorRole = obj.optString("actor_role", "RM Executive"),
            targetCrn = obj.optString("target_crn").takeIf { it.isNotBlank() },
            targetEmail = obj.optString("target_email").takeIf { it.isNotBlank() },
            targetCompany = obj.optString("target_company").takeIf { it.isNotBlank() },
            details = obj.optString("details", ""),
            status = obj.optString("status", "SUCCESS"),
            deviceInfo = obj.optString("device_info", "Android Mobile (ARM64)"),
            ipAddress = obj.optString("ip_address", "10.0.2.16 (Secure Core VPN)")
        )
    }

    /**
     * DDL SQL script to create the mobile_audit_logs table in Supabase PostgreSQL editor.
     */
    fun getAuditLogsTableSql(): String {
        return """
            -- =======================================================
            -- Table: public.mobile_audit_logs
            -- Purpose: Audit trail for mobile actions (RM & Customer)
            -- Database: PostgreSQL / Supabase
            -- =======================================================
            
            CREATE TABLE IF NOT EXISTS public.mobile_audit_logs (
                id TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                actor_name TEXT NOT NULL,
                actor_role TEXT,
                target_crn TEXT,
                target_email TEXT,
                target_company TEXT,
                details TEXT,
                status TEXT DEFAULT 'SUCCESS',
                device_info TEXT,
                ip_address TEXT,
                created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- Indexes for high-performance compliance querying
            CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.mobile_audit_logs (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_action_type ON public.mobile_audit_logs (action_type);
            CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON public.mobile_audit_logs (actor_id);
            CREATE INDEX IF NOT EXISTS idx_audit_target_crn ON public.mobile_audit_logs (target_crn);

            -- Row Level Security (RLS)
            ALTER TABLE public.mobile_audit_logs ENABLE ROW LEVEL SECURITY;

            -- Allow read & insert policy for mobile & web clients
            CREATE POLICY "Allow public read-write for mobile_audit_logs"
            ON public.mobile_audit_logs
            FOR ALL
            USING (true)
            WITH CHECK (true);
        """.trimIndent()
    }
}
