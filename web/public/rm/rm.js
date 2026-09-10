/**
 * First National Bank — Relationship Manager (RM) Executive Suite Client Logic
 * Handles executive authentication, customer invitation dispatch,
 * magic link generation, pipeline tracking, and email previews.
 */

let currentRmToken = localStorage.getItem("fnb_rm_token");
let currentRmProfile = null;
let pipelineData = [];

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    checkRmAuthSession();

    // Auto-dismiss login alerts on input
    const idInput = document.getElementById("rmStaffId");
    const pwdInput = document.getElementById("rmPassword");
    const hideAlert = () => {
        const alertBox = document.getElementById("rmLoginAlert");
        if (alertBox) alertBox.style.display = "none";
    };
    if (idInput) idInput.addEventListener("input", hideAlert);
    if (pwdInput) pwdInput.addEventListener("input", hideAlert);
});

// ── TOAST NOTIFICATIONS ──
function showRmToast(message, type = "success") {
    const container = document.getElementById("rmToastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `rm-toast ${type}`;
    const icon = type === "success" ? "&#x2705;" : (type === "error" ? "&#x274C;" : "&#x2139;");
    toast.innerHTML = `<span style="font-size:16px;">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(40px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ── AUTHENTICATION ──
function checkRmAuthSession() {
    if (currentRmToken) {
        try {
            const cachedProfile = localStorage.getItem("fnb_rm_profile");
            if (cachedProfile) {
                currentRmProfile = JSON.parse(cachedProfile);
                showDashboardView();
                return;
            }
        } catch (e) {}
    }
    showLoginView();
}

function showLoginView() {
    const loginView = document.getElementById("rmLoginView");
    const dashView = document.getElementById("rmDashboardView");
    if (loginView) loginView.style.display = "flex";
    if (dashView) dashView.style.display = "none";
}

function showDashboardView() {
    const loginView = document.getElementById("rmLoginView");
    const dashView = document.getElementById("rmDashboardView");
    if (loginView) loginView.style.display = "none";
    if (dashView) dashView.style.display = "flex";

    if (currentRmProfile) {
        const nameEl = document.getElementById("rmTopName");
        const roleEl = document.getElementById("rmTopRole");
        if (nameEl) nameEl.textContent = currentRmProfile.name || "Phanee";
        if (roleEl) roleEl.textContent = currentRmProfile.role || "Senior Relationship Manager \u00B7 Corporate Banking";
    }

    fetchInvitations();
}

async function handleRmLoginSubmit(ev) {
    ev.preventDefault();
    const staffId = document.getElementById("rmStaffId").value;
    const password = document.getElementById("rmPassword").value;
    const alertBox = document.getElementById("rmLoginAlert");

    try {
        const res = await fetch("/api/v1/rm/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Authentication failed.");
        }

        currentRmToken = data.token;
        currentRmProfile = data.profile;
        localStorage.setItem("fnb_rm_token", currentRmToken);
        localStorage.setItem("fnb_rm_profile", JSON.stringify(currentRmProfile));

        showRmToast(`Executive session authenticated. Welcome back, ${currentRmProfile.name || 'Phanee'}.`, "success");
        showDashboardView();
    } catch (err) {
        if (alertBox) {
            alertBox.className = "rm-alert-box error";
            alertBox.innerHTML = `
                <div style="display:flex;align-items:flex-start;gap:8px;justify-content:space-between;">
                    <div>
                        <strong style="color:#fca5a5;display:block;margin-bottom:2px;font-size:13px;">&#x26A0; Authentication Notice</strong>
                        <span style="color:#e2e8f0;font-size:12px;line-height:1.4;">${err.message}</span>
                    </div>
                    <button type="button" onclick="document.getElementById('rmLoginAlert').style.display='none'" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;">&times;</button>
                </div>
            `;
            alertBox.style.display = "block";
        }
    }
}

function handleRmSignOut() {
    localStorage.removeItem("fnb_rm_token");
    localStorage.removeItem("fnb_rm_profile");
    currentRmToken = null;
    currentRmProfile = null;
    showLoginView();
    showRmToast("RM Executive Session terminated.", "info");
}

// ── CUSTOMER INVITATION DISPATCH ──
async function handleDispatchInvite(ev) {
    ev.preventDefault();

    const crn = document.getElementById("inviteCrn").value.trim();
    const email = document.getElementById("inviteEmail").value.trim();
    const companyName = document.getElementById("inviteCompany").value.trim();
    const contactPerson = document.getElementById("inviteContact").value.trim();
    const phone = document.getElementById("invitePhone").value.trim();
    const notes = document.getElementById("inviteNotes").value.trim();

    const submitBtn = document.getElementById("btnDispatchInvite");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "&#x23F3; Dispatching Invitation &amp; Generating Link&hellip;";
    }

    try {
        const res = await fetch("/api/v1/rm/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                crn,
                email,
                companyName,
                contactPerson,
                phone,
                notes
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to dispatch customer onboarding invitation.");
        }

        // Show Success Box with generated link
        displayGeneratedInvite(data.invitation, data.inviteLink);
        showRmToast(`Invitation dispatched to ${email} for CRN ${crn}.`, "success");

        // Refresh pipeline table
        fetchInvitations();
    } catch (err) {
        showRmToast(err.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "&#x1F680; Dispatch Customer Invitation &amp; Generate Magic Link";
        }
    }
}

function displayGeneratedInvite(invitation, inviteLink) {
    const successCard = document.getElementById("inviteSuccessCard");
    const linkInput = document.getElementById("generatedLinkInput");
    const btnTest = document.getElementById("btnTestCustomerLink");
    const chipCrn = document.getElementById("chipCrn");
    const chipCuid = document.getElementById("chipCuid");
    const chipEmail = document.getElementById("chipEmail");

    if (linkInput) linkInput.value = inviteLink;
    if (btnTest) btnTest.href = inviteLink;
    if (chipCrn) chipCrn.textContent = invitation.crn;
    if (chipCuid) chipCuid.textContent = invitation.company_uid || ('CUID-' + (invitation.crn || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (chipEmail) chipEmail.textContent = invitation.email;

    if (successCard) {
        successCard.style.display = "block";
        successCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function copyGeneratedLink() {
    const input = document.getElementById("generatedLinkInput");
    if (!input || !input.value) return;

    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        showRmToast("Customer Onboarding Magic Link copied to clipboard!", "success");
    }).catch(() => {
        document.execCommand("copy");
        showRmToast("Customer Link copied!", "success");
    });
}

function resetInviteForm() {
    document.getElementById("rmInviteForm").reset();
    const successCard = document.getElementById("inviteSuccessCard");
    if (successCard) successCard.style.display = "none";
}

function focusInviteForm() {
    const section = document.getElementById("dispatchSection");
    if (section) section.scrollIntoView({ behavior: "smooth" });
    const crnInput = document.getElementById("inviteCrn");
    if (crnInput) crnInput.focus();
}

// ── PIPELINE & INVITATIONS TABLE ──
async function fetchInvitations() {
    const tbody = document.getElementById("pipelineTableBody");
    try {
        const res = await fetch("/api/v1/rm/invitations");
        const data = await res.json();
        if (data.success && Array.isArray(data.invitations)) {
            pipelineData = data.invitations;
            renderPipelineTable(pipelineData);
            updatePipelineMetrics(pipelineData);
        }
    } catch (err) {
        console.error("[RM] Failed to load pipeline:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#f87171;padding:24px;">Failed to load live pipeline. Click Refresh to retry.</td></tr>`;
        }
    }
}

