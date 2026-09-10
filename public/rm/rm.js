/**
 * Apex Bank — Relationship Manager (RM) Executive Suite Client Logic
 * Handles executive authentication, customer invitation dispatch,
 * magic link generation, pipeline tracking, and email previews.
 */

let currentRmToken = localStorage.getItem("apex_rm_token");
let currentRmProfile = null;
let pipelineData = [];

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    checkRmAuthSession();
});

// ── TOAST NOTIFICATIONS ──
function showRmToast(message, type = "success") {
    const container = document.getElementById("rmToastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `rm-toast ${type}`;
    const icon = type === "success" ? "✅" : (type === "error" ? "❌" : "ℹ️");
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
            const cachedProfile = localStorage.getItem("apex_rm_profile");
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
        if (nameEl) nameEl.textContent = currentRmProfile.name || "Sarah Al-Qassimi";
        if (roleEl) roleEl.textContent = currentRmProfile.role || "Senior VP · Corporate Banking";
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
        localStorage.setItem("apex_rm_token", currentRmToken);
        localStorage.setItem("apex_rm_profile", JSON.stringify(currentRmProfile));

        showRmToast("Executive authentication verified. Welcome back.", "success");
        showDashboardView();
    } catch (err) {
        if (alertBox) {
            alertBox.className = "rm-alert-box error";
            alertBox.textContent = err.message;
            alertBox.style.display = "block";
        }
    }
}

function quickDemoRmLogin() {
    document.getElementById("rmStaffId").value = "RM-ADGM-9042";
    document.getElementById("rmPassword").value = "ApexRM2026!";
    const form = document.getElementById("rmLoginForm");
    if (form) form.requestSubmit();
}

function handleRmSignOut() {
    localStorage.removeItem("apex_rm_token");
    localStorage.removeItem("apex_rm_profile");
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
        submitBtn.innerHTML = "⏳ Dispatching Invitation &amp; Generating Link…";
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
            submitBtn.innerHTML = "🚀 Dispatch Customer Invitation &amp; Generate Magic Link";
        }
    }
}

function displayGeneratedInvite(invitation, inviteLink) {
    const successCard = document.getElementById("inviteSuccessCard");
    const linkInput = document.getElementById("generatedLinkInput");
    const btnTest = document.getElementById("btnTestCustomerLink");
    const chipCrn = document.getElementById("chipCrn");
    const chipEmail = document.getElementById("chipEmail");

    if (linkInput) linkInput.value = inviteLink;
    if (btnTest) btnTest.href = inviteLink;
    if (chipCrn) chipCrn.textContent = invitation.crn;
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
                <td colspan="7" style="text-align:center; padding:36px; color:var(--rm-text-muted);">
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

        const statusLabel = inv.status === "completed" ? "✅ Activated" : 
                           (inv.status === "in_progress" ? "⏳ In Progress" : 
                           (inv.status === "review" ? "📋 In Review" : "✉️ Dispatched"));

        const stepText = inv.current_step ? `Step ${inv.current_step} of 7` : "Step 1 of 7";

        return `
            <tr>
                <td>
                    <strong style="color:#ffffff; font-family:monospace; font-size:13px;">${inv.crn}</strong>
                </td>
                <td>
                    <div style="font-weight:700; color:#ffffff;">${inv.company_name}</div>
                    <div style="font-size:12px; color:var(--rm-text-muted);">👤 ${inv.contact_person || 'Signatory'}</div>
                </td>
                <td>
                    <span style="color:#93c5fd;">${inv.email}</span>
                    ${inv.phone ? `<div style="font-size:11.5px; color:var(--rm-text-muted);">📞 ${inv.phone}</div>` : ''}
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
                            📋 Link
                        </button>
                        <a href="${inv.invite_link}" target="_blank" class="rm-btn-action" style="color:#38bdf8;" title="Open Customer Portal">
                            🚀 Portal
                        </a>
                        <button class="rm-btn-action" onclick="resendInvite('${inv.crn}', '${inv.email}')" title="Resend Notification Email">
                            ✉️ Resend
                        </button>
                        <button class="rm-btn-action delete" onclick="deleteInvite('${inv.crn}', '${inv.email}')" title="Revoke Invitation">
                            ✕
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
