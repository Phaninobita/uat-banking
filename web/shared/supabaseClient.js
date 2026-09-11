/**
 * First National Bank — Supabase Cloud Database Client
 * Direct, authenticated REST client connecting Node.js backend with Supabase PostgreSQL.
 * Provides resilient persistence for corporate onboarding applications, customer invitations,
 * Base64 document storage, corporate accounts, and audit ledgers.
 */

const https = require("https");
const { URL } = require("url");
const crypto = require("crypto");
const config = require("./config");

class SupabaseClient {
  constructor() {
    this.baseUrl = (config.SUPABASE_URL || "https://uvfdokzjdwwjpsxuuyey.supabase.co").replace(/\/+$/, "");
    this.apiKey = config.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZmRva3pqZHd3anBzeHV1eWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Mzg2ODksImV4cCI6MjEwNDUxNDY4OX0.UC9bUPOPewtuJLZhuKCaxADoC5Qaqxvl0sY_iLzjHaA";
    this.projectHost = new URL(this.baseUrl).hostname;
    this.isOperational = false;
  }

  /**
   * Performs an authenticated HTTPS request against the Supabase PostgREST API
   */
  async request(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = {
      "apikey": this.apiKey,
      "Authorization": `Bearer ${this.apiKey}`,
      "Accept": "application/json",
      ...(options.headers || {})
    };

    let bodyData = null;
    if (options.body !== undefined && options.body !== null) {
      bodyData = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyData);
    }

