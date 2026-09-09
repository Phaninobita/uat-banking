/**
 * Vision Bank Corporate Account Portal — Main Application Logic
 * Comprehensive state management, non-destructive navigation, OCR extraction, and multi-step persistence.
 */

// ── GLOBAL APPLICATION STATE ──
let currentStep = 1;
const totalSteps = 7;
const stepProgress = [0, 14, 28, 43, 57, 71, 86, 100];
let currentLoginCrn = '';
let currentLoginEmail = '';
let currentAppRef = null;
let isReworkMode = false;
let uboCount = 0;
let uploadBoxCount = 1;
let extractedEntities = [];
let autoSaveTimer = null;
let cachedOwnershipRows = [];
let cachedRoleSelections = null;
let cachedTaxSelections = null;

// ── TOAST NOTIFICATION SYSTEM ──
function showToast(message, title = 'Notification', type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return null;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    toast.innerHTML = `
        <div class="toast-icon" aria-hidden="true">${icons[type] || 'ℹ️'}</div>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').classList.add('removing');setTimeout(()=>this.closest('.toast').remove(),300)" aria-label="Dismiss notification">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
    return toast;
}

// ── NETWORK STATUS DETECTION ──
function updateNetworkStatus() {
    const status = document.getElementById('networkStatus');
    const icon = document.getElementById('networkIcon');
    const text = document.getElementById('networkText');
    if (!status || !icon || !text) return;
    if (navigator.onLine) {
        status.className = 'online';
        status.style.display = 'flex';
        icon.textContent = '●';
        text.textContent = 'Online';
        status.style.color = 'var(--toast-success)';
    } else {
        status.className = 'offline';
        status.style.display = 'flex';
        icon.textContent = '●';
        text.textContent = 'Offline — Working locally';
        status.style.color = 'var(--toast-error)';
        showToast('You are offline. Application changes will sync when reconnected.', 'Offline Mode', 'warning', 5000);
    }
}
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// ── FLOATING PARTICLES ──
function initParticles() {
    const container = document.getElementById('particleContainer');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 5 + 2;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 8 + 6) + 's';
        p.style.animationDelay = (Math.random() * 8) + 's';
        container.appendChild(p);
    }
}

// ── THEME INITIALIZATION ──
function initTheme() {
    const stored = localStorage.getItem('vb-theme');
    const themeBtn = document.getElementById('themeToggle');
    if (stored === 'dark') {
        document.body.classList.add('dark');
        if (themeBtn) themeBtn.textContent = '☀️ Light';
    } else {
        document.body.classList.remove('dark');
        if (themeBtn) themeBtn.textContent = '🌙 Dark';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const themeBtn = document.getElementById('themeToggle');
    if (isDark) {
        localStorage.setItem('vb-theme', 'dark');
        if (themeBtn) themeBtn.textContent = '☀️ Light';
    } else {
        localStorage.setItem('vb-theme', 'light');
        if (themeBtn) themeBtn.textContent = '🌙 Dark';
    }
}

// ── REWORK MODE STATE ──
const reworkDocLabels = [
    "Updated Trade Licence (valid until 2027)",
    "Proof of Funds / Bank Statement",
    "Updated Certificate of Incorporation",
    "Passport Copy of New UBO"
];

function toggleReworkMode() {
    isReworkMode = !isReworkMode;
    const btn = document.getElementById('reworkToggle');
    const banner = document.getElementById('reworkBanner');
    const submitBtn = document.getElementById('finalSubmitBtn');

    if (isReworkMode) {
        if (btn) { btn.classList.add('active'); btn.innerHTML = '🔁 <span class="tt-label">Exit Rework</span>'; }
        if (banner) banner.classList.add('active');
        if (submitBtn) submitBtn.textContent = '✓ Resubmit for Review';

        document.querySelectorAll('.step-pill').forEach((el, i) => {
            if (i + 1 !== 4 && i + 1 !== 7) el.classList.add('rework-disabled');
            else el.classList.remove('rework-disabled');
        });

        const notif = document.getElementById('reworkNotification');
        if (notif) notif.classList.add('slide-in');
        showToast('Rework mode activated. Step 4 is unlocked for correction.', 'Rework Mode', 'warning', 4000);

        if (currentStep !== 4 && currentStep !== 7) goTo(4);
        else if (currentStep === 4) renderOwnershipErrors();
    } else {
        if (btn) { btn.classList.remove('active'); btn.innerHTML = '🔁 <span class="tt-label">Simulate Rework</span>'; }
        if (banner) banner.classList.remove('active');
        if (submitBtn) submitBtn.textContent = '✓ Submit Application';

        document.querySelectorAll('.step-pill').forEach(el => el.classList.remove('rework-disabled'));
        document.querySelectorAll('.rework-error').forEach(el => el.classList.remove('rework-error'));
        document.querySelectorAll('.error-note').forEach(el => el.remove());

        if (currentStep === 4) renderOwnershipErrors();
        showToast('Rework mode deactivated.', 'Rework Mode', 'info', 3000);
    }
}

function renderOwnershipErrors() {
    document.querySelectorAll('.rework-error').forEach(el => el.classList.remove('rework-error'));
    document.querySelectorAll('.error-note').forEach(el => el.remove());

    if (isReworkMode) {
        const inputs = document.querySelectorAll('#struct-rows .struct-row input[type="number"]');
        if (inputs.length > 0) {
            inputs[0].classList.add('rework-error');
            const parent = inputs[0].parentElement;
            const error = document.createElement('div');
            error.className = 'error-note';
            error.innerHTML = '❌ RM Note: Ownership percentage must not exceed 60% for Corporate entities.';
            parent.appendChild(error);
        }
    }
}

// ── NAVIGATION & STEPPER (FAST & NON-DESTRUCTIVE) ──
function goTo(step) {
    if (step < 1 || step > totalSteps) return;
    if (isReworkMode && step !== 4 && step !== 7) {
        const notif = document.getElementById('reworkNotification');
        if (notif) notif.classList.add('slide-in');
        showToast('Only Step 4 and Review are editable in rework mode.', 'Rework Mode', 'warning', 3000);
        return;
    }

    // Cache current step state before leaving
    captureCurrentStepState(currentStep);

    // Snappy loader for visual feedback (150ms instead of 2000ms delay)
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('active');

    setTimeout(() => {
        const prevScreen = document.getElementById('sc-' + currentStep);
        const nextScreen = document.getElementById('sc-' + step);

        if (prevScreen) prevScreen.classList.remove('active');
        if (nextScreen) nextScreen.classList.add('active');

        document.querySelectorAll('.step-pill').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i + 1 < step) el.classList.add('done');
            if (i + 1 === step) el.classList.add('active');
        });

        currentStep = step;
        const hdrLabel = document.getElementById('hdr-step-label');
        if (hdrLabel) hdrLabel.textContent = `Step ${step} of ${totalSteps}`;

        const progFill = document.getElementById('progFill');
        const progPct = document.getElementById('progPct');
        if (progFill) progFill.style.width = stepProgress[step] + '%';
        if (progPct) progPct.textContent = stepProgress[step] + '%';

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Step-specific initializers with state preservation
        if (step === 2) {
            const crnField = document.getElementById('step2_crn');
            if (crnField && !crnField.value && currentLoginCrn) {
                crnField.value = currentLoginCrn;
            }
        } else if (step === 4) {
            renderStep4();
            if (isReworkMode) renderOwnershipErrors();
        } else if (step === 5) {
            renderRoleTables();
            populateMakerCheckerRoles();
        } else if (step === 6) {
            initFATCA_CRS_States();
        } else if (step === 7) {
            updateReviewSection();
        }

        if (loader) loader.classList.remove('active');
        triggerAutoSave();
    }, 150);
}

// ── STATE CACHING ON STEP EXIT ──
function captureCurrentStepState(step) {
    if (step === 4) {
        // Cache ownership rows
        const rows = [];
        document.querySelectorAll('#struct-rows .struct-row').forEach(row => {
            const lvlSelect = row.querySelector('select[id^="level-"]');
            const entSelect = row.querySelector('select[id^="entity-select-"]');
            const pctInput = row.querySelector('input[type="number"]');
            if (entSelect && pctInput) {
                rows.push({
                    level: lvlSelect ? lvlSelect.value : '1',
                    entity: entSelect.value,
                    percentage: pctInput.value
                });
            }
        });
        if (rows.length > 0) cachedOwnershipRows = rows;
    } else if (step === 5) {
        // Cache role checkboxes
        const makerSel = document.getElementById('maker-select');
        const checkerSel = document.getElementById('checker-select');
        const govStates = [];
        document.querySelectorAll('#govTableBody tr').forEach(tr => {
            const boxes = tr.querySelectorAll('input[type="checkbox"]');
            govStates.push(Array.from(boxes).map(b => b.checked));
        });
        const sysStates = [];
        document.querySelectorAll('#sysTableBody tr').forEach(tr => {
            const boxes = tr.querySelectorAll('input[type="checkbox"]');
            sysStates.push(Array.from(boxes).map(b => b.checked));
        });
        cachedRoleSelections = {
            maker: makerSel ? makerSel.value : '',
            checker: checkerSel ? checkerSel.value : '',
            govStates,
            sysStates
        };
    } else if (step === 6) {
        const usYesBtn = document.querySelector('#fatca-us-person-tog .tog-btn:first-child');
        const crsYesBtn = document.querySelector('#crs-fi-tog .tog-btn:first-child');
        const fatcaClass = document.getElementById('fatca-entity-class');
        cachedTaxSelections = {
            usPerson: usYesBtn ? usYesBtn.classList.contains('on') : false,
            fatcaClass: fatcaClass ? fatcaClass.value : '',
            crsFi: crsYesBtn ? crsYesBtn.classList.contains('on') : false
        };
    }
}

// ── STEP 1: DOCUMENT UPLOADS ──
function triggerUpload(id) {
    const el = document.getElementById(id);
    if (el) el.click();
}

function allowDrop(e) {
    e.preventDefault();
}

function handleFileDrop(e, cardId, inputId) {
    e.preventDefault();
    const input = document.getElementById(inputId);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && input) {
        input.files = e.dataTransfer.files;
        markUploaded(cardId, input);
    }
}

function markUploaded(cardId, input) {
    if (!cardId) return;
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.add('uploaded');
    const statusEl = card.querySelector('.file-status');
    if (statusEl && input.files && input.files[0]) {
        statusEl.textContent = '✓ ' + input.files[0].name;
        statusEl.style.color = 'var(--success-dark)';
        statusEl.style.fontWeight = '600';
        statusEl.style.fontSize = '13px';
        showToast('Document uploaded: ' + input.files[0].name, 'Upload Complete', 'success', 2500);
    }
    triggerAutoSave();
    updateReviewSection();
}

// ── STEP 2: COMPANY INFO TABS & TOGGLES ──
function switchTab(id) {
    document.querySelectorAll('.sub-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-pane').forEach(p => p.classList.remove('active'));
    const btn = document.getElementById('snav-' + id);
    const pane = document.getElementById('tab-' + id);
    if (btn) btn.classList.add('active');
    if (pane) pane.classList.add('active');
}

function tog(btn) {
    const group = btn.parentElement;
    group.querySelectorAll('.tog-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    triggerAutoSave();
}

function addOpsRow() {
    const list = document.getElementById('ops-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'g2';
    row.style.cssText = 'align-items:end;margin-bottom:10px;';
    row.innerHTML = `
        <div class="field"><label>Country of Operation</label><input type="text" placeholder="e.g. Saudi Arabia"></div>
        <div class="field" style="display:flex;gap:8px;align-items:flex-end;">
            <div style="flex:1;"><label>Estimated Annual Turnover (AED)</label><input type="text" placeholder="e.g. 10,000,000"></div>
            <button class="btn btn-danger btn-sm" onclick="this.closest('.g2').remove();triggerAutoSave()" style="margin-bottom:1px;padding:9px 12px;" aria-label="Remove country">✕</button>
        </div>
    `;
    list.appendChild(row);
    triggerAutoSave();
}

// ── STEP 3: UBO DETAILS & SERVER-SIDE OCR ──
function addUploadBox(type) {
    uploadBoxCount++;
    const container = document.getElementById('ubo-passport-boxes');
    if (!container) return;
    const box = document.createElement('div');
    box.className = 'upload-card';
    box.id = 'upbox-' + uploadBoxCount;
    box.setAttribute('data-type', type);
    box.style.padding = '32px 20px';
    box.onclick = () => triggerUpload('f-upbox-' + uploadBoxCount);
    if (type === 'individual') {
        box.innerHTML = `<input type="file" id="f-upbox-${uploadBoxCount}" accept=".pdf,.jpg,.png" onchange="handleDocUpload(${uploadBoxCount}, this)" aria-label="Upload individual passport"><div style="font-size:28px;margin-bottom:8px;" aria-hidden="true">🛂</div><strong>Upload Passport</strong><small>For individual UBOs</small>`;
    } else {
        box.innerHTML = `<input type="file" id="f-upbox-${uploadBoxCount}" accept=".pdf,.jpg,.png" onchange="handleDocUpload(${uploadBoxCount}, this)" aria-label="Upload corporate trade licence"><div style="font-size:28px;margin-bottom:8px;" aria-hidden="true">🏢</div><strong>Upload Trade Licence</strong><small>For corporate owners</small>`;
    }
    container.appendChild(box);
}

function handleDocUpload(boxIdNum, input) {
    const card = document.getElementById('upbox-' + boxIdNum);
    if (input.files && input.files[0] && card) {
        card.classList.add('uploaded');
        card.style.borderColor = 'var(--success)';
        const strongEl = card.querySelector('strong');
        if (strongEl) {
            strongEl.textContent = '✓ ' + input.files[0].name;
            strongEl.style.color = 'var(--success-dark)';
        }
        const extractBtn = document.getElementById('btn-extract-ubos');
        if (extractBtn) extractBtn.disabled = false;
        showToast('Uploaded: ' + input.files[0].name, 'Document Staged', 'success', 2500);
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function extractUboData() {
    const loader = document.getElementById('ubo-loader');
    if (loader) loader.style.display = 'block';
    document.getElementById('ubo-upload-phase').style.display = 'none';

    const boxes = document.querySelectorAll('#ubo-passport-boxes .upload-card');
    const wrap = document.getElementById('uboCardsWrap');
    if (wrap) wrap.innerHTML = '';
    uboCount = 0;
    extractedEntities = [];

    try {
        for (let box of boxes) {
            const input = box.querySelector('input[type=file]');
            const type = box.getAttribute('data-type') || 'individual';
            let file = input && input.files ? input.files[0] : null;

            let imageBase64 = '';
            if (file) {
                imageBase64 = await fileToBase64(file);
            } else {
                // Minimal placeholder base64 for demo if no file attached
                imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            }

            // Call secure server-side OCR endpoint
            const res = await window.VBApi.performOcr(imageBase64, type);
            const data = res.data || {};

            if (type === 'individual') {
                const name = data.fullName || 'Sheikh Mansoor Al-Nahyan';
                const nat = data.nationality || 'Emirati';
                const dob = data.dob || '1978-04-12';
                const pass = data.passportNumber || 'AE9081245';
                const exp = data.expiry || '2030-04-11';
                const gender = data.gender || 'Male';
                generatePrefilledIndividualCard(name, nat, dob, pass, exp, gender);
                extractedEntities.push(name);
            } else {
                const name = data.fullName || 'Apex Capital Holding LLC';
                const reg = data.registrationNumber || 'CRN-509077205';
                const auth = data.issuingAuthority || 'Abu Dhabi Global Market (ADGM)';
                const incorp = data.dob || '2018-09-20';
                const exp = data.expiry || '2027-09-19';
                generatePrefilledCorpCard(name, reg, auth, incorp, exp);
                extractedEntities.push(name);
            }
        }

        if (loader) loader.style.display = 'none';
        document.getElementById('ubo-form-phase').style.display = 'block';
        document.getElementById('ubo-count').style.display = 'inline-block';
        updateUboCountText();
        showToast(`Successfully extracted ${extractedEntities.length} entities.`, 'OCR Extraction Complete', 'success');
        triggerAutoSave();
    } catch (err) {
        console.error('OCR Extraction error:', err);
        if (loader) loader.style.display = 'none';
        document.getElementById('ubo-upload-phase').style.display = 'block';
        showToast('Document extraction encountered an issue. You can enter details manually.', 'Extraction Notice', 'warning');
    }
}

function generatePrefilledIndividualCard(name, nat, dob, pass, expiry, gender) {
    uboCount++;
    updateUboCountText();
    const wrap = document.getElementById('uboCardsWrap');
    if (!wrap) return;
    const card = document.createElement('div');
    card.className = 'ubo-card';
    card.innerHTML = `
        <div class="ubo-card-hdr">
            <span class="ubo-n">👤 UBO ${uboCount} — ${name}</span>
            <button class="ubo-remove" onclick="this.closest('.ubo-card').remove();uboCount--;updateUboCountText();triggerAutoSave();" aria-label="Remove this UBO">✕ Remove</button>
        </div>
        <div class="ubo-card-body">
            <div class="g2" style="margin-bottom:14px;">
                <div class="field"><label>Full Legal Name</label><input type="text" value="${name}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Nationality</label>
                    <select class="auto-filled">
                        <option ${nat === 'Emirati' ? 'selected' : ''}>Emirati</option>
                        <option ${nat === 'British' ? 'selected' : ''}>British</option>
                        <option ${nat === 'Indian' ? 'selected' : ''}>Indian</option>
                        <option ${nat === 'American' ? 'selected' : ''}>American</option>
                        <option ${nat === 'Canadian' ? 'selected' : ''}>Canadian</option>
                        <option ${nat === 'Australian' ? 'selected' : ''}>Australian</option>
                        <option ${nat === 'Saudi' ? 'selected' : ''}>Saudi</option>
                    </select>
                    <span class="auto-badge">⚡ Verified</span>
                </div>
                <div class="field"><label>Date of Birth</label><input type="date" value="${dob}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Passport Number</label><input type="text" value="${pass}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Passport Expiry</label><input type="date" value="${expiry}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Gender</label><select class="auto-filled"><option ${gender === 'Male' ? 'selected' : ''}>Male</option><option ${gender === 'Female' ? 'selected' : ''}>Female</option></select><span class="auto-badge">⚡ Verified</span></div>
            </div>
            <span class="tog-label">Is this person a Politically Exposed Person (PEP)?</span>
            <div class="tog-group" role="group"><button class="tog-btn" onclick="tog(this)">Yes</button><button class="tog-btn on" onclick="tog(this)">No</button></div>
        </div>
    `;
    wrap.appendChild(card);
}

function generatePrefilledCorpCard(name, reg, auth, incorp, expiry) {
    uboCount++;
    updateUboCountText();
    const wrap = document.getElementById('uboCardsWrap');
    if (!wrap) return;
    const card = document.createElement('div');
    card.className = 'ubo-card';
    card.innerHTML = `
        <div class="ubo-card-hdr">
            <span class="ubo-n">🏢 Corporate Shareholder ${uboCount} — ${name}</span>
            <button class="ubo-remove" onclick="this.closest('.ubo-card').remove();uboCount--;updateUboCountText();triggerAutoSave();" aria-label="Remove this corporate entity">✕ Remove</button>
        </div>
        <div class="ubo-card-body">
            <div class="g2" style="margin-bottom:14px;">
                <div class="field"><label>Corporate Entity Name</label><input type="text" value="${name}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Licence / Registration No.</label><input type="text" value="${reg}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Issuing Authority</label><input type="text" value="${auth}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Date of Incorporation</label><input type="date" value="${incorp}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Licence Expiry Date</label><input type="date" value="${expiry}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
            </div>
        </div>
    `;
    wrap.appendChild(card);
}

function addEmptyIndividualCard() {
    const name = `Individual UBO ${uboCount + 1}`;
    generatePrefilledIndividualCard(name, 'Emirati', '1985-01-01', 'A0000000', '2030-01-01', 'Male');
    extractedEntities.push(name);
    triggerAutoSave();
}

function addEmptyCorporateCard() {
    const name = `Corporate Shareholder ${uboCount + 1} LLC`;
    generatePrefilledCorpCard(name, 'CRN-000000', 'Ministry of Economy', '2020-01-01', '2028-01-01');
    extractedEntities.push(name);
    triggerAutoSave();
}

function updateUboCountText() {
    const countEl = document.getElementById('ubo-count');
    if (countEl) countEl.textContent = `${uboCount} ${uboCount === 1 ? 'Entity' : 'Entities'}`;
}

function resetUboPhase() {
    document.getElementById('ubo-form-phase').style.display = 'none';
    document.getElementById('ubo-upload-phase').style.display = 'block';
    const countEl = document.getElementById('ubo-count');
    if (countEl) countEl.style.display = 'none';
    const btn = document.getElementById('btn-extract-ubos');
    if (btn) btn.disabled = true;
    showToast('Returned to document upload phase.', 'Reset', 'info');
}

// ── STEP 4: OWNERSHIP STRUCTURE ──
function setView(view) {
    const visualView = document.getElementById('viewVisual');
    const listView = document.getElementById('viewList');
    const vtVisual = document.getElementById('vt-visual');
    const vtList = document.getElementById('vt-list');

    if (view === 'visual') {
        if (visualView) visualView.style.display = 'block';
        if (listView) listView.style.display = 'none';
        if (vtVisual) { vtVisual.classList.add('active'); vtVisual.setAttribute('aria-pressed', 'true'); }
        if (vtList) { vtList.classList.remove('active'); vtList.setAttribute('aria-pressed', 'false'); }
    } else {
        if (visualView) visualView.style.display = 'none';
        if (listView) listView.style.display = 'block';
        if (vtVisual) { vtVisual.classList.remove('active'); vtVisual.setAttribute('aria-pressed', 'false'); }
        if (vtList) { vtList.classList.add('active'); vtList.setAttribute('aria-pressed', 'true'); }
        calcTotal();
    }
}

function renderStep4() {
    // If no entities yet, provide standard initial entities so ownership is never empty
    if (extractedEntities.length === 0) {
        extractedEntities = ['Sheikh Mansoor Al-Nahyan', 'Apex Capital Holding LLC'];
        uboCount = 2;
        updateUboCountText();
    }

    renderVisualView();
    renderListView();
}

function renderVisualView() {
    const container = document.getElementById('pool-cards-container');
    if (!container) return;
    container.innerHTML = '';
    extractedEntities.forEach((name, idx) => {
        const card = document.createElement('div');
        card.className = 'entity-card';
        card.draggable = true;
        card.ondragstart = drag;
        card.id = 'pool-card-' + idx;
        const isCorp = name.includes('LLC') || name.includes('PLC') || name.includes('Capital') || name.includes('Holding');
        if (isCorp) card.classList.add('corp');
        card.innerHTML = `<div class="ec-name">${name}</div><div class="ec-type">${isCorp ? '🏢 Corporate Entity' : '👤 Individual UBO'}</div>`;
        container.appendChild(card);
    });
}

function renderListView() {
    const container = document.getElementById('struct-rows');
    if (!container) return;

    // Check if we already have rows rendered with values
    const existingInputs = container.querySelectorAll('input[type="number"]');
    if (existingInputs.length > 0 && Array.from(existingInputs).some(i => i.value)) {
        calcTotal();
        return; // Preserve existing inputs
    }

    container.innerHTML = '';

    // If we have cached rows, restore them
    if (cachedOwnershipRows.length > 0) {
        cachedOwnershipRows.forEach((row, idx) => {
            addStructRow(row.entity, row.percentage, row.level, idx);
        });
    } else {
        // Default initial distribution
        extractedEntities.forEach((entity, index) => {
            const defaultPct = index === 0 ? '60' : (index === 1 ? '40' : '0');
            const defaultLevel = index === 0 ? '1' : '2';
            addStructRow(entity, defaultPct, defaultLevel, index);
        });
    }
    calcTotal();
}

function addStructRow(selectedEntity, percentage = '', level = '1', index = null) {
    const container = document.getElementById('struct-rows');
    if (!container) return;
    const idx = index !== null ? index : container.children.length;
    const row = document.createElement('div');
    row.className = 'struct-row';
    row.id = 'entity-row-' + idx;

    const options = extractedEntities.map(e =>
        `<option value="${e}" ${e === selectedEntity ? 'selected' : ''}>${e}</option>`
    ).join('');

    row.innerHTML = `
        <div class="field">
            <select id="level-${idx}">
                <option value="1" ${level === '1' ? 'selected' : ''}>Level 1 (Parent)</option>
                <option value="2" ${level === '2' ? 'selected' : ''}>Level 2 (Subsidiary)</option>
            </select>
        </div>
        <div class="field">
            <select id="entity-select-${idx}" onchange="calcTotal()">${options}</select>
        </div>
        <div class="field">
            <input type="number" id="pct-${idx}" min="1" max="100" placeholder="%" value="${percentage}" oninput="calcTotal()">
        </div>
    `;
    container.appendChild(row);
    calcTotal();
}

function addStructRowFromPool() {
    const entity = extractedEntities[0] || 'New Entity';
    addStructRow(entity, '10', '2');
    triggerAutoSave();
}

function removeLastStructRow() {
    const container = document.getElementById('struct-rows');
    if (container && container.children.length > 1) {
        container.lastElementChild.remove();
        calcTotal();
        triggerAutoSave();
    }
}

function calcTotal() {
    let total = 0;
    document.querySelectorAll('#struct-rows .struct-row input[type="number"]').forEach(inp => {
        total += Number(inp.value) || 0;
    });
    const totalText = document.getElementById('pct-total-text');
    const fillBar = document.getElementById('pct-fill-bar');
    if (totalText && fillBar) {
        totalText.textContent = `${total}% / 100%`;
        fillBar.style.width = Math.min(total, 100) + '%';
        if (total === 100) {
            totalText.style.color = 'var(--success-dark)';
            fillBar.style.background = 'var(--success)';
        } else if (total > 100) {
            totalText.style.color = 'var(--danger)';
            fillBar.style.background = 'var(--danger)';
        } else {
            totalText.style.color = 'var(--warning)';
            fillBar.style.background = 'var(--warning)';
        }
    }
}

// ── DRAG & DROP FOR VISUAL BUILDER ──
function drag(ev) {
    ev.dataTransfer.setData('text/plain', ev.currentTarget.id);
}

function allowDropZone(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function leaveDrop(e) {
    e.currentTarget.classList.remove('drag-over');
}

function drop(ev) {
    ev.preventDefault();
    const dropZone = ev.currentTarget;
    dropZone.classList.remove('drag-over');
    const cardId = ev.dataTransfer.getData('text/plain');
    const card = document.getElementById(cardId);
    if (!card) return;

    if (dropZone.id === 'pool') {
        const poolContainer = document.getElementById('pool-cards-container');
        if (poolContainer) poolContainer.appendChild(card);
    } else if (dropZone.classList.contains('drop-zone')) {
        dropZone.innerHTML = '';
        dropZone.appendChild(card);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'dz-remove';
        removeBtn.textContent = '✕';
        removeBtn.onclick = (e) => { e.stopPropagation(); removeCard(removeBtn); };
        dropZone.appendChild(removeBtn);
    }
    checkLevels();
    triggerAutoSave();
}

function removeCard(btn) {
    const zone = btn.parentElement;
    const card = zone.querySelector('.entity-card');
    const poolContainer = document.getElementById('pool-cards-container');
    if (card && poolContainer) {
        poolContainer.appendChild(card);
    }
    zone.innerHTML = 'Drop entity here';
    checkLevels();
    triggerAutoSave();
}

function addDropZone(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const zone = document.createElement('div');
    zone.className = 'drop-zone';
    zone.innerHTML = 'Drop entity here';
    zone.ondrop = drop;
    zone.ondragover = allowDropZone;
    zone.ondragleave = leaveDrop;
    row.appendChild(zone);
}

function checkLevels() {
    const lv1Cards = document.querySelectorAll('#lv1-row .entity-card');
    const connLine = document.getElementById('conn-line');
    const lv2Wrap = document.getElementById('lv2-wrap');
    if (lv1Cards.length > 0) {
        if (connLine) connLine.style.display = 'block';
        if (lv2Wrap) lv2Wrap.style.display = 'block';
    }
}

function showDragDemo() {
    const poolContainer = document.getElementById('pool-cards-container');
    const firstCard = poolContainer ? poolContainer.querySelector('.entity-card') : null;
    const firstDropZone = document.querySelector('.drop-zone');

    if (!firstCard || !firstDropZone) {
        return; // Silently skip demo if components are not ready
    }

    const clone = firstCard.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.zIndex = '9999';
    clone.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
    clone.style.pointerEvents = 'none';
    clone.style.width = firstCard.offsetWidth + 'px';
    clone.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';

    const startRect = firstCard.getBoundingClientRect();
    clone.style.left = startRect.left + 'px';
    clone.style.top = startRect.top + 'px';
    document.body.appendChild(clone);

    firstDropZone.classList.add('drag-over');
    const endRect = firstDropZone.getBoundingClientRect();
    const dx = endRect.left + (endRect.width / 2 - startRect.width / 2) - startRect.left;
    const dy = endRect.top + (endRect.height / 2 - startRect.height / 2) - startRect.top;

    requestAnimationFrame(() => {
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
    });

    setTimeout(() => {
        clone.style.opacity = '0';
        firstDropZone.classList.remove('drag-over');
        setTimeout(() => clone.remove(), 400);
    }, 900);
}

// ── STEP 5: ROLES & GOVERNANCE ──
function renderRoleTables() {
    const govBody = document.getElementById('govTableBody');
    const sysBody = document.getElementById('sysTableBody');
    if (!govBody || !sysBody) return;

    // If rows already exist, preserve user changes
    if (govBody.children.length > 0 && !govBody.textContent.includes('No entities loaded')) {
        return;
    }

    govBody.innerHTML = '';
    sysBody.innerHTML = '';

    if (extractedEntities.length === 0) {
        govBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">No entities loaded yet.</td></tr>';
        sysBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">No entities loaded yet.</td></tr>';
        return;
    }

    extractedEntities.forEach((name, idx) => {
        const govState = cachedRoleSelections?.govStates?.[idx] || [true, false, true];
        const sysState = cachedRoleSelections?.sysStates?.[idx] || [true, false, true];

        const govRow = document.createElement('tr');
        govRow.innerHTML = `
            <td style="font-weight:600;color:var(--text-primary);">${name}</td>
            <td><input type="checkbox" ${govState[0] ? 'checked' : ''} onchange="triggerAutoSave()"></td>
            <td><input type="checkbox" ${govState[1] ? 'checked' : ''} onchange="triggerAutoSave()"></td>
            <td><input type="checkbox" ${govState[2] ? 'checked' : ''} onchange="triggerAutoSave()"></td>
        `;
        govBody.appendChild(govRow);

        const sysRow = document.createElement('tr');
        sysRow.innerHTML = `
            <td style="font-weight:600;color:var(--text-primary);">${name}</td>
            <td><input type="checkbox" ${sysState[0] ? 'checked' : ''} onchange="triggerAutoSave()"></td>
            <td><input type="checkbox" ${sysState[1] ? 'checked' : ''} onchange="triggerAutoSave()"></td>
            <td><input type="checkbox" ${sysState[2] ? 'checked' : ''} onchange="triggerAutoSave()"></td>
        `;
        sysBody.appendChild(sysRow);
    });
}

function populateMakerCheckerRoles() {
    const makerSelect = document.getElementById('maker-select');
    const checkerSelect = document.getElementById('checker-select');
    if (!makerSelect || !checkerSelect) return;

    const currentMaker = cachedRoleSelections?.maker || makerSelect.value || (extractedEntities[0] || '');
    const currentChecker = cachedRoleSelections?.checker || checkerSelect.value || (extractedEntities[1] || '');

    makerSelect.innerHTML = '<option value="">— Select Maker —</option>';
    checkerSelect.innerHTML = '<option value="">— Select Checker —</option>';

    extractedEntities.forEach(name => {
        makerSelect.innerHTML += `<option value="${name}" ${name === currentMaker ? 'selected' : ''}>${name}</option>`;
        checkerSelect.innerHTML += `<option value="${name}" ${name === currentChecker ? 'selected' : ''}>${name}</option>`;
    });
}

function validateMakerChecker(checkerSelect) {
    const makerSelect = document.getElementById('maker-select');
    if (checkerSelect.value && !makerSelect.value) {
        showToast('Please assign a Maker before assigning a Checker.', 'Role Dependency', 'warning');
        checkerSelect.value = '';
    } else if (checkerSelect.value && checkerSelect.value === makerSelect.value) {
        showToast('The same individual cannot act as both Maker and Checker (Four-Eyes Principle).', 'Four-Eyes Principle', 'warning');
        checkerSelect.value = '';
    }
    triggerAutoSave();
}

async function extractMakerChecker(input, roleType) {
    const file = input.files ? input.files[0] : null;
    if (!file) return;
    const cardId = roleType === 'maker' ? 'uc-maker' : 'uc-checker';
    markUploaded(cardId, input);

    try {
        const imageBase64 = await fileToBase64(file);
        const res = await window.VBApi.performOcr(imageBase64, 'individual');
        const extracted = res.data;
        if (extracted && extracted.fullName) {
            const selectId = roleType === 'maker' ? 'maker-select' : 'checker-select';
            const select = document.getElementById(selectId);
            if (select) {
                let found = false;
                for (let opt of select.options) {
                    if (opt.value === extracted.fullName) { found = true; break; }
                }
                if (!found) {
                    select.innerHTML += `<option value="${extracted.fullName}" selected>${extracted.fullName}</option>`;
                }
                select.value = extracted.fullName;
                showToast(`Assigned ${extracted.fullName} as ${roleType}.`, 'Role Assigned', 'success');
            }
        }
    } catch (err) {
        console.error('Maker/Checker OCR error:', err);
    }
}

// ── STEP 6: FATCA & CRS ──
function initFATCA_CRS_States() {
    if (cachedTaxSelections) {
        const usYesBtn = document.querySelector('#fatca-us-person-tog .tog-btn:first-child');
        const usNoBtn = document.querySelector('#fatca-us-person-tog .tog-btn:last-child');
        if (cachedTaxSelections.usPerson && usYesBtn) toggleFATCA_USPerson(usYesBtn, true);
        else if (usNoBtn) toggleFATCA_USPerson(usNoBtn, false);

        if (cachedTaxSelections.fatcaClass) {
            const sel = document.getElementById('fatca-entity-class');
            if (sel) { sel.value = cachedTaxSelections.fatcaClass; toggleFATCA_EntityClassification(); }
        }

        const crsYesBtn = document.querySelector('#crs-fi-tog .tog-btn:first-child');
        const crsNoBtn = document.querySelector('#crs-fi-tog .tog-btn:last-child');
        if (cachedTaxSelections.crsFi && crsYesBtn) toggleCRS_FI(crsYesBtn, true);
        else if (crsNoBtn) toggleCRS_FI(crsNoBtn, false);
    }
}

function toggleFATCA_USPerson(btn, isYes) {
    const group = btn.parentElement;
    group.querySelectorAll('.tog-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const yesBlock = document.getElementById('fatca-us-yes');
    const noBlock = document.getElementById('fatca-us-no');
    if (isYes) {
        if (yesBlock) yesBlock.classList.add('active');
        if (noBlock) noBlock.classList.remove('active');
    } else {
        if (yesBlock) yesBlock.classList.remove('active');
        if (noBlock) noBlock.classList.add('active');
        toggleFATCA_EntityClassification();
    }
    triggerAutoSave();
}

function toggleFATCA_EntityClassification() {
    const sel = document.getElementById('fatca-entity-class');
    const val = sel ? sel.value : '';
    const ffiBlock = document.getElementById('fatca-ffi-details');
    const nffeBlock = document.getElementById('fatca-nffe-details');
    if (ffiBlock) ffiBlock.classList.remove('active');
    if (nffeBlock) nffeBlock.classList.remove('active');
    if (val === 'FFI' && ffiBlock) ffiBlock.classList.add('active');
    else if (val === 'NFFE' && nffeBlock) nffeBlock.classList.add('active');
    triggerAutoSave();
}

function toggleCRS_FI(btn, isYes) {
    const group = btn.parentElement;
    group.querySelectorAll('.tog-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const yesBlock = document.getElementById('crs-fi-yes');
    const noBlock = document.getElementById('crs-fi-no');
    if (isYes) {
        if (yesBlock) yesBlock.classList.add('active');
        if (noBlock) noBlock.classList.remove('active');
    } else {
        if (yesBlock) yesBlock.classList.remove('active');
        if (noBlock) noBlock.classList.add('active');
    }
    triggerAutoSave();
}

// ── STEP 7: REVIEW SECTION ──
function toggleAccordion(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
}

function updateReviewSection() {
    // 1. Documents
    const ra1Docs = document.getElementById('ra1-docs-list');
    const ra1Count = document.getElementById('ra1-count');
    if (ra1Docs) {
        let uploaded = [];
        for (let i = 1; i <= 4; i++) {
            const card = document.getElementById('uc-' + i);
            const labelInput = card ? card.querySelector('.doc-label-input') : null;
            const fileStatus = card ? card.querySelector('.file-status') : null;
            if (card && card.classList.contains('uploaded')) {
                const label = labelInput ? labelInput.value : `Document ${i}`;
                const filename = fileStatus ? fileStatus.textContent.replace('✓ ', '') : 'Uploaded';
                uploaded.push(`${label} (${filename})`);
            }
        }
        if (uploaded.length === 0) {
            ra1Docs.innerHTML = '<em>No documents uploaded yet.</em>';
            if (ra1Count) ra1Count.textContent = '0 uploaded';
        } else {
            ra1Docs.innerHTML = uploaded.map(d =>
                `<div class="rv-row"><span class="rvl">${d}</span><span class="rvv ok">✓ Staged</span></div>`
            ).join('');
            if (ra1Count) ra1Count.textContent = `${uploaded.length} uploaded`;
        }
    }

    // 2. Company Info
    const ra2Summary = document.getElementById('ra2-summary');
    const ra2Details = document.getElementById('ra2-details');
    const name = document.getElementById('step2_name')?.value || '';
    const crn = document.getElementById('step2_crn')?.value || '';
    const legalType = document.getElementById('step2_legal_type')?.value || '';
    if (ra2Summary) ra2Summary.textContent = (name || 'Company') + ' · ' + (crn || 'No CRN');
    if (ra2Details) {
        ra2Details.innerHTML = `
            <div class="rv-row"><span class="rvl">Company Name</span><span class="rvv">${name || '—'}</span></div>
            <div class="rv-row"><span class="rvl">Commercial Reg. No. (CRN)</span><span class="rvv">${crn || '—'}</span></div>
            <div class="rv-row"><span class="rvl">Legal Type</span><span class="rvv">${legalType || '—'}</span></div>
        `;
    }

    // 3. UBOs
    const ra3Body = document.getElementById('ra3');
    const ra3Count = document.getElementById('ra3-count');
    if (ra3Body && extractedEntities.length > 0) {
        ra3Body.innerHTML = extractedEntities.map(e =>
            `<div class="rv-row"><span class="rvl">Beneficial Owner</span><span class="rvv">${e}</span></div>`
        ).join('');
        if (ra3Count) ra3Count.textContent = `${extractedEntities.length} entities`;
    }

    // 4. Ownership
    const ra4Body = document.getElementById('ra4');
    const ra4Count = document.getElementById('ra4-count');
    if (ra4Body) {
        const rows = document.querySelectorAll('#struct-rows .struct-row');
        if (rows.length > 0) {
            let html = '';
            rows.forEach(r => {
                const ent = r.querySelector('select[id^="entity-select-"]')?.value || 'Entity';
                const pct = r.querySelector('input[type="number"]')?.value || '0';
                html += `<div class="rv-row"><span class="rvl">${ent}</span><span class="rvv">${pct}% Equity</span></div>`;
            });
            ra4Body.innerHTML = html;
            if (ra4Count) ra4Count.textContent = `${rows.length} mapped`;
        }
    }

    // 5. Tax
    const ra5Details = document.getElementById('ra5-details');
    if (ra5Details) {
        const fatcaVal = document.getElementById('fatca-entity-class')?.value || 'Compliant';
        ra5Details.innerHTML = `<div class="rv-row"><span class="rvl">FATCA Status</span><span class="rvv">${fatcaVal}</span></div>`;
    }
}

// ── COMPREHENSIVE DATA PERSISTENCE: COLLECT ALL 7 STEPS ──
function collectFullFormData() {
    // Step 1: Uploaded documents
    const step1Docs = [];
    for (let i = 1; i <= 4; i++) {
        const card = document.getElementById('uc-' + i);
        if (card) {
            step1Docs.push({
                id: 'uc-' + i,
                label: card.querySelector('.doc-label-input')?.value || `Document ${i}`,
                uploaded: card.classList.contains('uploaded'),
                filename: card.querySelector('.file-status')?.textContent || ''
            });
        }
    }

    // Step 2: Company details
    const step2 = {
        crn: document.getElementById('step2_crn')?.value || '',
        company_name: document.getElementById('step2_name')?.value || '',
        trade_name: document.getElementById('trade_name')?.value || '',
        legal_type: document.getElementById('step2_legal_type')?.value || '',
        issue_date: document.getElementById('step2_issue_date')?.value || '',
        expiry_date: document.getElementById('step2_expiry_date')?.value || '',
        issued_by: document.getElementById('step2_issued_by')?.value || '',
        address: document.querySelector('#tab-address input')?.value || '',
        vat_trn: document.querySelector('#tab-vat input')?.value || ''
    };

    // Step 3 & 4: Entities and Ownership rows
    const ownershipRows = [];
    document.querySelectorAll('#struct-rows .struct-row').forEach(row => {
        const lvl = row.querySelector('select[id^="level-"]')?.value || '1';
        const ent = row.querySelector('select[id^="entity-select-"]')?.value || '';
        const pct = row.querySelector('input[type="number"]')?.value || '0';
        if (ent) ownershipRows.push({ level: lvl, entity: ent, percentage: pct });
    });

    // Step 5: Roles
    const step5 = {
        maker: document.getElementById('maker-select')?.value || '',
        checker: document.getElementById('checker-select')?.value || ''
    };

    // Step 6: Tax
    const step6 = {
        fatca_class: document.getElementById('fatca-entity-class')?.value || '',
        us_person: document.querySelector('#fatca-us-person-tog .tog-btn:first-child')?.classList.contains('on') || false,
        crs_fi: document.querySelector('#crs-fi-tog .tog-btn:first-child')?.classList.contains('on') || false
    };

    // Step 7: Declarations
    const declarations = {
        d1: document.getElementById('d1')?.checked || false,
        d2: document.getElementById('d2')?.checked || false,
        d3: document.getElementById('d3')?.checked || false
    };

    return {
        step1_documents: step1Docs,
        step2,
        entities: extractedEntities,
        ownership_structure: ownershipRows,
        roles: step5,
        tax: step6,
        declarations
    };
}

// ── COMPREHENSIVE DATA PERSISTENCE: RESTORE ALL 7 STEPS ──
function populateFormData(formData) {
    if (!formData) return;

    // Restore Step 1 documents
    if (formData.step1_documents && Array.isArray(formData.step1_documents)) {
        formData.step1_documents.forEach(doc => {
            const card = document.getElementById(doc.id);
            if (card) {
                const labelInput = card.querySelector('.doc-label-input');
                const statusEl = card.querySelector('.file-status');
                if (labelInput && doc.label) labelInput.value = doc.label;
                if (doc.uploaded) {
                    card.classList.add('uploaded');
                    if (statusEl && doc.filename) statusEl.textContent = doc.filename;
                }
            }
        });
    }

    // Restore Step 2 company details
    if (formData.step2) {
        const s2 = formData.step2;
        if (s2.crn && document.getElementById('step2_crn')) document.getElementById('step2_crn').value = s2.crn;
        if (s2.company_name && document.getElementById('step2_name')) document.getElementById('step2_name').value = s2.company_name;
        if (s2.trade_name && document.getElementById('trade_name')) document.getElementById('trade_name').value = s2.trade_name;
        if (s2.legal_type && document.getElementById('step2_legal_type')) document.getElementById('step2_legal_type').value = s2.legal_type;
        if (s2.issue_date && document.getElementById('step2_issue_date')) document.getElementById('step2_issue_date').value = s2.issue_date;
        if (s2.expiry_date && document.getElementById('step2_expiry_date')) document.getElementById('step2_expiry_date').value = s2.expiry_date;
        if (s2.issued_by && document.getElementById('step2_issued_by')) document.getElementById('step2_issued_by').value = s2.issued_by;
        if (s2.address && document.querySelector('#tab-address input')) document.querySelector('#tab-address input').value = s2.address;
        if (s2.vat_trn && document.querySelector('#tab-vat input')) document.querySelector('#tab-vat input').value = s2.vat_trn;
    }

    // Restore Step 3 & 4 entities
    if (formData.entities && Array.isArray(formData.entities) && formData.entities.length > 0) {
        extractedEntities = formData.entities;
        uboCount = extractedEntities.length;
        updateUboCountText();
    }

    // Restore Step 4 ownership structure
    if (formData.ownership_structure && Array.isArray(formData.ownership_structure) && formData.ownership_structure.length > 0) {
        cachedOwnershipRows = formData.ownership_structure;
        renderListView();
    }

    // Restore Step 5 roles
    if (formData.roles) {
        cachedRoleSelections = {
            maker: formData.roles.maker || '',
            checker: formData.roles.checker || ''
        };
        populateMakerCheckerRoles();
    }

    // Restore Step 6 tax
    if (formData.tax) {
        cachedTaxSelections = {
            usPerson: formData.tax.us_person,
            fatcaClass: formData.tax.fatca_class,
            crsFi: formData.tax.crs_fi
        };
        initFATCA_CRS_States();
    }

    // Restore Step 7 declarations
    if (formData.declarations) {
        if (document.getElementById('d1')) document.getElementById('d1').checked = Boolean(formData.declarations.d1);
        if (document.getElementById('d2')) document.getElementById('d2').checked = Boolean(formData.declarations.d2);
        if (document.getElementById('d3')) document.getElementById('d3').checked = Boolean(formData.declarations.d3);
    }

    updateReviewSection();
}

// ── AUTOSAVE WITH VISUAL INDICATOR & BACKEND SYNC ──
function triggerAutoSave() {
    const el = document.getElementById('autosave');
    if (el) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        el.textContent = `✓ Progress saved at ${time}`;
        el.classList.add('visible');
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => el.classList.remove('visible'), 2500);
    }

    // Debounced backend sync
    if (window.VBApi && window.VBApi.isAuthenticated()) {
        window.VBApi.saveApplication(currentStep, undefined, collectFullFormData())
            .catch(err => console.warn('Background auto-save notice:', err.message));
    }
}

// ── AUTHENTICATION & LOGIN WORKFLOW ──
async function handleLoginStep1() {
    const crnInput = document.getElementById('crnInput');
    const emailInput = document.getElementById('emailInput');
    const crn = crnInput ? crnInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (!crn) { showLoginError('Please enter your Commercial Registration Number (CRN).'); return; }
    if (!email || !email.includes('@')) { showLoginError('Please enter a valid registered email address.'); return; }

    hideLoginError();
    currentLoginCrn = crn;
    currentLoginEmail = email;

    try {
        const res = await window.VBApi.requestOtp(crn, email);
        document.getElementById('displayEmail').textContent = email;
        document.getElementById('lStep1').classList.add('hidden');
        document.getElementById('lStep2').classList.remove('hidden');

        // Focus first OTP input
        const firstOtp = document.querySelector('#otpInputs input');
        if (firstOtp) firstOtp.focus();

        if (res.debugOtp) {
            showToast(`Verification code sent to ${email} (Demo code: ${res.debugOtp})`, 'OTP Dispatched', 'info', 6000);
        } else {
            showToast(`Verification code sent to ${email}`, 'OTP Dispatched', 'info');
        }
    } catch (err) {
        showLoginError(err.message || 'Failed to dispatch verification code.');
    }
}

async function handleOtpSubmit() {
    const inputs = document.querySelectorAll('#otpInputs input');
    let enteredOtp = '';
    inputs.forEach(inp => enteredOtp += inp.value);

    if (enteredOtp.length < 4) {
        showLoginError('Please enter the full 4-digit verification code.');
        return;
    }

    try {
        const result = await window.VBApi.verifyOtp(currentLoginCrn, currentLoginEmail, enteredOtp);
        if (result.success && result.data) {
            hideLoginError();
            document.getElementById('loginOverlay').classList.add('hidden');

            currentAppRef = result.data.application_ref;
            document.querySelectorAll('.app-ref').forEach(el => {
                el.textContent = 'Application Reference: ' + currentAppRef;
            });

            // Sync CRN to company details
            const step2Crn = document.getElementById('step2_crn');
            if (step2Crn) step2Crn.value = currentLoginCrn;

            // Restore application state
            if (result.data.form_data) {
                populateFormData(result.data.form_data);
            }

            if (result.data.current_step && result.data.current_step > 1) {
                goTo(result.data.current_step);
            }

            showToast('Welcome to Vision Bank Corporate Portal', 'Authentication Successful', 'success');
        }
    } catch (err) {
        showLoginError(err.message || 'Incorrect verification code. Please try again.');
        inputs.forEach(inp => inp.value = '');
        if (inputs[0]) inputs[0].focus();
    }
}

function moveToNext(current, nextIndex) {
    if (current.value.length === 1) {
        const nextInput = document.querySelector(`#otpInputs input:nth-child(${nextIndex + 1})`);
        if (nextInput) nextInput.focus();
    }
}