function renderPipelineTable(invitations) {
    const tbody = document.getElementById("pipelineTableBody");
    if (!tbody) return;

    if (invitations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:36px; color:var(--rm-text-muted);">
                    No customer invitations found. Use the dispatcher above to issue an onboarding link.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = invitations.map(inv => {
        const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }) : "Recently";

        const statusClass = inv.status === "completed" ? "completed" : 
                           (inv.status === "in_progress" ? "in_progress" : 
                           (inv.status === "review" ? "review" : "invited"));

        const statusLabel = inv.status === "completed" ? "&#x2705; Activated" : 
                           (inv.status === "in_progress" ? "&#x23F3; In Progress" : 
                           (inv.status === "review" ? "&#x1F4CB; In Review" : "&#x2709; Dispatched"));

        const stepText = inv.current_step ? `Step ${inv.current_step} of 7` : "Step 1 of 7";
        const cuid = inv.company_uid || ('CUID-' + (inv.crn || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));

        return `
            <tr>
                <td>
                    <span style="color:#f59e0b; font-family:monospace; font-weight:700; font-size:11.5px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); padding:2px 6px; border-radius:4px;">${cuid}</span>
                </td>
                <td>
                    <strong style="color:#ffffff; font-family:monospace; font-size:13px;">${inv.crn}</strong>
                </td>
                <td>
                    <div style="font-weight:700; color:#ffffff;">${inv.company_name}</div>
                    <div style="font-size:12px; color:var(--rm-text-muted);">&#x1F464; ${inv.contact_person || 'Signatory'}</div>
                </td>
                <td>
                    <span style="color:#93c5fd;">${inv.email}</span>
                    ${inv.phone ? `<div style="font-size:11.5px; color:var(--rm-text-muted);">&#x1F4DE; ${inv.phone}</div>` : ''}
                </td>
                <td>
                    <span style="font-size:12px; font-weight:600; color:#e2e8f0;">${stepText}</span>
                    ${inv.application_ref ? `<div style="font-size:10.5px; color:#38bdf8;">${inv.application_ref}</div>` : ''}
                </td>
                <td>
                    <span class="rm-badge ${statusClass}">${statusLabel}</span>
                </td>
                <td style="color:var(--rm-text-muted); font-size:12px;">
                    ${dateStr}
                </td>
                <td style="text-align:right;">
                    <div class="rm-action-btns">
                        <button class="rm-btn-action" onclick="copySpecificLink('${encodeURIComponent(inv.invite_link)}')" title="Copy Magic Link">
                            &#x1F4CB; Link
                        </button>
                        <a href="${inv.invite_link}" target="_blank" class="rm-btn-action" style="color:#38bdf8;" title="Open Customer Portal">
                            &#x1F680; Portal
                        </a>
                        <button class="rm-btn-action" onclick="openRmAuditModal('${cuid}', '${inv.crn}', '${escapeHtml(inv.company_name || '')}')" style="color:#f59e0b;" title="View Omnichannel Compliance Audit Trail">
                            &#x1F6E1;&#xFE0F; Audit
                        </button>
                        <button class="rm-btn-action" onclick="resendInvite('${inv.crn}', '${inv.email}')" title="Resend Notification Email">
                            &#x2709; Resend
                        </button>
                        <button class="rm-btn-action delete" onclick="deleteInvite('${inv.crn}', '${inv.email}')" title="Revoke Invitation">
                            &#x2715;
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function updatePipelineMetrics(invitations) {
    const total = invitations.length;
    let inProgress = 0;
    let inReview = 0;
    let activated = 0;

    invitations.forEach(inv => {
        if (inv.status === "completed") activated++;
        else if (inv.status === "in_progress") inProgress++;
        else if (inv.status === "review") inReview++;
        else inProgress++; // count newly invited as active pipeline
    });

    const mTotal = document.getElementById("metricTotalInvited");
    const mProg = document.getElementById("metricInProgress");
    const mRev = document.getElementById("metricInReview");
    const mAct = document.getElementById("metricActivated");

    if (mTotal) mTotal.textContent = total;
    if (mProg) mProg.textContent = inProgress;
    if (mRev) mRev.textContent = inReview;
    if (mAct) mAct.textContent = activated;
}

function filterPipelineTable() {
    const searchVal = document.getElementById("pipelineSearch").value.toLowerCase().trim();
    if (!searchVal) {
        renderPipelineTable(pipelineData);
        return;
    }

    const filtered = pipelineData.filter(inv => 
        (inv.crn && inv.crn.toLowerCase().includes(searchVal)) ||
        (inv.email && inv.email.toLowerCase().includes(searchVal)) ||
        (inv.company_name && inv.company_name.toLowerCase().includes(searchVal)) ||
        (inv.contact_person && inv.contact_person.toLowerCase().includes(searchVal)) ||
        (inv.status && inv.status.toLowerCase().includes(searchVal))
    );

    renderPipelineTable(filtered);
}

function copySpecificLink(encodedLink) {
    const link = decodeURIComponent(encodedLink);
    navigator.clipboard.writeText(link).then(() => {
        showRmToast("Customer Link copied to clipboard!", "success");
    }).catch(() => {
        showRmToast("Copied: " + link, "success");
    });
}

async function resendInvite(crn, email) {
    try {
        const res = await fetch(`/api/v1/rm/resend/${encodeURIComponent(crn)}/${encodeURIComponent(email)}`, {
            method: "POST"
        });
        const data = await res.json();
        if (data.success) {
            showRmToast(`Reminder email re-dispatched to ${email}.`, "success");
        } else {
            throw new Error(data.error || "Failed to resend.");
        }
    } catch (err) {
        showRmToast(err.message, "error");
    }
}

async function deleteInvite(crn, email) {
    if (!confirm(`Are you sure you want to revoke the onboarding invitation for CRN ${crn} (${email})?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/v1/rm/invitations/${encodeURIComponent(crn)}/${encodeURIComponent(email)}`, {
            method: "DELETE"
        });
        const data = await res.json();
        if (data.success) {
            showRmToast("Invitation revoked successfully.", "info");
            fetchInvitations();
        } else {
            throw new Error(data.error || "Failed to revoke.");
        }
    } catch (err) {
        showRmToast(err.message, "error");
    }
}

function closeEmailPreview() {
    const modal = document.getElementById("emailPreviewModal");
    if (modal) modal.style.display = "none";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let activeRmAuditTarget = { companyUid: "", crn: "", companyName: "" };

async function openRmAuditModal(companyUid, crn, companyName) {
    activeRmAuditTarget = { companyUid, crn, companyName };
    const modal = document.getElementById("rmAuditModal");
    if (!modal) return;
    modal.style.display = "flex";

    const titleEl = document.getElementById("rmAuditTitle");
    const subEl = document.getElementById("rmAuditSub");
    if (titleEl) titleEl.innerHTML = `Audit Trail: <strong>${escapeHtml(companyName || crn)}</strong> <span style="font-size:12px; color:#f59e0b; font-family:monospace; margin-left:8px;">${companyUid}</span>`;
    if (subEl) subEl.textContent = `Omnichannel immutable telemetry (CRN: ${crn}) mapped across corporate_audit_logs`;

    await refreshRmAudit();
}

function closeRmAuditModal(ev) {
    const modal = document.getElementById("rmAuditModal");
    if (modal) modal.style.display = "none";
}

async function refreshRmAudit() {
    const content = document.getElementById("rmAuditContent");
    const countEl = document.getElementById("rmAuditCount");
    if (!content) return;

    content.innerHTML = `<div style="text-align:center; padding:32px; color:var(--rm-text-muted);">Loading activity and audit history...</div>`;

    try {
        const { companyUid, crn } = activeRmAuditTarget;
        const q = companyUid ? `company_uid=${encodeURIComponent(companyUid)}` : `crn=${encodeURIComponent(crn)}`;
        const res = await fetch(`/api/v1/rm/audit-trail?${q}`);
        const data = await res.json();

        const logs = data.auditTrail || [];
        if (countEl) countEl.textContent = logs.length;
        renderRmAuditTrail(logs);
    } catch (err) {
        content.innerHTML = `<div style="text-align:center; padding:24px; color:#f87171;">Failed to load audit trail: ${escapeHtml(err.message || String(err))}</div>`;
    }
}

function renderRmAuditTrail(logs) {
    const content = document.getElementById("rmAuditContent");
    if (!content) return;

    if (!logs || logs.length === 0) {
        content.innerHTML = `<div style="text-align:center; padding:36px; color:var(--rm-text-muted);">No audit events recorded for this entity yet.</div>`;
        return;
    }

    const actionColors = {
        CUSTOMER_LOGIN: '#38bdf8',
        CUSTOMER_OTP_REQUESTED: '#f59e0b',
        APPLICATION_SAVE: '#10b981',
        APPLICATION_SUBMITTED: '#a855f7',
        STEP_PROGRESSION: '#06b6d4',
        DOCUMENT_UPLOADED: '#ec4899',
        INVITATION_DISPATCHED: '#eab308'
    };

    const tableHtml = `
        <table class="rm-table" style="font-size:12px;">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>Channel</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target / Step</th>
                    <th>Status</th>
                    <th>IP &amp; Device</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(l => {
                    const timeStr = l.timestamp || l.created_at || '';
                    const formatted = timeStr ? new Date(timeStr).toLocaleString('en-GB', {
                        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                    }) : '-';
                    const channelBadge = l.channel === 'mobile' 
                        ? `<span style="background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.3); color:#c084fc; font-weight:600; padding:2px 6px; border-radius:4px; font-size:11px;">📱 Mobile</span>`
                        : `<span style="background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; font-weight:600; padding:2px 6px; border-radius:4px; font-size:11px;">💻 Web</span>`;
                    const color = actionColors[l.action_type] || '#94a3b8';
                    const statusStr = (l.status === 'SUCCESS' || !l.status)
                        ? `<span style="color:#10b981; font-weight:600;">✓ SUCCESS</span>`
                        : `<span style="color:#ef4444; font-weight:600;">✕ ${escapeHtml(l.status)}</span>`;
                    const metaStr = l.metadata ? (typeof l.metadata === 'object' ? Object.entries(l.metadata).map(([k,v]) => `${k}:${v}`).join(', ') : String(l.metadata)) : '';

                    return `
                        <tr>
                            <td style="font-family:monospace; color:#cbd5e1; white-space:nowrap;">${formatted}</td>
                            <td>${channelBadge}</td>
                            <td>
                                <span style="font-weight:700; color:${color}; font-family:monospace;">${escapeHtml(l.action_type || '')}</span>
                                ${metaStr ? `<div style="font-size:10.5px; color:var(--rm-text-muted); max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(metaStr)}">${escapeHtml(metaStr)}</div>` : ''}
                            </td>
                            <td style="color:#e2e8f0; font-family:monospace;">${escapeHtml(l.actor || '-')}</td>
                            <td style="color:var(--rm-text-muted);">${escapeHtml(l.target || l.event_type || '-')}</td>
                            <td>${statusStr}</td>
                            <td style="font-family:monospace; font-size:11px; color:var(--rm-text-muted);">
                                <div>${escapeHtml(l.ip_address || '127.0.0.1')}</div>
                                <div style="font-size:10px; color:#475569; max-width:140px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(l.user_agent || '')}">${escapeHtml((l.user_agent || '').substring(0, 22))}</div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    content.innerHTML = tableHtml;
}