    const fullPath = path.startsWith("/rest/v1") ? path : `/rest/v1/${path.replace(/^\/+/, "")}`;

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: this.projectHost,
          path: fullPath,
          method,
          headers,
          timeout: options.timeout || 12000
        },
        (res) => {
          let rawData = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            rawData += chunk;
          });
          res.on("end", () => {
            const statusCode = res.statusCode;
            let parsed = null;
            if (rawData && rawData.trim().length > 0) {
              try {
                parsed = JSON.parse(rawData);
              } catch (e) {
                parsed = rawData;
              }
            }

            if (statusCode >= 200 && statusCode < 300) {
              resolve({ statusCode, data: parsed, headers: res.headers });
            } else if (statusCode === 404) {
              resolve({ statusCode: 404, data: null, notFound: true });
            } else {
              const errMsg = (parsed && (parsed.message || parsed.error || parsed.details)) || `Supabase REST error HTTP ${statusCode}`;
              const err = new Error(errMsg);
              err.statusCode = statusCode;
              err.responseBody = parsed;
              reject(err);
            }
          });
        }
      );

      req.on("error", (err) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy(new Error(`Supabase request timed out after ${options.timeout || 12000}ms`));
      });

      if (bodyData) {
        req.write(bodyData);
      }
      req.end();
    });
  }

  /**
   * Health ping to check connectivity with Supabase Cloud
   */
  async ping() {
    try {
      const res = await this.request("rm_customer_invitations?limit=1", { method: "GET" });
      this.isOperational = res.statusCode >= 200 && res.statusCode < 300;
      return this.isOperational;
    } catch (e) {
      this.isOperational = false;
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIP MANAGER INVITATIONS (rm_customer_invitations)
  // ══════════════════════════════════════════════════════════════════════════

  async saveInvitation(invite) {
    const crn = (invite.crn || "").trim().toUpperCase();
    const email = (invite.email || "").trim().toLowerCase();
    const nowIso = new Date().toISOString();

    const record = {
      crn,
      email,
      company_name: (invite.company_name || invite.companyName || "").trim(),
      contact_person: (invite.contact_person || invite.contactPerson || "Authorized Signatory").trim(),
      phone: (invite.phone || "").trim(),
      rm_name: invite.rm_name || invite.rmName || "Phanee (Senior Relationship Manager)",
      rm_id: invite.rm_id || invite.rmId || "RM-PHANEE",
      invite_token: invite.invite_token || invite.inviteToken || ("inv_" + crypto.randomBytes(12).toString("hex")),
      status: invite.status || "invited",
      invite_link: invite.invite_link || invite.inviteLink || `https://phanee.up.railway.app/?crn=${encodeURIComponent(crn)}&email=${encodeURIComponent(email)}`,
      notes: (invite.notes || "").trim(),
      company_uid: (invite.company_uid || `CUID-${crn.replace(/[^A-Z0-9]/g, "")}`).toUpperCase(),
      current_step: invite.current_step || 1,
      updated_at: nowIso
    };

    const res = await this.request("rm_customer_invitations?on_conflict=crn,email", {
      method: "POST",
      headers: {
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: record
    });

    return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : record;
  }

  async getInvitation(crn, email) {
    if (!crn || !email) return null;
    const cleanCrn = encodeURIComponent(crn.trim().toUpperCase());
    const cleanEmail = encodeURIComponent(email.trim().toLowerCase());

    const res = await this.request(`rm_customer_invitations?crn=eq.${cleanCrn}&email=eq.${cleanEmail}&select=*&limit=1`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  async getInvitationByCrn(crn) {
    if (!crn) return null;
    const cleanCrn = encodeURIComponent(crn.trim().toUpperCase());
    const res = await this.request(`rm_customer_invitations?crn=eq.${cleanCrn}&select=*&limit=1`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  async listInvitations() {
    const res = await this.request("rm_customer_invitations?select=*&order=created_at.desc");
    return Array.isArray(res.data) ? res.data : [];
  }

  async deleteInvitation(crn, email) {
    if (!crn || !email) return false;
    const cleanCrn = encodeURIComponent(crn.trim().toUpperCase());
    const cleanEmail = encodeURIComponent(email.trim().toLowerCase());
    await this.request(`rm_customer_invitations?crn=eq.${cleanCrn}&email=eq.${cleanEmail}`, {
      method: "DELETE"
    });
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CORPORATE ONBOARDING APPLICATIONS (corporate_onboarding_applications)
  // ══════════════════════════════════════════════════════════════════════════

  async saveApplication(app) {
    const nowIso = new Date().toISOString();
    const application_ref = app.application_ref;
    if (!application_ref) {
      throw new Error("application_ref is required to save an application.");
    }

    const payload = {
      application_ref,
      crn: (app.crn || "").trim(),
      company_uid: (app.company_uid || `CUID-${(app.crn || "").replace(/[^A-Z0-9]/gi, "")}`).toUpperCase(),
      registered_email: (app.registered_email || app.email || "").trim().toLowerCase(),
      current_step: typeof app.current_step === "number" ? app.current_step : 1,
      status: app.status || "draft",
      company_name: app.company_name || app.companyName || null,
      trade_name: app.trade_name || app.tradeName || app.company_name || null,
      legal_type: app.legal_type || app.legalType || null,
      licence_issue_date: app.licence_issue_date || null,
      licence_expiry_date: app.licence_expiry_date || null,
      licence_issued_by: app.licence_issued_by || null,
      vat_trn: app.vat_trn || null,
      contact_person: app.contact_person || null,
      phone: app.phone || null,
      form_data: app.form_data || {},
      updated_at: nowIso
    };

    const res = await this.request("corporate_onboarding_applications?on_conflict=application_ref", {
      method: "POST",
      headers: {
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: payload
    });

    return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : payload;
  }

  async updateApplication(application_ref, updates) {
    if (!application_ref) throw new Error("application_ref is required to update application.");
    const cleanRef = encodeURIComponent(application_ref.trim());
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const res = await this.request(`corporate_onboarding_applications?application_ref=eq.${cleanRef}`, {
      method: "PATCH",
      headers: {
        "Prefer": "return=representation"
      },
      body: payload
    });

    return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
  }

  async getApplication(application_ref) {
    if (!application_ref) return null;
    const cleanRef = encodeURIComponent(application_ref.trim());
    const res = await this.request(`corporate_onboarding_applications?application_ref=eq.${cleanRef}&select=*&limit=1`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  async getApplicationByCrnAndEmail(crn, email) {
    if (!crn || !email) return null;
    const cleanCrn = encodeURIComponent(crn.trim());
    const cleanEmail = encodeURIComponent(email.trim().toLowerCase());
    const res = await this.request(`corporate_onboarding_applications?crn=eq.${cleanCrn}&registered_email=eq.${cleanEmail}&select=*&limit=1`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  async getApplicationByUid(company_uid) {
    if (!company_uid) return null;
    const cleanUid = encodeURIComponent(company_uid.trim().toUpperCase());
    const res = await this.request(`corporate_onboarding_applications?company_uid=eq.${cleanUid}&select=*&limit=1`);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  async listApplications(filter = {}) {
    let query = "corporate_onboarding_applications?select=*&order=created_at.desc";
    if (filter.current_step_gte) {
      query += `&current_step=gte.${filter.current_step_gte}`;
    }
    const res = await this.request(query);
    return Array.isArray(res.data) ? res.data : [];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // APPLICATION DOCUMENTS (application_documents)
  // ══════════════════════════════════════════════════════════════════════════

  async saveDocument(doc) {
    const {
      application_ref,
      company_uid,
      document_type,
      file_name,
      file_type,
      file_size,
      file_data_base64,
      ocr_status
    } = doc;

    const cleanRef = encodeURIComponent(application_ref);
    const cleanType = encodeURIComponent(document_type);

    // Check if doc of this type already exists for application
    const checkRes = await this.request(`application_documents?application_ref=eq.${cleanRef}&document_type=eq.${cleanType}&select=id&limit=1`);
    const existing = checkRes.data && Array.isArray(checkRes.data) && checkRes.data.length > 0 ? checkRes.data[0] : null;

    const payload = {
      application_ref,
      company_uid: (company_uid || "CUID-CORPORATE").toUpperCase(),
      document_type,
      file_name,
      file_type: file_type || "application/pdf",
      file_size: file_size || (file_data_base64 ? file_data_base64.length : 0),
      file_data_base64,
      ocr_status: ocr_status || "stored",
      updated_at: new Date().toISOString()
    };

    if (existing && existing.id) {
      const updateRes = await this.request(`application_documents?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: payload
      });
      return Array.isArray(updateRes.data) && updateRes.data.length > 0 ? updateRes.data[0] : { id: existing.id, ...payload };
    } else {
      const insertRes = await this.request("application_documents", {
        method: "POST",
        headers: { "Prefer": "return=representation" },
        body: payload
      });
      return Array.isArray(insertRes.data) && insertRes.data.length > 0 ? insertRes.data[0] : payload;
    }
  }

  async listDocuments(application_ref) {
    if (!application_ref) return [];
    const cleanRef = encodeURIComponent(application_ref.trim());
    const res = await this.request(
      `application_documents?application_ref=eq.${cleanRef}&select=*&order=created_at.desc`
    );
    return Array.isArray(res.data) ? res.data : [];
  }

  async getDocument(id, application_ref) {
    let query = `application_documents?id=eq.${id}&select=*&limit=1`;
    if (application_ref) {
      query = `application_documents?id=eq.${id}&application_ref=eq.${encodeURIComponent(application_ref)}&select=*&limit=1`;
    }
    const res = await this.request(query);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  async deleteDocument(id, application_ref) {
    let query = `application_documents?id=eq.${id}`;
    if (application_ref) {
      query += `&application_ref=eq.${encodeURIComponent(application_ref)}`;
    }
    await this.request(query, { method: "DELETE" });
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE AUDIT LOGS (corporate_audit_logs & mobile_audit_logs)
  // ══════════════════════════════════════════════════════════════════════════

  async logAudit(logRecord) {
    const id = logRecord.id || ("aud_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"));
    const nowIso = new Date().toISOString();

    const record = {
      id,
      company_uid: logRecord.company_uid || null,
      action_type: (logRecord.action_type || "ACTION").toUpperCase(),
      actor_id: (logRecord.actor_id || logRecord.actor || "corporate_user").toString(),
      actor_name: logRecord.actor_name || "Authorized Signatory",
      actor_role: logRecord.actor_role || "Corporate User",
      target_crn: logRecord.target_crn || logRecord.crn || null,
      target_email: logRecord.target_email || null,
      target_company: logRecord.target_company || null,
      details: logRecord.details || "",
      status: logRecord.status || "SUCCESS",
      device_info: logRecord.device_info || logRecord.user_agent || "Web Portal",
      ip_address: logRecord.ip_address || "127.0.0.1",
      channel: logRecord.channel || "web",
      created_at: nowIso
    };

    // 1. Write to corporate_audit_logs
    try {
      await this.request("corporate_audit_logs", {
        method: "POST",
        headers: { "Prefer": "return=minimal" },
        body: record
      });
    } catch (e) {
      console.warn("[SUPABASE] corporate_audit_logs insert notice:", e.message);
    }

    // 2. Mirror to mobile_audit_logs for mobile app synchronization
    try {
      const mobileRecord = {
        id,
        company_uid: record.company_uid,
        action_type: record.action_type,
        actor_id: record.actor_id,
        actor_name: record.actor_name,
        actor_role: record.actor_role,
        target_crn: record.target_crn,
        target_email: record.target_email,
        target_company: record.target_company,
        details: record.details,
        status: record.status,
        device_info: record.device_info,
        ip_address: record.ip_address,
        channel: record.channel,
        created_at: nowIso,
        timestamp: nowIso
      };
      await this.request("mobile_audit_logs", {
        method: "POST",
        headers: { "Prefer": "return=minimal" },
        body: mobileRecord
      });
    } catch (e) {
      // ignore
    }

    return record;
  }

  async getAuditLogs(company_uid, crn, limit = 100) {
    let query = `corporate_audit_logs?select=*&order=created_at.desc&limit=${limit}`;
    if (company_uid && crn) {
      const cleanUid = encodeURIComponent(company_uid.trim().toUpperCase());
      const cleanCrn = encodeURIComponent(crn.trim());
      query += `&or=(company_uid.eq.${cleanUid},target_crn.eq.${cleanCrn})`;
    } else if (company_uid) {
      query += `&company_uid=eq.${encodeURIComponent(company_uid.trim().toUpperCase())}`;
    } else if (crn) {
      query += `&target_crn=eq.${encodeURIComponent(crn.trim())}`;
    }

    try {
      const res = await this.request(query);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      console.warn("[SUPABASE] getAuditLogs notice:", e.message);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CORE BANKING ACCOUNTS & TRANSACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  async getAccounts(company_uid) {
    if (!company_uid) return [];
    const cleanUid = encodeURIComponent(company_uid.trim().toUpperCase());
    try {
      const res = await this.request(`corporate_accounts?company_uid=eq.${cleanUid}&select=*`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      return [];
    }
  }

  async getTransactions(account_number) {
    if (!account_number) return [];
    const cleanAcc = encodeURIComponent(account_number.trim());
    try {
      const res = await this.request(`account_transactions?account_number=eq.${cleanAcc}&select=*&order=created_at.desc`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7-STAGE NORMALIZED ONBOARDING STAGES (Keyed on company_uid)
  // ══════════════════════════════════════════════════════════════════════════

  async saveCompanyProfile(profile) {
    if (!profile || !profile.company_uid) return null;
    const cleanUid = profile.company_uid.trim().toUpperCase();
    const payload = { ...profile, company_uid: cleanUid, updated_at: new Date().toISOString() };
    try {
      const res = await this.request("onboarding_company_profiles?on_conflict=company_uid", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: payload
      });
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : payload;
    } catch (e) {
      return payload;
    }
  }

  async getCompanyProfile(companyUid) {
    if (!companyUid) return null;
    const cleanUid = encodeURIComponent(companyUid.trim().toUpperCase());
    try {
      const res = await this.request(`onboarding_company_profiles?company_uid=eq.${cleanUid}&select=*&limit=1`);
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    } catch (e) {
      return null;
    }
  }

  async saveUbos(companyUid, ubos) {
    if (!companyUid) return [];
    const cleanUid = companyUid.trim().toUpperCase();
    const list = Array.isArray(ubos) ? ubos : (ubos ? [ubos] : []);
    const payload = list.map(u => ({
      ...u,
      company_uid: cleanUid,
      updated_at: new Date().toISOString()
    }));
    try {
      const res = await this.request("onboarding_ubos_signatories", {
        method: "POST",
        headers: { "Prefer": "return=representation" },
        body: payload
      });
      return Array.isArray(res.data) ? res.data : payload;
    } catch (e) {
      return payload;
    }
  }

  async getUbos(companyUid) {
    if (!companyUid) return [];
    const cleanUid = encodeURIComponent(companyUid.trim().toUpperCase());
    try {
      const res = await this.request(`onboarding_ubos_signatories?company_uid=eq.${cleanUid}&select=*`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      return [];
    }
  }

  async saveOwnershipStructure(structure) {
    if (!structure || !structure.company_uid) return null;
    const cleanUid = structure.company_uid.trim().toUpperCase();
    const payload = { ...structure, company_uid: cleanUid, updated_at: new Date().toISOString() };
    try {
      const res = await this.request("onboarding_ownership_structures?on_conflict=company_uid", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: payload
      });
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : payload;
    } catch (e) {
      return payload;
    }
  }

  async getOwnershipStructure(companyUid) {
    if (!companyUid) return null;
    const cleanUid = encodeURIComponent(companyUid.trim().toUpperCase());
    try {
      const res = await this.request(`onboarding_ownership_structures?company_uid=eq.${cleanUid}&select=*&limit=1`);
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    } catch (e) {
      return null;
    }
  }

  async saveGovernanceMandates(mandates) {
    if (!mandates || !mandates.company_uid) return null;
    const cleanUid = mandates.company_uid.trim().toUpperCase();
    const payload = { ...mandates, company_uid: cleanUid, updated_at: new Date().toISOString() };
    try {
      const res = await this.request("onboarding_governance_mandates?on_conflict=company_uid", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: payload
      });
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : payload;
    } catch (e) {
      return payload;
    }
  }

  async getGovernanceMandates(companyUid) {
    if (!companyUid) return null;
    const cleanUid = encodeURIComponent(companyUid.trim().toUpperCase());
    try {
      const res = await this.request(`onboarding_governance_mandates?company_uid=eq.${cleanUid}&select=*&limit=1`);
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    } catch (e) {
      return null;
    }
  }

  async saveTaxCompliance(tax) {
    if (!tax || !tax.company_uid) return null;
    const cleanUid = tax.company_uid.trim().toUpperCase();
    const payload = { ...tax, company_uid: cleanUid, updated_at: new Date().toISOString() };
    try {
      const res = await this.request("onboarding_tax_compliance?on_conflict=company_uid", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: payload
      });
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : payload;
    } catch (e) {
      return payload;
    }
  }

  async getTaxCompliance(companyUid) {
    if (!companyUid) return null;
    const cleanUid = encodeURIComponent(companyUid.trim().toUpperCase());
    try {
      const res = await this.request(`onboarding_tax_compliance?company_uid=eq.${cleanUid}&select=*&limit=1`);
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    } catch (e) {
      return null;
    }
  }

  async saveDeclarations(decl) {
    if (!decl || !decl.company_uid) return null;
    const cleanUid = decl.company_uid.trim().toUpperCase();
    const payload = { ...decl, company_uid: cleanUid, updated_at: new Date().toISOString() };
    try {
      const res = await this.request("onboarding_declarations_signatures?on_conflict=company_uid", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: payload
      });
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : payload;
    } catch (e) {
      return payload;
    }
  }

  async getDeclarations(companyUid) {
    if (!companyUid) return null;
    const cleanUid = encodeURIComponent(companyUid.trim().toUpperCase());
    try {
      const res = await this.request(`onboarding_declarations_signatures?company_uid=eq.${cleanUid}&select=*&limit=1`);
      return Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    } catch (e) {
      return null;
    }
  }
}

const supabaseClient = new SupabaseClient();
module.exports = supabaseClient;