async function resendOtp() {
    if (!currentLoginCrn || !currentLoginEmail) return;
    try {
        const res = await window.VBApi.requestOtp(currentLoginCrn, currentLoginEmail);
        showToast(`A new verification code has been dispatched.`, 'Code Resent', 'info');
    } catch (err) {
        showToast(err.message, 'Resend Failed', 'error');
    }
}

function showLoginError(msg) {
    const el = document.getElementById('loginError');
    if (el) {
        el.textContent = '⚠️ ' + msg;
        el.classList.add('show');
    }
}

function hideLoginError() {
    const el = document.getElementById('loginError');
    if (el) el.classList.remove('show');
}

// ── FINAL APPLICATION SUBMISSION ──
async function finalizeApp() {
    if (isReworkMode) {
        showToast('Application resubmitted for relationship manager review!', 'Resubmitted', 'success');
        toggleReworkMode();
    }

    if (window.VBApi && window.VBApi.isAuthenticated()) {
        try {
            await window.VBApi.saveApplication(7, 'submitted', collectFullFormData());
        } catch (err) {
            console.error('Final submission error:', err);
        }
    }

    updateReviewSection();
    const reviewBody = document.getElementById('reviewBody');
    const successState = document.getElementById('successState');
    if (reviewBody) reviewBody.style.display = 'none';
    if (successState) successState.style.display = 'block';

    document.querySelectorAll('.step-pill').forEach(p => {
        p.classList.remove('active');
        p.classList.add('done');
    });

    fireConfetti();
    showToast('Corporate account application submitted successfully!', 'Congratulations', 'success', 6000);
}

// ── UTILITY MODALS & HELPERS ──
function showSaveModal() {
    triggerAutoSave();
    const modal = document.getElementById('saveModal');
    if (modal) modal.classList.add('open');
}

function showInviteModal(name) {
    const el = document.getElementById('inviteName');
    if (el) el.textContent = name;
    const modal = document.getElementById('inviteModal');
    if (modal) modal.classList.add('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function sendInvite() {
    const email = document.getElementById('inviteEmail')?.value?.trim();
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address.', 'Invalid Email', 'warning');
        return;
    }
    closeModal('inviteModal');
    const sentModal = document.getElementById('inviteSentModal');
    if (sentModal) sentModal.classList.add('open');
    showToast(`Invite dispatched to ${email}`, 'Invite Sent', 'success');
}

function triggerDocuSign() {
    const btn = document.getElementById('btn-trigger-docusign');
    const actionArea = document.getElementById('docusign-action-area');
    const statusItems = document.getElementById('docusign-status-items');
    const alertBox = document.getElementById('docusign-alert');

    if (btn) { btn.innerHTML = '⌛ Dispatching Invites…'; btn.style.opacity = '0.8'; btn.style.pointerEvents = 'none'; }
    setTimeout(() => {
        if (actionArea) {
            actionArea.innerHTML = `<div style="display:flex; align-items:center; gap:8px; color: var(--success-dark); font-weight: 700; font-size: 14px; width: 100%;"><span style="font-size:18px;" aria-hidden="true">✅</span> Invites successfully dispatched to all signatories!</div>`;
            actionArea.style.borderColor = 'var(--success)';
            actionArea.style.background = 'var(--success-bg)';
        }
        if (statusItems) {
            statusItems.innerHTML = `
                <div class="timeline-item"><span style="font-weight:600;color:var(--success);">✓</span><span>DocuSign invitations sent to signatories</span></div>
                <div class="timeline-item"><span style="font-weight:600;color:var(--warning);">⏳</span><span>Awaiting document review and signatures</span></div>
                <div class="timeline-item"><span style="font-weight:600;color:var(--warning);">⏳</span><span>Estimated completion: 24–72 hours</span></div>
            `;
        }
        if (alertBox) alertBox.style.display = 'block';
        triggerAutoSave();
        showToast('DocuSign invites sent to all signatories.', 'Invites Sent', 'success');
    }, 1200);
}

function downloadReceipt() {
    const appRef = currentAppRef || 'VB-2026-DEMO';
    const company = document.getElementById('step2_name')?.value || 'Vision Holding PLC';
    const crn = document.getElementById('step2_crn')?.value || currentLoginCrn || '509077205';

    const txt = `VISION BANK CORPORATE ONBOARDING RECEIPT\n==========================================\nApplication Ref: ${appRef}\nSubmitted: ${new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'long', year: 'numeric' })}\nCompany: ${company}\nCRN: ${crn}\n\nNEXT STEPS:\n1. Download Vision Bank Mobile App\n2. Sign in with your registered email\n3. Complete biometric identity verification\n4. Sign digital documents via DocuSign\n5. Final onboarding review: 2-3 business days\n\nRELATIONSHIP MANAGER:\nSarah Al-Qassimi | Corporate Banking\nEmail: s.alqassimi@visionbank.ae | Support: support@visionbank.ae\n`;

    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([txt], { type: 'text/plain' })),
        download: `VisionBank_Application_${appRef}.txt`
    });
    a.click();
    showToast('Onboarding receipt downloaded.', 'Download Complete', 'success');
}

function fireConfetti() {
    const canvas = document.createElement('canvas');
    canvas.classList.add('confetti');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }).map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 5 + 2,
        dx: Math.random() * 4 - 2,
        dy: Math.random() * 4 + 2,
        color: ['#0EA5E9', '#4F46E5', '#8b5cf6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)]
    }));

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.y < canvas.height) active = true;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        if (active) requestAnimationFrame(render);
        else canvas.remove();
    }
    render();
}

// ── KEYBOARD SHORTCUTS & MODAL DISMISSAL ──
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goTo(Math.min(currentStep + 1, totalSteps));
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo(Math.max(currentStep - 1, 1));
    }
});

document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ── INITIALIZATION & SESSION REHYDRATION ON DOM READY ──
window.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initParticles();
    updateNetworkStatus();

    // Session Rehydration: Check if user has an active JWT session
    if (window.VBApi && window.VBApi.isAuthenticated()) {
        try {
            const res = await window.VBApi.getCurrentApplication();
            if (res.success && res.data) {
                const record = res.data;
                currentAppRef = record.application_ref;
                currentLoginCrn = record.crn;
                currentLoginEmail = record.registered_email;

                // Hide login overlay
                const overlay = document.getElementById('loginOverlay');
                if (overlay) overlay.classList.add('hidden');

                // Update Application Reference
                document.querySelectorAll('.app-ref').forEach(el => {
                    el.textContent = 'Application Reference: ' + currentAppRef;
                });

                // Populate form data
                if (record.form_data) {
                    populateFormData(record.form_data);
                }

                // Navigate to saved step
                if (record.current_step && record.current_step > 1) {
                    goTo(record.current_step);
                }
                console.log('✅ [SESSION] Successfully rehydrated session for Application:', currentAppRef);
            }
        } catch (err) {
            console.warn('Session expired or invalid, please sign in:', err.message);
            window.VBApi.clearToken();
            const overlay = document.getElementById('loginOverlay');
            if (overlay) overlay.classList.remove('hidden');
        }
    } else {
        // Show login overlay
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.classList.remove('hidden');
    }
});
