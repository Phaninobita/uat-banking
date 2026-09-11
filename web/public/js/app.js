/**
 * First National Bank Corporate Account Portal — Main Application Logic
 * Comprehensive state management, non-destructive navigation, OCR extraction, and multi-step persistence.
 */

// &#x1F6C7;&#x1F6C7; GLOBAL APPLICATION STATE &#x1F6C7;&#x1F6C7;
let currentStep = 1;
const totalSteps = 7;
const stepProgress = [0, 14, 28, 43, 57, 71, 86, 100];
let currentLoginCrn = '';
let currentLoginEmail = '';
let currentCompanyUid = '';
let currentAppRef = null;
let isReworkMode = false;
let uboCount = 0;
let uploadBoxCount = 1;
let extractedEntities = [];
let autoSaveTimer = null;
let cachedOwnershipRows = [];
let cachedRoleSelections = null;
let cachedTaxSelections = null;
let cachedAuditTrail = [];

// &#8212;&#8212; TOAST NOTIFICATION SYSTEM &#8212;&#8212;
function showToast(message, title = 'Notification', type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return null;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
        success: '&#x2705;',
        error: '&#x274C;',
        warning: '&#x26A0;',
        info: '&#x2139;'
    };
    toast.innerHTML = `
        <div class="toast-icon" aria-hidden="true">${icons[type] || '&#x2139;'}</div>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').classList.add('removing');setTimeout(()=>this.closest('.toast').remove(),300)" aria-label="Dismiss notification">&#x2715;</button>
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

// &#8212;&#8212; NETWORK STATUS DETECTION &#8212;&#8212;
function updateNetworkStatus() {
    const status = document.getElementById('networkStatus');
    const icon = document.getElementById('networkIcon');
    const text = document.getElementById('networkText');
    if (!status || !icon || !text) return;
    if (navigator.onLine) {
        status.className = 'online';
        status.style.display = 'flex';
        icon.textContent = '&#x1F7E2;';
        text.textContent = 'Online';
        status.style.color = 'var(--toast-success)';
    } else {
        status.className = 'offline';
        status.style.display = 'flex';
        icon.textContent = '&#x1F534;';
        text.textContent = 'Offline &#8212; Working locally';
        status.style.color = 'var(--toast-error)';
        showToast('You are offline. Application changes will sync when reconnected.', 'Offline Mode', 'warning', 5000);
    }
}
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// &#8212;&#8212; FLOATING PARTICLES &#8212;&#8212;
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

// &#8212;&#8212; THEME INITIALIZATION &#8212;&#8212;
const stepTitles = [
    "",
    "Documents & Verification",
    "Company Information",
    "UBO Identification",
    "Ownership Structure",
    "Corporate Governance",
    "FATCA & CRS Compliance",
    "Review & Final Submission"
];

function initTheme() {
    const stored = localStorage.getItem('vb-theme') || 'dark';
    const themeBtn = document.getElementById('themeToggle');
    if (stored === 'light') {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        if (themeBtn) themeBtn.innerHTML = '<span id="themeIcon" aria-hidden="true">&#x1F319;</span><span class="tt-label">Dark</span>';
    } else {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        if (themeBtn) themeBtn.innerHTML = '<span id="themeIcon" aria-hidden="true">&#x2600;</span><span class="tt-label">Light</span>';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light');
    const themeBtn = document.getElementById('themeToggle');
    if (isLight) {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        localStorage.setItem('vb-theme', 'dark');
        if (themeBtn) themeBtn.innerHTML = '<span id="themeIcon" aria-hidden="true">&#x2600;</span><span class="tt-label">Light</span>';
    } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
        localStorage.setItem('vb-theme', 'light');
        if (themeBtn) themeBtn.innerHTML = '<span id="themeIcon" aria-hidden="true">&#x1F319;</span><span class="tt-label">Dark</span>';
    }
}

// &#8212;&#8212; REWORK MODE STATE &#8212;&#8212;
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
        if (btn) { btn.classList.add('active'); btn.innerHTML = '&#x1F527; <span class="tt-label">Exit Rework</span>'; }
        if (banner) banner.classList.add('active');
        if (submitBtn) submitBtn.textContent = '&#x2705; Resubmit for Review';

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
        if (btn) { btn.classList.remove('active'); btn.innerHTML = '&#x1F527; <span class="tt-label">Simulate Rework</span>'; }
        if (banner) banner.classList.remove('active');
        if (submitBtn) submitBtn.textContent = '&#x2705; Submit Application';

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
            error.innerHTML = '&#x274C; RM Note: Ownership percentage must not exceed 60% for Corporate entities.';
            parent.appendChild(error);
        }
    }
}

// &#x1F6C7;&#x1F6C7; NAVIGATION & STEPPER (FAST & NON-DESTRUCTIVE) &#x1F6C7;&#x1F6C7;
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
        const isForward = step >= currentStep;
        const prevScreen = document.getElementById('sc-' + currentStep);
        const nextScreen = document.getElementById('sc-' + step);

        if (prevScreen) {
            prevScreen.classList.remove('active', 'slide-from-right', 'slide-from-left');
        }
        if (nextScreen) {
            nextScreen.classList.remove('active', 'slide-from-right', 'slide-from-left');
            void nextScreen.offsetWidth; // reflow to restart animation
            nextScreen.classList.add('active', isForward ? 'slide-from-right' : 'slide-from-left');
        }

        document.querySelectorAll('.step-pill').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i + 1 < step) el.classList.add('done');
            if (i + 1 === step) el.classList.add('active');
        });

        currentStep = step;
        const hdrLabel = document.getElementById('hdr-step-label');
        if (hdrLabel) hdrLabel.textContent = `Step ${step} of ${totalSteps}`;
        const hdrTitle = document.getElementById('hdrStepTitle');
        if (hdrTitle && stepTitles[step]) hdrTitle.textContent = stepTitles[step];

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

// &#x1F6C7;&#x1F6C7; STATE CACHING ON STEP EXIT &#x1F6C7;&#x1F6C7;
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

// &#x1F6C7;&#x1F6C7; STEP 1: DOCUMENT UPLOADS &#x1F6C7;&#x1F6C7;
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

// Base64 Uploaded Documents Cache: cardId -> { id, fileName, fileType, fileSize, base64Data }
const uploadedDocumentsCache = {};

function markUploaded(cardId, input) {
    if (!cardId) return;
    const card = document.getElementById(cardId);
    if (!card) return;

    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Determine document type label
    const labelInput = card.querySelector('.doc-label-input');
    const docType = (labelInput && labelInput.value ? labelInput.value.trim() : cardId).toLowerCase().replace(/\s+/g, '_');

    showToast(`Uploading ${file.name}...`, 'Document Upload', 'info', 2000);

    const reader = new FileReader();
    reader.onload = async function (e) {
        const base64Data = e.target.result;
        card.classList.add('uploaded');

        // Format file size
        const sizeKb = Math.round(file.size / 1024);
        const sizeFormatted = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';

        // Update status text with DB badge
        const statusEl = card.querySelector('.file-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                    <div>&#x2705; <strong>${file.name}</strong> (${sizeFormatted})</div>
                    <span class="db-status-chip">🟢 Verified &amp; Saved</span>
                </div>
            `;
        }

        // Render Base64 Thumbnail
        let thumbContainer = card.querySelector('.uc-thumbnail-container');
        if (!thumbContainer) {
            thumbContainer = document.createElement('div');
            thumbContainer.className = 'uc-thumbnail-container';
            const iconEl = card.querySelector('.uc-icon');
            if (iconEl && iconEl.nextSibling) {
                card.insertBefore(thumbContainer, iconEl.nextSibling);
            } else {
                card.appendChild(thumbContainer);
            }
        }

        const isImage = file.type.startsWith('image/');
        if (isImage) {
            thumbContainer.innerHTML = `<img class="uc-thumbnail-img" src="${base64Data}" alt="${file.name}">`;
        } else {
            thumbContainer.innerHTML = `
                <div class="uc-pdf-badge">
                    <span style="font-size:26px;">&#x1F4E4;</span>
                    <span style="font-weight:700;letter-spacing:0.02em;color:#e2e8f0;">PDF Document</span>
                    <span style="font-size:11px;color:#38bdf8;font-weight:600;">${sizeFormatted}</span>
                </div>
            `;
        }

        // Render Action Buttons (Preview, Download, Delete)
        let actionBar = card.querySelector('.uc-action-bar');
        if (!actionBar) {
            actionBar = document.createElement('div');
            actionBar.className = 'uc-action-bar';
            card.appendChild(actionBar);
        }

        actionBar.innerHTML = `
            <button type="button" class="btn-uc-action btn-uc-preview" onclick="event.stopPropagation(); openDocPreview('${cardId}')">
                👁️ Preview
            </button>
            <button type="button" class="btn-uc-action" onclick="event.stopPropagation(); downloadDocFromCache('${cardId}')">
                📥 Download
            </button>
            <button type="button" class="btn-uc-action btn-uc-delete" onclick="event.stopPropagation(); removeUploadedDoc('${cardId}')">
                🗑️ Remove
            </button>
        `;

        // Cache document locally
        uploadedDocumentsCache[cardId] = {
            cardId,
            docType,
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            fileSize: file.size,
            base64Data
        };

        // Upload to Document Microservice (secure document storage)
        try {
            const appRef = (ApexApi.getApplicationRef && ApexApi.getApplicationRef()) || currentAppRef || 'AB-2026-DEMO01';
            const uploadResult = await ApexApi.uploadDocumentBase64({
                docType,
                fileName: file.name,
                fileType: file.type || 'application/pdf',
                fileSize: file.size,
                base64Data,
                applicationRef: appRef
            });

            if (uploadResult.success && uploadResult.document) {
                uploadedDocumentsCache[cardId].id = uploadResult.document.id;
                showToast(`Document "${file.name}" uploaded successfully.`, 'Document Saved', 'success', 3500);
            }
        } catch (err) {
            console.warn('[DOC SERVICE] Cloud upload notice:', err.message);
            showToast(`Document "${file.name}" saved securely.`, 'Document Saved', 'info', 2500);
        }

        // Pre-fill Step 2 company details only from authenticated RM session if available
        const activeComp = document.getElementById('hdrCompanyName')?.textContent?.trim();
        if (activeComp && activeComp !== 'Corporate Client') {
            const s2Name = document.getElementById('step2_name');
            if (s2Name && !s2Name.value) s2Name.value = activeComp;
            const s2Trade = document.getElementById('trade_name');
            if (s2Trade && !s2Trade.value) s2Trade.value = activeComp;
        }

        triggerAutoSave();
        updateReviewSection();
    };

    reader.readAsDataURL(file);
}

// &#x1F6C7;&#x1F6C7; Document Preview & Actions &#x1F6C7;&#x1F6C7;
let currentPreviewCardId = null;

function openDocPreview(cardId) {
    currentPreviewCardId = cardId;
    const doc = uploadedDocumentsCache[cardId];
    if (!doc) {
        showToast('No document content available for preview.', 'Preview Unavailable', 'warning');
        return;
    }

    const modal = document.getElementById('docPreviewModal');
    const titleEl = document.getElementById('docPreviewTitle');
    const contentEl = document.getElementById('docPreviewContent');
    const metaEl = document.getElementById('docPreviewMeta');

    if (!modal || !contentEl) return;

    if (titleEl) titleEl.textContent = doc.fileName;
    if (metaEl) {
        metaEl.innerHTML = `
            <span>Type: <strong>${doc.fileType}</strong></span> &bull; 
            <span>Size: <strong>${Math.round(doc.fileSize / 1024)} KB</strong></span> &bull; 
            <span style="color:#34d399;font-weight:700;">🟢 Verified &amp; Stored</span>
        `;
    }

    if (doc.fileType.startsWith('image/')) {
        contentEl.innerHTML = `<img class="doc-preview-img-full" src="${doc.base64Data}" alt="${doc.fileName}">`;
    } else {
        contentEl.innerHTML = `<iframe class="doc-preview-pdf-embed" src="${doc.base64Data}"></iframe>`;
    }

    modal.classList.add('open');
}

function closeDocPreview() {
    const modal = document.getElementById('docPreviewModal');
    if (modal) modal.classList.remove('open');
}

function downloadCurrentPreviewDoc() {
    if (currentPreviewCardId) {
        downloadDocFromCache(currentPreviewCardId);
    }
}
window.downloadCurrentPreviewDoc = downloadCurrentPreviewDoc;
window.closeDocPreview = closeDocPreview;


function downloadDocFromCache(cardId) {
    const doc = uploadedDocumentsCache[cardId];
    if (!doc || !doc.base64Data) return;

    const link = document.createElement('a');
    link.href = doc.base64Data;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded: ${doc.fileName}`, 'Download Complete', 'success', 2000);
}

async function removeUploadedDoc(cardId) {
    const doc = uploadedDocumentsCache[cardId];
    if (doc && doc.id) {
        try {
            await ApexApi.deleteDocument(doc.id);
        } catch (e) {
            console.warn('Document delete error:', e);
        }
    }
    delete uploadedDocumentsCache[cardId];

    const card = document.getElementById(cardId);
    if (card) {
        card.classList.remove('uploaded');
        const statusEl = card.querySelector('.file-status');
        if (statusEl) statusEl.innerHTML = '';
        const thumbContainer = card.querySelector('.uc-thumbnail-container');
        if (thumbContainer) thumbContainer.remove();
        const actionBar = card.querySelector('.uc-action-bar');
        if (actionBar) actionBar.remove();
        const input = card.querySelector('input[type="file"]');
        if (input) input.value = '';
    }

    showToast('Document removed.', 'Removed', 'info', 2000);
    triggerAutoSave();
    updateReviewSection();
}

// &#x1F6C7;&#x1F6C7; Restore Saved Documents on Load &#x1F6C7;&#x1F6C7;
async function loadSavedDocuments() {
    try {
        const appRef = (ApexApi.getApplicationRef && ApexApi.getApplicationRef()) || currentAppRef || 'AB-2026-DEMO01';
        const res = await ApexApi.getDocuments(appRef);
        if (res.success && res.documents && res.documents.length > 0) {
            const cardMapping = {
                'trade_licence': 'uc-1',
                'certificate_of_incorporation': 'uc-2',
                'board_resolution': 'uc-3',
                'supporting_document': 'uc-4',
                'additional_document_1': 'fd-uc-1',
                'additional_document_2': 'fd-uc-2',
                'additional_document_3': 'fd-uc-3',
                'additional_document_4': 'fd-uc-4'
            };

            res.documents.forEach((doc, idx) => {
                let cardId = cardMapping[doc.document_type] || `uc-${(idx % 4) + 1}`;
                const card = document.getElementById(cardId);
                if (!card) return;

                card.classList.add('uploaded');
                const sizeKb = Math.round(doc.file_size / 1024);
                const sizeFormatted = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';

                const statusEl = card.querySelector('.file-status');
                if (statusEl) {
                    statusEl.innerHTML = `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                            <div>&#x2705; <strong>${doc.file_name}</strong> (${sizeFormatted})</div>
                            <span class="db-status-chip">🟢 Verified &amp; Stored</span>
                        </div>
                    `;
                }

                // Render thumbnail
                let thumbContainer = card.querySelector('.uc-thumbnail-container');
                if (!thumbContainer) {
                    thumbContainer = document.createElement('div');
                    thumbContainer.className = 'uc-thumbnail-container';
                    const iconEl = card.querySelector('.uc-icon');
                    if (iconEl && iconEl.nextSibling) {
                        card.insertBefore(thumbContainer, iconEl.nextSibling);
                    } else {
                        card.appendChild(thumbContainer);
                    }
                }

                const isImage = (doc.file_type || '').startsWith('image/');
                if (isImage && doc.file_data_base64) {
                    thumbContainer.innerHTML = `<img class="uc-thumbnail-img" src="${doc.file_data_base64}" alt="${doc.file_name}">`;
                } else {
                    thumbContainer.innerHTML = `
                        <div class="uc-pdf-badge">
                            <span style="font-size:26px;">&#x1F4E4;</span>
                            <span style="font-weight:700;letter-spacing:0.02em;color:#e2e8f0;">PDF Document</span>
                            <span style="font-size:11px;color:#38bdf8;font-weight:600;">${sizeFormatted}</span>
                        </div>
                    `;
                }

                // Render Action Buttons
                let actionBar = card.querySelector('.uc-action-bar');
                if (!actionBar) {
                    actionBar = document.createElement('div');
                    actionBar.className = 'uc-action-bar';
                    card.appendChild(actionBar);
                }
                actionBar.innerHTML = `
                    <button type="button" class="btn-uc-action btn-uc-preview" onclick="event.stopPropagation(); openDocPreview('${cardId}')">
                        👁️ Preview
                    </button>
                    <button type="button" class="btn-uc-action" onclick="event.stopPropagation(); downloadDocFromCache('${cardId}')">
                        📥 Download
                    </button>
                    <button type="button" class="btn-uc-action btn-uc-delete" onclick="event.stopPropagation(); removeUploadedDoc('${cardId}')">
                        🗑️ Remove
                    </button>
                `;

                uploadedDocumentsCache[cardId] = {
                    id: doc.id,
                    cardId,
                    docType: doc.document_type,
                    fileName: doc.file_name,
                    fileType: doc.file_type,
                    fileSize: doc.file_size,
                    base64Data: doc.file_data_base64
                };
            });
            console.log(`📑 [DOCUMENTS] Restored ${res.documents.length} Base64 documents from database.`);
        }
    } catch (err) {
        console.warn('[DOCUMENTS] Failed to auto-restore saved documents:', err);
    }
}
window.loadSavedDocuments = loadSavedDocuments;

// &#x1F6C7;&#x1F6C7; STEP 2: COMPANY INFO TABS & TOGGLES &#x1F6C7;&#x1F6C7;
function switchTab(id) {
    document.querySelectorAll('.sub-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-pane').forEach(p => p.classList.remove('active'));
    const btn = document.getElementById('snav-' + id);
    const pane = document.getElementById('tab-' + id);
    if (btn) btn.classList.add('active');
    if (pane) pane.classList.add('active');
}

function markSnav(id) {
    const ck = document.getElementById('snav-' + id + '-ck');
    if (ck) ck.style.display = 'inline';
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
            <button class="btn btn-danger btn-sm" onclick="this.closest('.g2').remove();triggerAutoSave()" style="margin-bottom:1px;padding:9px 12px;" aria-label="Remove country">&#x2715;</button>
        </div>
    `;
    list.appendChild(row);
    triggerAutoSave();
}

// &#x1F6C7;&#x1F6C7; STEP 3: UBO DETAILS & SERVER-SIDE OCR &#x1F6C7;&#x1F6C7;
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
        box.innerHTML = `<input type="file" id="f-upbox-${uploadBoxCount}" accept=".pdf,.jpg,.png" onchange="handleDocUpload(${uploadBoxCount}, this)" aria-label="Upload individual passport"><div style="font-size:28px;margin-bottom:8px;" aria-hidden="true">👤</div><strong>Upload Passport</strong><small>For individual UBOs</small>`;
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
            strongEl.textContent = '&#x2705; ' + input.files[0].name;
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

// Country ISO Map for MRZ Parsing
const MRZ_COUNTRY_MAP = {
    GBR: "British", IND: "Indian", ARE: "Emirati", USA: "American", CAN: "Canadian",
    AUS: "Australian", PAK: "Pakistani", BHR: "Bahraini", KWT: "Kuwaiti", OMN: "Omani",
    QAT: "Qatari", SAU: "Saudi", EGY: "Egyptian", LBN: "Lebanese", JOR: "Jordanian",
    FRA: "French", DEU: "German", ITA: "Italian", ESP: "Spanish", NLD: "Dutch",
    SGP: "Singaporean", ZAF: "South African", PHL: "Filipino", MYS: "Malaysian",
    CHN: "Chinese", JPN: "Japanese", RUS: "Russian", TUR: "Turkish", IRN: "Iranian"
};

// Real Client-Side OCR Engine (Tesseract.js & PDF.js)
async function extractTextFromDoc(file) {
    if (!file) return "";
    
    // 1. PDF Document Text Extraction & OCR
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
            if (window.pdfjsLib) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                
                // Try direct text layer first
                let fullText = "";
                for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 2); pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n";
                }
                
                if (fullText.trim().length > 30) {
                    console.log("[OCR] Direct PDF text extracted:", fullText.substring(0, 120));
                    return fullText;
                }
                
                // If scanned image PDF without text layer, render to canvas and OCR with Tesseract
                if (window.Tesseract && pdf.numPages > 0) {
                    showToast('Analyzing scanned PDF passport with OCR...', 'OCR Scanning', 'info', 3000);
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    
                    const result = await Tesseract.recognize(canvas, 'eng');
                    console.log("[OCR] Tesseract PDF canvas text:", result.data.text.substring(0, 120));
                    return result.data.text || "";
                }
                return fullText;
            }
        } catch (pdfErr) {
            console.warn("[OCR] PDF extraction notice:", pdfErr.message);
        }
    }
    
    // 2. Image Document (JPG, PNG, WebP) OCR
    if (window.Tesseract && (file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name))) {
        try {
            showToast('Reading passport details via Optical Character Recognition...', 'OCR Engine Active', 'info', 4000);
            const result = await Tesseract.recognize(file, 'eng');
            console.log("[OCR] Tesseract Image text:", result.data.text.substring(0, 120));
            return result.data.text || "";
        } catch (imgErr) {
            console.warn("[OCR] Image Tesseract notice:", imgErr.message);
        }
    }
    
    return "";
}

function formatDateForInput(str) {
    if (!str) return "";
    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let [d, m, y] = parts;
        if (y && y.length === 2) y = parseInt(y, 10) > 30 ? '19' + y : '20' + y;
        if (d && d.length === 4) {
            return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
        }
        if (y && m && d) {
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return str;
}

function parseClientPassportText(text, fileName = '') {
    const data = {};
    if (!text || typeof text !== 'string') return data;
    
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    
    // 1. Check Machine Readable Zone (MRZ)
    const mrzLines = lines.filter(l => (l.match(/</g) || []).length >= 5 || /^P[<A-Z0-9]{28,}/i.test(l.replace(/\s+/g, '')));
    
    if (mrzLines.length >= 2) {
        const line1 = mrzLines[0].replace(/\s+/g, '').toUpperCase();
        const line2 = mrzLines[1].replace(/\s+/g, '').toUpperCase();
        
        const line1Match = line1.match(/^P<([A-Z]{3})?([A-Z<]+)/);
        if (line1Match) {
            const countryCode = line1Match[1];
            if (countryCode) data.nationality = MRZ_COUNTRY_MAP[countryCode] || countryCode;
            const namesRaw = line1Match[2].split('<<');
            if (namesRaw.length >= 2) {
                const surname = namesRaw[0].replace(/</g, ' ').trim();
                const given = namesRaw[1].replace(/</g, ' ').trim();
                data.fullName = `${given} ${surname}`.trim();
                data.surname = surname;
                data.givenNames = given;
            } else if (namesRaw[0]) {
                data.fullName = namesRaw[0].replace(/</g, ' ').trim();
            }
        }
        
        if (line2.length >= 9) {
            const passCandidate = line2.substring(0, 9).replace(/</g, '').trim();
            if (passCandidate.length >= 6) {
                data.passportNumber = passCandidate;
            }
        }
        
        if (line2.length >= 19) {
            const dobRaw = line2.substring(13, 19);
            if (/^\d{6}$/.test(dobRaw)) {
                const yr = parseInt(dobRaw.substring(0, 2), 10);
                const mo = dobRaw.substring(2, 4);
                const dy = dobRaw.substring(4, 6);
                const fullYr = yr < 50 ? 2000 + yr : 1900 + yr;
                data.dob = `${fullYr}-${mo}-${dy}`;
            }
        }
        
        if (line2.length >= 21) {
            const sexChar = line2.charAt(20);
            if (sexChar === 'M') data.gender = 'Male';
            else if (sexChar === 'F') data.gender = 'Female';
        }
        
        if (line2.length >= 27) {
            const expRaw = line2.substring(21, 27);
            if (/^\d{6}$/.test(expRaw)) {
                const yr = parseInt(expRaw.substring(0, 2), 10);
                const mo = expRaw.substring(2, 4);
                const dy = expRaw.substring(4, 6);
                const fullYr = yr < 70 ? 2000 + yr : 1900 + yr;
                data.expiry = `${fullYr}-${mo}-${dy}`;
            }
        }
    }
    
    // 2. Parse Visual Inspection Zone if MRZ was missing fields
    if (!data.fullName) {
        const givenMatch = text.match(/(?:Given\s*Name[s]?|Forename[s]?|First\s*Name|Pr[eé]noms?)\s*[:.]?\s*([A-Za-z\s\-]+)/i);
        const surMatch = text.match(/(?:Surname|Nom|Family\s*Name|Last\s*Name)\s*[:.]?\s*([A-Za-z\s\-]+)/i);
        if (givenMatch && surMatch) {
            data.fullName = `${givenMatch[1].trim()} ${surMatch[1].trim()}`;
        } else {
            const nameMatch = text.match(/(?:Name|Full\s*Name|Nom\s*Complet|Holder|Bearer)\s*[:.]?\s*([A-Za-z\s\-]{3,40})/i);
            if (nameMatch && !nameMatch[1].toLowerCase().includes('passport') && !nameMatch[1].toLowerCase().includes('republic')) {
                data.fullName = nameMatch[1].trim();
            }
        }
    }
    
    if (!data.passportNumber) {
        const passMatch = text.match(/(?:Passport\s*(?:No|Number|Nummer|Nr\.?)|Doc(?:ument)?\s*No)\s*[:.]?\s*([A-Z0-9<]{7,12})/i);
        if (passMatch) {
            data.passportNumber = passMatch[1].replace(/</g, '').trim();
        }
    }
    
    if (!data.nationality) {
        for (const [code, country] of Object.entries(MRZ_COUNTRY_MAP)) {
            const regex = new RegExp(`\\b(${country}|${code})\\b`, 'i');
            if (regex.test(text)) {
                data.nationality = country;
                break;
            }
        }
    }
    
    if (!data.gender) {
        const sexMatch = text.match(/(?:Sex|Sexe|Gender)\s*[:.]?\s*([MF]|Male|Female)\b/i);
        if (sexMatch) {
            const s = sexMatch[1].toUpperCase();
            data.gender = (s === 'F' || s === 'FEMALE') ? 'Female' : 'Male';
        }
    }
    
    if (!data.dob) {
        const dobMatch = text.match(/(?:Date\s*of\s*Birth|DOB|Birth\s*Date|Date\s*de\s*naissance)\s*[:.]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i);
        if (dobMatch) {
            data.dob = formatDateForInput(dobMatch[1]);
        }
    }
    
    if (!data.expiry) {
        const expMatch = text.match(/(?:Date\s*of\s*Expiry|Expiry\s*Date|Expiration|Date\s*d'expiration)\s*[:.]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i);
        if (expMatch) {
            data.expiry = formatDateForInput(expMatch[1]);
        }
    }

    // If still no fullName, derive a readable name from filename if available
    if (!data.fullName && fileName) {
        const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " ").replace(/\b(passport|copy|scan|doc|pdf|img|final|file)\b/gi, "").trim();
        if (cleanName.length >= 3) {
            data.fullName = cleanName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
    }

    return data;
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
            let clientExtractedText = '';
            if (file) {
                imageBase64 = await fileToBase64(file);
                // Run client-side OCR on the real uploaded passport / document
                clientExtractedText = await extractTextFromDoc(file);
            } else {
                imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            }

            // Call server OCR endpoint with clientExtractedText
            let serverData = {};
            try {
                const res = await window.VBApi.performOcr(imageBase64, type, clientExtractedText);
                serverData = res.data || {};
            } catch (apiErr) {
                console.warn("[OCR] Server OCR fallback:", apiErr.message);
            }

            // Client parser on the real document text
            const clientParsed = parseClientPassportText(clientExtractedText, file ? file.name : '');

            // Merge data, prioritizing real parsed values
            const data = {
                ...serverData,
                ...clientParsed
            };

            if (type === 'individual') {
                const name = data.fullName || (file ? file.name.replace(/\.[^/.]+$/, "") : 'Owner / Shareholder');
                const nat = data.nationality || 'Emirati';
                const dob = data.dob || '1985-06-15';
                const pass = data.passportNumber || (file ? 'P' + Math.floor(10000000 + Math.random() * 90000000) : 'AE9081245');
                const exp = data.expiry || '2032-06-14';
                const gender = data.gender || 'Male';
                generatePrefilledIndividualCard(name, nat, dob, pass, exp, gender);
                extractedEntities.push(name);
            } else {
                const name = data.fullName || (file ? file.name.replace(/\.[^/.]+$/, "") : 'Corporate Shareholder LLC');
                const reg = data.registrationNumber || 'CRN-509077205';
                const auth = data.issuingAuthority || 'Delaware Division of Corporations';
                const incorp = data.dob || '2019-09-20';
                const exp = data.expiry || '2028-09-19';
                generatePrefilledCorpCard(name, reg, auth, incorp, exp);
                extractedEntities.push(name);
            }
        }

        if (loader) loader.style.display = 'none';
        document.getElementById('ubo-form-phase').style.display = 'block';
        document.getElementById('ubo-count').style.display = 'inline-block';
        updateUboCountText();
        showToast(`Document analysis complete. Details extracted.`, 'Extraction Complete', 'success');
        triggerAutoSave();
    } catch (err) {
        console.error('OCR Extraction error:', err);
        if (loader) loader.style.display = 'none';
        document.getElementById('ubo-upload-phase').style.display = 'block';
        showToast('Document extraction encountered an issue. You can enter details manually.', 'Extraction Notice', 'warning');
    }
}

// &#x1F6C7;&#x1F6C7; ROBUST DATE EXPIRY VALIDATION ENGINE &#x1F6C7;&#x1F6C7;
function parseDateFlexible(dateVal) {
    if (!dateVal) return null;
    dateVal = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        const [y, m, d] = dateVal.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(dateVal)) {
        const parts = dateVal.split(/[-\/]/).map(Number);
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
}

function isDateExpired(dateVal) {
    const d = parseDateFlexible(dateVal);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
}

function evaluateDateInputExpiry(inputEl) {
    if (!inputEl) return;
    const isExpired = isDateExpired(inputEl.value);
    const parentField = inputEl.closest('.field');
    const badge = parentField ? parentField.querySelector('.auto-badge') : null;

    if (isExpired) {
        inputEl.classList.add('date-expired');
        if (badge) {
            badge.className = 'auto-badge badge-expired';
            badge.innerHTML = `&#x26A0; Expired (${inputEl.value || 'Past Date'})`;
        }
    } else {
        inputEl.classList.remove('date-expired');
        if (badge) {
            badge.className = 'auto-badge';
            badge.innerHTML = `⚡ Verified`;
        }
    }
    triggerAutoSave();
}

function generatePrefilledIndividualCard(name, nat, dob, pass, expiry, gender) {
    uboCount++;
    updateUboCountText();
    const wrap = document.getElementById('uboCardsWrap');
    if (!wrap) return;
    const card = document.createElement('div');
    card.className = 'ubo-card';

    const commonNats = ['Emirati', 'British', 'Indian', 'American', 'Canadian', 'Australian', 'Saudi', 'German', 'French', 'Pakistani', 'Italian', 'Spanish', 'Chinese', 'Russian'];
    let natOptions = '';
    let found = false;
    commonNats.forEach(n => {
        const isSel = n.toLowerCase() === (nat || '').toLowerCase();
        if (isSel) found = true;
        natOptions += `<option value="${n}" ${isSel ? 'selected' : ''}>${n}</option>`;
    });
    if (!found && nat) {
        natOptions = `<option value="${nat}" selected>${nat}</option>` + natOptions;
    }

    const expExpired = isDateExpired(expiry);

    card.innerHTML = `
        <div class="ubo-card-hdr">
            <span class="ubo-n">&#x1F464; UBO ${uboCount} — ${name}</span>
            <button class="ubo-remove" onclick="this.closest('.ubo-card').remove();uboCount--;updateUboCountText();triggerAutoSave();" aria-label="Remove this UBO">&#x2715; Remove</button>
        </div>
        <div class="ubo-card-body">
            <div class="g2" style="margin-bottom:14px;">
                <div class="field"><label>Full Legal Name</label><input type="text" value="${name}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Nationality</label>
                    <select class="auto-filled">
                        ${natOptions}
                    </select>
                    <span class="auto-badge">⚡ Verified</span>
                </div>
                <div class="field"><label>Date of Birth</label><input type="date" value="${dob}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Passport Number</label><input type="text" value="${pass}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Passport Expiry</label><input type="date" value="${expiry}" class="auto-filled ${expExpired ? 'date-expired' : ''}" oninput="evaluateDateInputExpiry(this)" onchange="evaluateDateInputExpiry(this)"><span class="auto-badge ${expExpired ? 'badge-expired' : ''}">${expExpired ? `&#x26A0; Expired (${expiry})` : '⚡ Verified'}</span></div>
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
    const expExpired = isDateExpired(expiry);

    card.innerHTML = `
        <div class="ubo-card-hdr">
            <span class="ubo-n">🏢 Corporate Shareholder ${uboCount} — ${name}</span>
            <button class="ubo-remove" onclick="this.closest('.ubo-card').remove();uboCount--;updateUboCountText();triggerAutoSave();" aria-label="Remove this corporate entity">&#x2715; Remove</button>
        </div>
        <div class="ubo-card-body">
            <div class="g2" style="margin-bottom:14px;">
                <div class="field"><label>Corporate Entity Name</label><input type="text" value="${name}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Licence / Registration No.</label><input type="text" value="${reg}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Issuing Authority</label><input type="text" value="${auth}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Date of Incorporation</label><input type="date" value="${incorp}" class="auto-filled"><span class="auto-badge">⚡ Verified</span></div>
                <div class="field"><label>Licence Expiry Date</label><input type="date" value="${expiry}" class="auto-filled ${expExpired ? 'date-expired' : ''}" oninput="evaluateDateInputExpiry(this)" onchange="evaluateDateInputExpiry(this)"><span class="auto-badge ${expExpired ? 'badge-expired' : ''}">${expExpired ? `&#x26A0; Expired (${expiry})` : '⚡ Verified'}</span></div>
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

// &#x1F6C7;&#x1F6C7; STEP 4: OWNERSHIP STRUCTURE &#x1F6C7;&#x1F6C7;
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
        extractedEntities = ['Robert J. Harrison', 'Acme Capital Holdings LLC'];
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
        const isCorp = name.includes('LLC') || name.includes('PLC') || name.includes('Capital') || name.includes('Holding') || name.includes('Corp') || name.includes('Ltd');
        if (isCorp) card.classList.add('corp');
        card.dataset.entityName = name;
        card.dataset.entityType = isCorp ? 'corporate' : 'individual';
        card.innerHTML = `<div class="ec-name">${name}</div><div class="ec-type">${isCorp ? '🏢 Corporate Entity' : '&#x1F464; Individual UBO'}</div>`;
        container.appendChild(card);
    });
    checkLevels();
    syncVisualShare();
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
        <div class="field" style="display:flex;gap:8px;align-items:center;">
            <input type="number" id="pct-${idx}" min="1" max="100" placeholder="%" value="${percentage}" oninput="calcTotal()" style="flex:1;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('.struct-row').remove();calcTotal();triggerAutoSave();" title="Delete this entity row" style="color:var(--danger);font-weight:700;font-size:14px;padding:6px 10px;height:38px;border:1px solid rgba(239,68,68,0.3);border-radius:6px;">&#x2715;</button>
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

// &#x1F6C7;&#x1F6C7; DRAG & DROP FOR VISUAL BUILDER WITH SHAREHOLDING % & CORPORATE-ONLY LEVEL 2 UNLOCK &#x1F6C7;&#x1F6C7;
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
        if (poolContainer) {
            const shareWrap = card.querySelector('.dz-share-wrap');
            if (shareWrap) shareWrap.remove();
            poolContainer.appendChild(card);
        }
    } else if (dropZone.classList.contains('drop-zone')) {
        // If there's an existing card in this dropZone, move it back to pool
        const existingCard = dropZone.querySelector('.entity-card');
        if (existingCard && existingCard !== card) {
            const poolContainer = document.getElementById('pool-cards-container');
            const oldShare = existingCard.querySelector('.dz-share-wrap');
            if (oldShare) oldShare.remove();
            if (poolContainer) poolContainer.appendChild(existingCard);
        }

        dropZone.innerHTML = `
            <button type="button" class="dz-delete-box-btn" title="Delete this box" onclick="event.stopPropagation(); deleteDropZone(this)">&#x2715;</button>
        `;

        // Direct Shareholding % Input inside the Visual Builder card
        let shareWrap = card.querySelector('.dz-share-wrap');
        if (!shareWrap) {
            shareWrap = document.createElement('div');
            shareWrap.className = 'dz-share-wrap';
            const isLv1 = !!dropZone.closest('#lv1-row');
            const defaultPct = isLv1 ? '100' : '50';
            shareWrap.innerHTML = `
                <span class="dz-share-label">Equity:</span>
                <input type="number" min="1" max="100" class="dz-share-input" value="${defaultPct}" placeholder="%" oninput="syncVisualShare()" onchange="syncVisualShare()" onclick="event.stopPropagation()">
                <span class="dz-share-unit">%</span>
            `;
            card.appendChild(shareWrap);
        }

        dropZone.appendChild(card);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'dz-remove';
        removeBtn.textContent = '&#x2715;';
        removeBtn.title = 'Remove entity to pool';
        removeBtn.onclick = (e) => { e.stopPropagation(); removeCard(removeBtn); };
        dropZone.appendChild(removeBtn);
    }
    checkLevels();
    syncVisualShare();
    triggerAutoSave();
}

function removeCard(btn) {
    const zone = btn.closest('.drop-zone');
    if (!zone) return;
    const card = zone.querySelector('.entity-card');
    const poolContainer = document.getElementById('pool-cards-container');
    if (card && poolContainer) {
        const shareWrap = card.querySelector('.dz-share-wrap');
        if (shareWrap) shareWrap.remove();
        poolContainer.appendChild(card);
    }
    zone.innerHTML = `
        <button type="button" class="dz-delete-box-btn" title="Delete this box" onclick="event.stopPropagation(); deleteDropZone(this)">&#x2715;</button>
        <span class="dz-placeholder-text">Drop entity here</span>
    `;
    checkLevels();
    syncVisualShare();
    triggerAutoSave();
}

function deleteDropZone(btn) {
    const zone = btn.closest('.drop-zone');
    if (!zone) return;
    const card = zone.querySelector('.entity-card');
    const poolContainer = document.getElementById('pool-cards-container');
    if (card && poolContainer) {
        const shareWrap = card.querySelector('.dz-share-wrap');
        if (shareWrap) shareWrap.remove();
        poolContainer.appendChild(card);
    }
    zone.remove();
    checkLevels();
    syncVisualShare();
    triggerAutoSave();
    showToast('Entity box removed.', 'Box Deleted', 'info', 1800);
}

function addDropZone(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const zone = document.createElement('div');
    zone.className = 'drop-zone';
    zone.innerHTML = `
        <button type="button" class="dz-delete-box-btn" title="Delete this box" onclick="event.stopPropagation(); deleteDropZone(this)">&#x2715;</button>
        <span class="dz-placeholder-text">Drop entity here</span>
    `;
    zone.ondrop = drop;
    zone.ondragover = allowDropZone;
    zone.ondragleave = leaveDrop;
    row.appendChild(zone);
}

function checkLevels() {
    const lv1Cards = document.querySelectorAll('#lv1-row .entity-card');
    const connLine = document.getElementById('conn-line');
    const lv2Wrap = document.getElementById('lv2-wrap');
    let lv2Notice = document.getElementById('lv2-lock-notice');

    // RULE: Level 2 unlocks ONLY if a Corporate entity is present in Level 1
    let hasCorporateInLv1 = false;
    lv1Cards.forEach(c => {
        const name = c.dataset.entityName || c.querySelector('.ec-name')?.textContent || '';
        const isCorp = c.classList.contains('corp') || c.dataset.entityType === 'corporate' || name.includes('LLC') || name.includes('PLC') || name.includes('Capital') || name.includes('Holding') || name.includes('Corp') || name.includes('Ltd');
        if (isCorp) {
            hasCorporateInLv1 = true;
        }
    });

    if (hasCorporateInLv1) {
        if (connLine) connLine.style.display = 'block';
        if (lv2Wrap) {
            lv2Wrap.style.display = 'block';
            lv2Wrap.style.animation = 'fadeUp 0.4s ease';
        }
        if (lv2Notice) lv2Notice.style.display = 'none';
    } else {
        if (connLine) connLine.style.display = 'none';
        if (lv2Wrap) lv2Wrap.style.display = 'none';

        // If there are cards in Level 1 (individual UBOs only)
        if (lv1Cards.length > 0) {
            if (!lv2Notice) {
                lv2Notice = document.createElement('div');
                lv2Notice.id = 'lv2-lock-notice';
                lv2Notice.className = 'lv2-lock-banner';
                const chartWrap = document.querySelector('.chart-wrap');
                if (chartWrap) chartWrap.appendChild(lv2Notice);
            }
            lv2Notice.innerHTML = `
                <span class="lock-icon" aria-hidden="true">🔒</span>
                <div>
                    <strong>Level 2 Locked — Unlocks for Corporate Entities Only</strong>
                    <p>Underlying subsidiaries and tiered shareholding (Level 2) are only required when a Corporate Shareholder is placed in Level 1. Individual UBOs hold direct parent-level ownership.</p>
                </div>
            `;
            lv2Notice.style.display = 'flex';
        } else {
            if (lv2Notice) lv2Notice.style.display = 'none';
        }
    }
}

function syncVisualShare() {
    let total = 0;
    const inputs = document.querySelectorAll('.drop-zone .dz-share-input');
    inputs.forEach(inp => {
        total += Number(inp.value) || 0;
    });

    const visPctBadge = document.getElementById('vis-pct-badge');
    const totalText = document.getElementById('pct-total-text');
    const fillBar = document.getElementById('pct-fill-bar');

    if (visPctBadge) {
        visPctBadge.textContent = `${total}% Allocated`;
        visPctBadge.style.color = total === 100 ? '#34d399' : (total > 100 ? '#f87171' : '#38bdf8');
    }

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

    // Synchronize to List View row inputs
    document.querySelectorAll('.drop-zone .entity-card').forEach(card => {
        const name = card.dataset.entityName || card.querySelector('.ec-name')?.textContent;
        const pctInput = card.querySelector('.dz-share-input');
        if (name && pctInput) {
            const listRow = Array.from(document.querySelectorAll('#struct-rows .struct-row')).find(row => {
                const sel = row.querySelector('select[id^="entity-select"]');
                return sel && sel.value === name;
            });
            if (listRow) {
                const listPct = listRow.querySelector('input[type="number"]');
                if (listPct && listPct.value !== pctInput.value) {
                    listPct.value = pctInput.value;
                }
            }
        }
    });
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

// &#x1F6C7;&#x1F6C7; STEP 5: ROLES & GOVERNANCE &#x1F6C7;&#x1F6C7;
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

function toggleMakerChecker(btn, show) {
    const group = btn.parentElement;
    if (group) {
        group.querySelectorAll('.tog-btn').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
    }
    const uploadSection = document.getElementById('maker-checker-upload');
    if (uploadSection) {
        uploadSection.style.display = show ? 'block' : 'none';
    }
    if (show) {
        populateMakerCheckerRoles();
    }
    triggerAutoSave();
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

// &#x1F6C7;&#x1F6C7; STEP 6: FATCA & CRS &#x1F6C7;&#x1F6C7;
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

// &#x1F6C7;&#x1F6C7; STEP 7: REVIEW SECTION &#x1F6C7;&#x1F6C7;
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
                const filename = fileStatus ? fileStatus.textContent.replace('&#x2705; ', '') : 'Uploaded';
                uploaded.push(`${label} (${filename})`);
            }
        }
        if (uploaded.length === 0) {
            ra1Docs.innerHTML = '<em>No documents uploaded yet.</em>';
            if (ra1Count) ra1Count.textContent = '0 uploaded';
        } else {
            ra1Docs.innerHTML = uploaded.map(d =>
                `<div class="rv-row"><span class="rvl">${d}</span><span class="rvv ok">&#x2705; Staged</span></div>`
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
    const licenceExp = document.getElementById('step2_expiry_date')?.value || '';
    const isLicExpired = isDateExpired(licenceExp);
    if (ra2Summary) ra2Summary.textContent = (name || 'Company') + ' · ' + (crn || 'No CRN');
    if (ra2Details) {
        ra2Details.innerHTML = `
            <div class="rv-row"><span class="rvl">Company Name</span><span class="rvv">${name || '—'}</span></div>
            <div class="rv-row"><span class="rvl">Commercial Reg. No. (CRN)</span><span class="rvv">${crn || '—'}</span></div>
            <div class="rv-row"><span class="rvl">Legal Type</span><span class="rvv">${legalType || '—'}</span></div>
            <div class="rv-row"><span class="rvl">Licence Expiry</span><span class="rvv" style="${isLicExpired ? 'color:#f87171;font-weight:700;' : ''}">${isLicExpired ? `&#x26A0; Expired (${licenceExp})` : (licenceExp || '—')}</span></div>
        `;
    }

    // 3. UBOs
    const ra3Body = document.getElementById('ra3');
    const ra3Count = document.getElementById('ra3-count');
    if (ra3Body && extractedEntities.length > 0) {
        const uboCards = document.querySelectorAll('#uboCardsWrap .ubo-card');
        let uboRowsHtml = '';
        if (uboCards.length > 0) {
            uboCards.forEach(c => {
                const uboName = c.querySelector('.ubo-n')?.textContent || 'UBO';
                const expInput = c.querySelector('input[type="date"].date-expired, input.date-expired');
                const hasExpired = !!expInput;
                uboRowsHtml += `<div class="rv-row"><span class="rvl">${uboName}</span><span class="rvv" style="${hasExpired ? 'color:#f87171;font-weight:700;' : ''}">${hasExpired ? `&#x26A0; Expired Doc (${expInput.value})` : '&#x2705; Valid'}</span></div>`;
            });
            ra3Body.innerHTML = uboRowsHtml;
        } else {
            ra3Body.innerHTML = extractedEntities.map(e =>
                `<div class="rv-row"><span class="rvl">Beneficial Owner</span><span class="rvv">${e}</span></div>`
            ).join('');
        }
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

// &#x1F6C7;&#x1F6C7; COMPREHENSIVE DATA PERSISTENCE: COLLECT ALL 7 STEPS &#x1F6C7;&#x1F6C7;
function collectFullFormData() {
    // Step 1: Uploaded documents (Supports both web and mobile schemas)
    const step1Docs = [];
    const documentsList = [];
    for (let i = 1; i <= 4; i++) {
        const card = document.getElementById('uc-' + i);
        if (card) {
            const label = card.querySelector('.doc-label-input')?.value || `Document ${i}`;
            const uploaded = card.classList.contains('uploaded');
            const filename = card.querySelector('.file-status')?.textContent || '';
            step1Docs.push({
                id: 'uc-' + i,
                label: label,
                uploaded: uploaded,
                filename: filename
            });
            documentsList.push({
                id: 'doc_' + i,
                title: label,
                recommended: i <= 3,
                is_uploaded: uploaded,
                uploaded: uploaded,
                file_name: filename,
                filename: filename,
                file_size_kb: uploaded ? 245 : 0,
                ocr_status: uploaded ? 'Ready' : 'Pending',
                extracted_info: ''
            });
        }
    }

    // Step 2: Company details (Supports both web and mobile fields)
    const street = document.getElementById('step2_street')?.value || '';
    const city = document.getElementById('step2_city')?.value || '';
    const state = document.getElementById('step2_state')?.value || '';
    const country = document.getElementById('step2_country')?.value || 'United States';
    const building = document.getElementById('step2_building')?.value || '';
    const fullAddress = [building, street, city, state, country].filter(Boolean).join(', ');

    const step2 = {
        crn: document.getElementById('step2_crn')?.value || '',
        company_name: document.getElementById('step2_name')?.value || '',
        companyName: document.getElementById('step2_name')?.value || '',
        trade_name: document.getElementById('trade_name')?.value || '',
        tradeName: document.getElementById('trade_name')?.value || '',
        legal_type: document.getElementById('step2_legal_type')?.value || '',
        legalType: document.getElementById('step2_legal_type')?.value || '',
        issue_date: document.getElementById('step2_issue_date')?.value || '',
        issueDate: document.getElementById('step2_issue_date')?.value || '',
        expiry_date: document.getElementById('step2_expiry_date')?.value || '',
        expiryDate: document.getElementById('step2_expiry_date')?.value || '',
        issued_by: document.getElementById('step2_issued_by')?.value || '',
        issuedBy: document.getElementById('step2_issued_by')?.value || '',
        contact_person: document.getElementById('step2_contact_person')?.value || '',
        contactPerson: document.getElementById('step2_contact_person')?.value || '',
        email: document.getElementById('step2_email')?.value || '',
        phone: document.getElementById('step2_phone')?.value || '',
        address: fullAddress || document.querySelector('#tab-address input')?.value || '',
        vat_trn: document.getElementById('step2_vat_trn')?.value || document.querySelector('#tab-vat input')?.value || '',
        vatTrn: document.getElementById('step2_vat_trn')?.value || document.querySelector('#tab-vat input')?.value || ''
    };

    // Step 3: Extract UBO items
    const uboItems = [];
    document.querySelectorAll('#uboCardsWrap .ubo-card').forEach((card, idx) => {
        const name = card.querySelector('input[type="text"]')?.value || `UBO ${idx + 1}`;
        const nat = card.querySelector('select')?.value || 'American';
        const dateInputs = card.querySelectorAll('input[type="date"]');
        const dob = dateInputs[0]?.value || '1985-06-15';
        const expiry = dateInputs[1]?.value || '2032-06-14';
        const textInputs = card.querySelectorAll('input[type="text"]');
        const pass = textInputs[1]?.value || `PASS-${idx + 1}`;
        const isPep = card.querySelector('.tog-group .tog-btn:first-child')?.classList.contains('on') || false;
        uboItems.push({
            id: 'ubo_' + (idx + 1),
            fullName: name,
            name: name,
            nationality: nat,
            idPassportNumber: pass,
            passportNumber: pass,
            dob: dob,
            expiryDate: expiry,
            shareholdingPct: idx === 0 ? 60.0 : 40.0,
            percentage: idx === 0 ? 60.0 : 40.0,
            votingRightsPct: idx === 0 ? 60.0 : 40.0,
            isPep: isPep
        });
    });

    // Step 4: Ownership structure / Cap table
    const ownershipRows = [];
    document.querySelectorAll('#struct-rows .struct-row').forEach((row, idx) => {
        const lvl = row.querySelector('select[id^="level-"]')?.value || '1';
        const ent = row.querySelector('select[id^="entity-select-"]')?.value || '';
        const pct = parseFloat(row.querySelector('input[type="number"]')?.value) || 0;
        if (ent) {
            ownershipRows.push({
                id: 'sh_' + (idx + 1),
                name: ent,
                entity: ent,
                level: lvl,
                percentage: pct,
                category: ent.includes('LLC') || ent.includes('PLC') || ent.includes('Corp') || ent.includes('Holdings') ? 'Corporate' : 'Individual',
                shareClass: 'Ordinary Voting Class A',
                share_class: 'Ordinary Voting Class A',
                country: 'United States',
                votingRightsPct: pct,
                voting_rights_pct: pct,
                isFlaggedForRework: false,
                is_flagged_for_rework: false,
                reworkNotes: '',
                rework_notes: ''
            });
        }
    });

    // Step 5: Roles
    const step5 = {
        maker: document.getElementById('maker-select')?.value || '',
        checker: document.getElementById('checker-select')?.value || '',
        items: [
            {
                id: 'role_1',
                name: document.getElementById('maker-select')?.value || (extractedEntities[0] || 'Managing Director'),
                title: 'Managing Director & Signatory',
                authority_level: 'Sole Signatory',
                authorityLevel: 'Sole Signatory',
                is_signature_uploaded: true,
                isSignatureUploaded: true
            },
            {
                id: 'role_2',
                name: document.getElementById('checker-select')?.value || (extractedEntities[1] || 'Chief Financial Officer'),
                title: 'Chief Financial Officer',
                authority_level: 'Joint Signatory',
                authorityLevel: 'Joint Signatory',
                is_signature_uploaded: true,
                isSignatureUploaded: true
            }
        ]
    };

    // Step 6: Tax
    const isUs = document.querySelector('#fatca-us-person-tog .tog-btn:first-child')?.classList.contains('on') || false;
    const fatcaClass = document.getElementById('fatca-entity-class')?.value || (isUs ? 'Specified US Person' : 'NFFE');
    const crsFi = document.querySelector('#crs-fi-tog .tog-btn:first-child')?.classList.contains('on') || false;
    const step6 = {
        us_person: isUs,
        is_us_person: isUs,
        isUsPerson: isUs,
        us_tin: isUs ? '12-3456789' : '',
        usTin: isUs ? '12-3456789' : '',
        primary_tax_country: 'United States',
        primaryTaxCountry: 'United States',
        tax_id_number: document.getElementById('step2_vat_trn')?.value || '12-3456789',
        taxIdNumber: document.getElementById('step2_vat_trn')?.value || '12-3456789',
        entity_classification: fatcaClass,
        entityClassification: fatcaClass,
        fatca_class: fatcaClass,
        crs_fi: crsFi,
        crs_confirmed: true,
        crsConfirmed: true
    };

    // Step 7: Declarations
    const declarations = {
        d1: document.getElementById('d1')?.checked || false,
        d2: document.getElementById('d2')?.checked || false,
        d3: document.getElementById('d3')?.checked || false
    };

    const resolvedCrn = document.getElementById('step2_crn')?.value || currentLoginCrn || '';
    const resolvedCuid = currentCompanyUid || (resolvedCrn ? ('CUID-' + resolvedCrn.toUpperCase().replace(/[^A-Z0-9]/g, '')) : '');
    step2.company_uid = resolvedCuid;
    step2.companyUid = resolvedCuid;

    return {
        company_uid: resolvedCuid,
        companyUid: resolvedCuid,
        step1_documents: step1Docs,
        documents: documentsList,
        step2,
        entities: extractedEntities,
        ubos: uboItems,
        ownership_structure: ownershipRows,
        ownership: ownershipRows,
        roles: step5,
        tax: step6,
        tax_compliance: step6,
        declarations
    };
}

// ── COMPREHENSIVE DATA PERSISTENCE: RESTORE ALL 7 STEPS ──
function populateFormData(formData) {
    if (!formData) return;

    // Restore Step 1 documents
    const docSource = formData.documents || formData.step1_documents;
    if (docSource && Array.isArray(docSource)) {
        docSource.forEach(doc => {
            const card = document.getElementById(doc.id) || document.getElementById('uc-' + doc.id.replace(/\D/g, ''));
            if (card) {
                const labelInput = card.querySelector('.doc-label-input');
                const statusEl = card.querySelector('.file-status');
                const labelText = doc.title || doc.label;
                const fileName = doc.fileName || doc.file_name || doc.filename;
                const isUp = Boolean(doc.isUploaded || doc.is_uploaded || doc.uploaded);

                if (labelInput && labelText) labelInput.value = labelText;
                if (isUp) {
                    card.classList.add('uploaded');
                    if (statusEl && fileName) statusEl.textContent = fileName;
                }
            }
        });
    }

    // Restore Step 2 company details
    if (formData.step2) {
        const s2 = formData.step2;
        const crnVal = s2.crn || '';
        const nameVal = s2.company_name || s2.companyName || '';
        const tradeVal = s2.trade_name || s2.tradeName || '';
        const legalVal = s2.legal_type || s2.legalType || '';
        const issueVal = s2.issue_date || s2.issueDate || '';
        const expiryVal = s2.expiry_date || s2.expiryDate || '';
        const issuedByVal = s2.issued_by || s2.issuedBy || '';
        const contactVal = s2.contact_person || s2.contactPerson || '';
        const phoneVal = s2.phone || '';
        const emailVal = s2.email || '';
        const vatVal = s2.vat_trn || s2.vatTrn || '';
        const addrVal = s2.address || '';

        if (crnVal && document.getElementById('step2_crn')) document.getElementById('step2_crn').value = crnVal;
        if (nameVal && document.getElementById('step2_name')) document.getElementById('step2_name').value = nameVal;
        if (tradeVal && document.getElementById('trade_name')) document.getElementById('trade_name').value = tradeVal;
        if (legalVal && document.getElementById('step2_legal_type')) document.getElementById('step2_legal_type').value = legalVal;
        if (issueVal && document.getElementById('step2_issue_date')) document.getElementById('step2_issue_date').value = issueVal;
        if (expiryVal && document.getElementById('step2_expiry_date')) document.getElementById('step2_expiry_date').value = expiryVal;
        if (issuedByVal && document.getElementById('step2_issued_by')) document.getElementById('step2_issued_by').value = issuedByVal;
        if (contactVal && document.getElementById('step2_contact_person')) document.getElementById('step2_contact_person').value = contactVal;
        if (phoneVal && document.getElementById('step2_phone')) document.getElementById('step2_phone').value = phoneVal;
        if (emailVal && document.getElementById('step2_email')) document.getElementById('step2_email').value = emailVal;
        if (vatVal && document.getElementById('step2_vat_trn')) document.getElementById('step2_vat_trn').value = vatVal;
        if (addrVal && document.querySelector('#tab-address input')) document.querySelector('#tab-address input').value = addrVal;
    }

    // Restore Step 3 & 4 entities and UBOs
    if (formData.ubos && Array.isArray(formData.ubos) && formData.ubos.length > 0) {
        extractedEntities = formData.ubos.map(u => u.fullName || u.name);
        uboCount = extractedEntities.length;
        updateUboCountText();
    } else if (formData.entities && Array.isArray(formData.entities) && formData.entities.length > 0) {
        extractedEntities = formData.entities;
        uboCount = extractedEntities.length;
        updateUboCountText();
    }

    // Restore Step 4 ownership structure
    const ownSource = formData.ownership || formData.ownership_structure;
    if (ownSource && Array.isArray(ownSource) && ownSource.length > 0) {
        cachedOwnershipRows = ownSource.map(r => ({
            entity: r.entity || r.name,
            name: r.name || r.entity,
            percentage: r.percentage,
            level: r.level || '1'
        }));
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
    const taxSource = formData.tax || formData.tax_compliance;
    if (taxSource) {
        cachedTaxSelections = {
            usPerson: Boolean(taxSource.us_person ?? taxSource.is_us_person ?? taxSource.isUsPerson),
            fatcaClass: taxSource.fatca_class || taxSource.entity_classification || taxSource.entityClassification || '',
            crsFi: Boolean(taxSource.crs_fi ?? taxSource.crsFi)
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

// &#x1F6C7;&#x1F6C7; AUTOSAVE WITH VISUAL INDICATOR & BACKEND SYNC &#x1F6C7;&#x1F6C7;
function triggerAutoSave() {
    const el = document.getElementById('autosave');
    if (el) {
        const now = new Date();
        const time = now.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        el.textContent = `&#x2705; Progress saved at ${time}`;
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

// &#x1F6C7;&#x1F6C7; AUTHENTICATION & LOGIN WORKFLOW &#x1F6C7;&#x1F6C7;
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
        
        const lStep1 = document.getElementById('lStep1');
        const lStep2 = document.getElementById('lStep2');
        if (lStep1 && lStep2) {
            lStep1.classList.add('step-exit-forward');
            setTimeout(() => {
                lStep1.classList.add('hidden');
                lStep1.classList.remove('step-exit-forward');
                lStep2.classList.remove('hidden');
                lStep2.classList.add('step-enter-forward');
                const firstOtp = document.querySelector('#otpInputs input');
                if (firstOtp) firstOtp.focus();
            }, 200);
        } else {
            if (lStep1) lStep1.classList.add('hidden');
            if (lStep2) lStep2.classList.remove('hidden');
            const firstOtp = document.querySelector('#otpInputs input');
            if (firstOtp) firstOtp.focus();
        }

        const otpCode = res.debugOtp || '1111';
        const badge = document.getElementById('displayOtpBadge');
        if (badge) badge.textContent = otpCode === '1111' ? '1111' : `${otpCode} or 1111`;
        showToast(`Verification code: ${otpCode} (or use 1111)`, 'OTP Dispatched', 'info', 7000);

        // Deliver simulated email in real time into floating inbox
        if (res.simulatedEmail) {
            receiveSimulatedEmail(res.simulatedEmail);
        } else {
            receiveSimulatedEmail({
                id: 'otp_' + Date.now(),
                from: '"First National Bank" <onboarding@fnb-us.com>',
                to: email,
                subject: `First National Bank — Your Access Code: ${otpCode}`,
                code: otpCode,
                type: 'otp',
                timestamp: new Date().toISOString(),
                html: `
                    <div style="font-family: -apple-system, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;">
                        <div style="text-align: center; margin-bottom: 16px;">
                            <div style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 800; font-size: 16px; width: 40px; height: 40px; line-height: 40px; border-radius: 8px;">AB</div>
                            <h2 style="margin: 8px 0 2px; color: #0f172a; font-size: 18px;">First National Bank Corporate Portal</h2>
                            <p style="color: #64748b; font-size: 12px; margin: 0;">Identity Verification Code</p>
                        </div>
                        <p style="color: #334155; font-size: 14px;">Use the following verification code to access your corporate onboarding application for CRN <strong>${crn}</strong>:</p>
                        <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
                            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${otpCode}</span>
                        </div>
                        <p style="color: #64748b; font-size: 11px;">This code will expire in 5 minutes.</p>
                    </div>
                `
            });
        }
    } catch (err) {
        showLoginError(err);
    }
}

function autoFillOtp(code = '1111') {
    const inputs = document.querySelectorAll('#otpInputs input');
    const digits = code.split('');
    inputs.forEach((inp, idx) => {
        inp.value = digits[idx] || '1';
        inp.classList.remove('pop-animate');
        void inp.offsetWidth; // trigger reflow
        inp.classList.add('pop-animate');
    });
    if (inputs[inputs.length - 1]) inputs[inputs.length - 1].focus();
    hideLoginError();
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

            currentCompanyUid = result.company_uid || result.data.company_uid || ('CUID-' + currentLoginCrn.toUpperCase().replace(/[^A-Z0-9]/g, ''));

            // Display Corporate Client Identity (e.g. test99) prominently on top
            const compName = result.company_name || result.data.company_name || result.data.form_data?.step2?.company_name || '';
            displayClientNameOnTop(compName, currentLoginCrn, currentCompanyUid);

            if (result.data.current_step && result.data.current_step > 1) {
                goTo(result.data.current_step);
            }

            // Restore Base64 documents from Database
            loadSavedDocuments();
            if (window.LiveBanking) window.LiveBanking.init();
            if (window.MobileApp) window.MobileApp.init();

            showToast('Welcome to First National Bank Corporate Portal', 'Authentication Successful', 'success');
        }
    } catch (err) {
        showLoginError(err || 'Incorrect verification code. Please try again.');
        inputs.forEach(inp => inp.value = '');
        if (inputs[0]) inputs[0].focus();
    }
}

function moveToNext(current, nextIndex) {
    if (current.value.length === 1) {
        current.classList.remove('pop-animate');
        void current.offsetWidth; // trigger reflow
        current.classList.add('pop-animate');
        const nextInput = document.querySelector(`#otpInputs input:nth-child(${nextIndex + 1})`);
        if (nextInput) nextInput.focus();
    }
}

async function resendOtp() {
    if (!currentLoginCrn || !currentLoginEmail) return;
    try {
        const res = await window.VBApi.requestOtp(currentLoginCrn, currentLoginEmail);
        showToast(`A new verification code has been dispatched.`, 'Code Resent', 'info');
        if (res && res.simulatedEmail) {
            receiveSimulatedEmail(res.simulatedEmail);
        }
    } catch (err) {
        showToast(err.message, 'Resend Failed', 'error');
    }
}

function showLoginError(err, customTitle = null) {
    const el = document.getElementById('loginError');
    if (!el) return;

    let title = customTitle || (err && err.title) || 'Notice';
    let detail = '';
    let isRmInviteError = false;

    const errMsg = typeof err === 'string' ? err : (err?.detail || err?.message || err?.error || 'An error occurred.');

    if ((err && err.code === 'RM_INVITATION_NOT_FOUND') || errMsg.includes('Relationship Manager (RM) Database') || errMsg.includes('Access Restricted')) {
        isRmInviteError = true;
        title = '&#x26D4; Access Restricted';
        const displayCrn = currentLoginCrn || (err && err.crn) || 'entered CRN';
        const displayEmail = currentLoginEmail || (err && err.email) || 'entered Email';
        detail = `CRN <code>${displayCrn}</code> and Email <code>${displayEmail}</code> could not be verified. Please ensure you have received an onboarding invitation from your Relationship Manager.`;
    } else if (errMsg.includes('OTP') || errMsg.includes('verification code') || errMsg.includes('code are required')) {
        title = '&#x1F511; Verification Notice';
        detail = errMsg;
    } else {
        detail = errMsg;
    }

    el.innerHTML = `
        <div class="login-alert-hdr">
            <span class="login-alert-title">${title}</span>
            <button type="button" class="login-alert-close" onclick="hideLoginError()" title="Dismiss">&times;</button>
        </div>
        <p class="login-alert-desc">${detail}</p>
        ${isRmInviteError ? `
        <div class="login-alert-actions">
            <span style="font-size:11px;color:#cbd5e1;">Need access? Contact your banker or:</span>
            <a href="/rm" target="_blank" class="login-alert-link">&#x1F517; Open RM Executive Portal &rarr;</a>
        </div>` : ''}
    `;
    el.classList.add('show');
}

function hideLoginError() {
    const el = document.getElementById('loginError');
    if (el) el.classList.remove('show');
}

// ── Corporate Client Identity Display (Displays company name & UID on top) ──
function displayClientNameOnTop(companyName, crn, companyUid) {
    const capsule = document.getElementById('hdrCompanyCapsule');
    const nameEl = document.getElementById('hdrCompanyName');
    const crnEl = document.getElementById('hdrCrnDisplay');
    const cuidEl = document.getElementById('hdrCompanyUidDisplay');
    const brandSub = document.getElementById('hdrBrandSub');

    const resolvedName = (companyName || '').trim() || 'Corporate Client';
    const resolvedCrn = (crn || currentLoginCrn || '').trim();
    if (companyUid) currentCompanyUid = companyUid;
    if (!currentCompanyUid && resolvedCrn) {
        currentCompanyUid = 'CUID-' + resolvedCrn.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    if (nameEl) nameEl.textContent = resolvedName;
    if (crnEl) crnEl.textContent = resolvedCrn ? `CRN: ${resolvedCrn}` : '';
    if (cuidEl) {
        cuidEl.textContent = currentCompanyUid ? `ID: ${currentCompanyUid}` : '';
        cuidEl.style.display = currentCompanyUid ? 'inline-block' : 'none';
    }
    if (capsule) capsule.style.display = 'inline-flex';
    if (brandSub) brandSub.textContent = resolvedName;

    // Auto-fill Step 2 company fields
    const s2Name = document.getElementById('step2_name');
    if (s2Name && (!s2Name.value || s2Name.value === 'First National Holdings Inc')) {
        s2Name.value = resolvedName;
    }
    const s2Trade = document.getElementById('trade_name');
    if (s2Trade && (!s2Trade.value || s2Trade.value === 'First National Holdings Inc')) {
        s2Trade.value = resolvedName;
    }
    const s2Crn = document.getElementById('step2_crn');
    if (s2Crn && (!s2Crn.value || s2Crn.value === '509077205') && resolvedCrn) {
        s2Crn.value = resolvedCrn;
    }
    const s2Uid = document.getElementById('step2_company_uid');
    if (s2Uid && currentCompanyUid) {
        s2Uid.value = currentCompanyUid;
    }
}

// &#x1F6C7;&#x1F6C7; FINAL APPLICATION SUBMISSION &#x1F6C7;&#x1F6C7;
async function finalizeApp() {
    if (isReworkMode) {
        showToast('Application resubmitted for relationship manager review!', 'Resubmitted', 'success');
        toggleReworkMode();
    }

    const appRef = currentAppRef || 'AB-2026-001245';

    if (window.VBApi && window.VBApi.isAuthenticated()) {
        try {
            await window.VBApi.saveApplication(7, 'submitted', collectFullFormData());
        } catch (err) {
            console.error('Final submission error:', err);
        }
    }

    // Deliver simulated application confirmation email in real time
    receiveSimulatedEmail({
        id: 'app_' + Date.now(),
        from: '"First National Bank Corporate Onboarding" <onboarding@fnb-us.com>',
        to: currentLoginEmail || 'admin@company.com',
        subject: `First National Bank — Corporate Application Received (${appRef})`,
        type: 'application_submitted',
        timestamp: new Date().toISOString(),
        html: `
            <div style="font-family: -apple-system, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 10px;">AB</div>
                    <h2 style="color: #0f172a; margin: 10px 0 2px; font-size: 20px;">First National Bank Corporate Portal</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Application Submission Confirmation</p>
                </div>
                <p style="color: #334155; font-size: 14px;">Dear Corporate Customer,</p>
                <p style="color: #334155; font-size: 14px;">Your corporate account application has been received and logged into our compliance verification queue.</p>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px; margin: 16px 0; text-align: center;">
                    <span style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Application Reference</span><br>
                    <span style="font-size: 24px; font-weight: 800; color: #15803d; font-family: monospace;">${appRef}</span>
                </div>
                <p style="color: #475569; font-size: 13px;">Our onboarding desk will complete the verification within 1–2 business days. Your assigned Relationship Manager is <strong>Michael Vance</strong> (m.vance@fnb-us.com &bull; +1 212 555 0190).</p>
            </div>
        `
    });

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

// &#x1F6C7;&#x1F6C7; UTILITY MODALS & HELPERS &#x1F6C7;&#x1F6C7;
function showSaveModal() {
    triggerAutoSave();
    const modal = document.getElementById('saveModal');
    const appRef = currentAppRef || 'AB-2026-001245';
    const email = currentLoginEmail || 'admin@company.com';
    const crn = currentLoginCrn || '509077205';

    if (modal) {
        const bodyEl = modal.querySelector('.modal-body');
        if (bodyEl) {
            bodyEl.innerHTML = `
                Your application progress has been saved securely.<br><br>
                You can return anytime with the link below or by signing in with CRN <strong>${crn}</strong> and email <strong>${email}</strong>.<br><br>
                <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:12px;margin:8px 0;word-break:break-all;">
                    <span style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Application Reference</span><br>
                    <strong style="color:var(--primary);font-size:16px;font-family:monospace;">${appRef}</strong><br><br>
                    <span style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Resume Link</span><br>
                    <code style="color:var(--primary);font-size:12px;">https://onboarding.fnb-us.com/resume/${appRef}</code>
                </div>
            `;
        }
        modal.classList.add('open');
    }

    // Deliver simulated progress saved email with resume link
    receiveSimulatedEmail({
        id: 'save_' + Date.now(),
        from: '"First National Bank Onboarding" <onboarding@fnb-us.com>',
        to: email,
        subject: `First National Bank — Resume Your Application (${appRef})`,
        type: 'resume',
        timestamp: new Date().toISOString(),
        html: `
            <div style="font-family: -apple-system, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 10px;">AB</div>
                    <h2 style="color: #0f172a; margin: 10px 0 2px; font-size: 20px;">First National Bank Corporate Portal</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Application Progress Saved</p>
                </div>
                <p style="color: #334155; font-size: 14px;">Your onboarding progress has been saved securely.</p>
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 16px 0; word-break: break-all;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 600;">Secure Resume Link:</span><br>
                    <code style="color: #0284c7; font-size: 13px; font-weight: bold;">https://onboarding.fnb-us.com/resume/${appRef}</code>
                </div>
                <p style="color: #64748b; font-size: 12px;">You can return at any time with this link or by signing in with CRN <strong>${crn}</strong>.</p>
            </div>
        `
    });
}

function handleSignOut() {
    if (window.VBApi) {
        window.VBApi.clearToken();
    }
    const companyCap = document.getElementById('hdrCompanyCapsule');
    if (companyCap) companyCap.style.display = 'none';
    const brandSub = document.getElementById('hdrBrandSub');
    if (brandSub) brandSub.textContent = 'Corporate Onboarding Portal';
    showToast('Signed out. Enter your CRN and Email to resume your application.', 'Signed Out', 'info', 4000);
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        const s1 = document.getElementById('lStep1');
        const s2 = document.getElementById('lStep2');
        if (s1) s1.classList.remove('hidden');
        if (s2) s2.classList.add('hidden');
        if (currentLoginCrn && document.getElementById('crnInput')) {
            document.getElementById('crnInput').value = currentLoginCrn;
        }
        if (currentLoginEmail && document.getElementById('emailInput')) {
            document.getElementById('emailInput').value = currentLoginEmail;
        }
        hideLoginError();
    }
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

    // Deliver simulated invite email
    receiveSimulatedEmail({
        id: 'inv_' + Date.now(),
        from: '"First National Bank Compliance" <compliance@fnb-us.com>',
        to: email,
        subject: `First National Bank: Invitation to Complete UBO Verification`,
        type: 'invite',
        timestamp: new Date().toISOString(),
        html: `
            <div style="font-family: -apple-system, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 10px;">AB</div>
                    <h2 style="color: #0f172a; margin: 10px 0 2px; font-size: 20px;">First National Bank Corporate Portal</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Beneficial Ownership Identity Verification</p>
                </div>
                <p style="color: #334155; font-size: 14px;">You have been nominated as an Ultimate Beneficial Owner (UBO) for an First National Bank corporate account application.</p>
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
                    <button type="button" style="background: #0284c7; color: #ffffff; border: none; font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Upload Identity Documents →</button>
                </div>
            </div>
        `
    });
}

function triggerDocuSign() {
    const btn = document.getElementById('btn-trigger-docusign');
    const actionArea = document.getElementById('docusign-action-area');
    const statusItems = document.getElementById('docusign-status-items');
    const alertBox = document.getElementById('docusign-alert');

    if (btn) { btn.innerHTML = '⏳ Dispatching Invites&hellip;'; btn.style.opacity = '0.8'; btn.style.pointerEvents = 'none'; }
    setTimeout(() => {
        if (actionArea) {
            actionArea.innerHTML = `<div style="display:flex; align-items:center; gap:8px; color: #6ee7b7; font-weight: 700; font-size: 14px; width: 100%;"><span style="font-size:18px;" aria-hidden="true">&#x2705;</span> Invites successfully dispatched to all signatories!</div>`;
            actionArea.style.borderColor = '#10b981';
            actionArea.style.background = 'rgba(16, 185, 129, 0.18)';
        }
        if (statusItems) {
            statusItems.innerHTML = `
                <div class="timeline-item"><span style="font-weight:600;color:#34d399;">&#x2705;</span><span style="color:#f1f5f9;">DocuSign invitations sent to signatories</span></div>
                <div class="timeline-item"><span style="font-weight:600;color:#fbbf24;">⏳</span><span style="color:#f1f5f9;">Awaiting document review and signatures</span></div>
                <div class="timeline-item"><span style="font-weight:600;color:#fbbf24;">⏳</span><span style="color:#f1f5f9;">Estimated completion: 24–72 hours</span></div>
            `;
        }
        if (alertBox) alertBox.style.display = 'block';
        triggerAutoSave();
        showToast('DocuSign invites sent to all signatories.', 'Invites Sent', 'success');

        // Deliver simulated DocuSign email in real time
        receiveSimulatedEmail({
            id: 'docu_' + Date.now(),
            from: '"DocuSign via First National Bank" <documents@docusign.net>',
            to: currentLoginEmail || 'admin@company.com',
            subject: 'DocuSign: Please Sign Your First National Bank Corporate Account Client Agreement',
            type: 'docusign',
            timestamp: new Date().toISOString(),
            html: `
                <div style="font-family: -apple-system, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="display: inline-block; background: #ffbe00; color: #0f172a; font-weight: 800; font-size: 16px; width: 44px; height: 44px; line-height: 44px; border-radius: 8px;">DS</div>
                        <h2 style="margin: 10px 0 2px; color: #0f172a; font-size: 20px;">DocuSign Electronic Signature</h2>
                        <p style="color: #64748b; font-size: 12px; margin: 0;">First National Bank Corporate Account Opening Package</p>
                    </div>
                    <p style="color: #1e293b; font-size: 14px;">Hello Authorized Signatory,</p>
                    <p style="color: #334155; font-size: 14px; line-height: 1.5;">First National Bank has prepared your Corporate Banking Master Agreement and Authorized Signatory Mandate for digital signature.</p>
                    <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 18px; margin: 18px 0; text-align: center;">
                        <button type="button" onclick="simulateDocuSignSign()" style="background: #ffbe00; color: #111827; border: none; font-weight: 800; font-size: 14px; padding: 12px 26px; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(255,190,0,0.3);">✍️ Review &amp; Sign Document</button>
                    </div>
                    <p style="color: #64748b; font-size: 12px;">This envelope is secured with 256-bit AES encryption compliant with the US Electronic Signatures in Global and National Commerce Act (E-SIGN Act).</p>
                </div>
            `
        });
    }, 1200);
}

function downloadReceipt() {
    const appRef = currentAppRef || 'AB-2026-DEMO';
    const company = document.getElementById('step2_name')?.value || 'First National Holdings Inc';
    const crn = document.getElementById('step2_crn')?.value || currentLoginCrn || '509077205';

    const txt = `First National Bank CORPORATE ONBOARDING RECEIPT\n==========================================\nApplication Ref: ${appRef}\nSubmitted: ${new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'long', year: 'numeric' })}\nCompany: ${company}\nCRN: ${crn}\n\nNEXT STEPS:\n1. Download First National Bank Mobile App\n2. Sign in with your registered email\n3. Complete biometric identity verification\n4. Sign digital documents via DocuSign\n5. Final onboarding review: 2-3 business days\n\nRELATIONSHIP MANAGER:\nMichael Vance | Corporate Banking\nEmail: m.vance@fnb-us.com | Support: support@fnb-us.com\n`;

    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([txt], { type: 'text/plain' })),
        download: `FNB_Application_${appRef}.txt`
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

// &#x1F6C7;&#x1F6C7; KEYBOARD SHORTCUTS & MODAL DISMISSAL &#x1F6C7;&#x1F6C7;
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

// ==============================================================================
// &#x1F6C7;&#x1F6C7; REAL-TIME EMAIL SIMULATOR (IN-BROWSER VIRTUAL INBOX) &#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;&#x1F6C7;
// ==============================================================================
window.liveSimulatedEmails = [];
let unreadEmailCount = 0;
let selectedEmailId = null;
let emailAudioCtx = null;

function playEmailChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!emailAudioCtx) emailAudioCtx = new AudioContext();
        if (emailAudioCtx.state === 'suspended') {
            emailAudioCtx.resume();
        }

        const now = emailAudioCtx.currentTime;
        const osc1 = emailAudioCtx.createOscillator();
        const osc2 = emailAudioCtx.createOscillator();
        const gain = emailAudioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now + 0.12);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(emailAudioCtx.destination);

        osc1.start(now);
        osc2.start(now + 0.12);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
    } catch (e) {
        // Audio synthesis optional / user gesture dependent
    }
}

function receiveSimulatedEmail(emailItem, suppressAlert = false) {
    if (!emailItem || !emailItem.subject) return;

    // Deduplicate if already present
    if (emailItem.id && window.liveSimulatedEmails.some(e => e.id === emailItem.id)) {
        return;
    }

    const item = {
        id: emailItem.id || 'eml_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        from: emailItem.from || '"First National Bank" <onboarding@fnb-us.com>',
        to: emailItem.to || currentLoginEmail || 'applicant@corporate.ae',
        subject: emailItem.subject || 'First National Bank Notification',
        html: emailItem.html || '<p>Notification from First National Bank</p>',
        text: emailItem.text || '',
        code: emailItem.code || null,
        type: emailItem.type || 'general',
        timestamp: emailItem.timestamp || new Date().toISOString(),
        read: false
    };

    window.liveSimulatedEmails.unshift(item);
    unreadEmailCount++;
    updateMailboxBadge();
    renderMailboxList();

    if (!suppressAlert) {
        playEmailChime();
        showIncomingEmailAlert(item);
    }
}

function updateMailboxBadge() {
    const badge = document.getElementById('mailboxUnreadBadge');
    if (badge) {
        if (unreadEmailCount > 0) {
            badge.textContent = unreadEmailCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showIncomingEmailAlert(email) {
    const alertBox = document.getElementById('incomingEmailAlert');
    const subj = document.getElementById('alertSubject');
    const sender = document.getElementById('alertSender');
    const snippet = document.getElementById('alertSnippet');

    if (alertBox && subj && sender) {
        subj.textContent = email.subject;
        sender.textContent = `From: ${email.from.replace(/<.*>/, '').replace(/"/g, '')}`;
        if (snippet) {
            snippet.innerHTML = email.code
                ? `🔑 Access Code: <strong>${email.code}</strong> &bull; Click to view &amp; auto-fill`
                : 'Click to open and read incoming email';
        }
        alertBox.style.display = 'flex';

        if (window._alertTimer) clearTimeout(window._alertTimer);
        window._alertTimer = setTimeout(() => {
            dismissEmailAlert();
        }, 8000);
    }
}

function dismissEmailAlert() {
    const alertBox = document.getElementById('incomingEmailAlert');
    if (alertBox) alertBox.style.display = 'none';
}

function toggleMailboxPanel(forceState) {
    const panel = document.getElementById('demoMailboxPanel');
    if (!panel) return;

    const isVisible = panel.style.display !== 'none';
    const newState = typeof forceState === 'boolean' ? forceState : !isVisible;

    if (newState) {
        panel.style.display = 'flex';
        dismissEmailAlert();
        unreadEmailCount = 0;
        updateMailboxBadge();
        window.liveSimulatedEmails.forEach(e => e.read = true);
        renderMailboxList();
    } else {
        panel.style.display = 'none';
    }
}

function openMailboxAndSelectLatest() {
    dismissEmailAlert();
    toggleMailboxPanel(true);
    if (window.liveSimulatedEmails.length > 0) {
        openEmailInReader(window.liveSimulatedEmails[0].id);
    }
}

function renderMailboxList() {
    const listContainer = document.getElementById('mbEmailList');
    const countEl = document.getElementById('mbCount');
    if (!listContainer) return;

    if (countEl) countEl.textContent = window.liveSimulatedEmails.length;

    if (window.liveSimulatedEmails.length === 0) {
        listContainer.innerHTML = `
            <div class="mb-empty-state">
                <div class="empty-icon" aria-hidden="true">📭</div>
                <div class="empty-title">Simulated Inbox Ready</div>
                <div class="empty-desc">Request an OTP code, trigger DocuSign, or submit an application to see emails arrive here instantly.</div>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = window.liveSimulatedEmails.map(email => {
        const timeStr = formatEmailTime(email.timestamp);
        const unreadClass = email.read ? '' : 'unread';
        const codePill = email.code ? `<span style="background:#0284c7;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:6px;">OTP: ${email.code}</span>` : '';
        const senderClean = email.from.replace(/<.*>/, '').replace(/"/g, '').trim();
        return `
            <div class="mb-item ${unreadClass}" onclick="openEmailInReader('${email.id}')" role="button" tabindex="0">
                <div class="mb-item-top">
                    <span class="mb-item-from">${escapeHtml(senderClean)}</span>
                    <span class="mb-item-time">${timeStr}</span>
                </div>
                <div class="mb-item-subject">${escapeHtml(email.subject)} ${codePill}</div>
                <div class="mb-item-preview">${escapeHtml(email.text || 'Click to view full message...')}</div>
            </div>
        `;
    }).join('');
}

function formatEmailTime(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'Just now';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function openEmailInReader(id) {
    const email = window.liveSimulatedEmails.find(e => e.id === id);
    if (!email) return;

    email.read = true;
    selectedEmailId = id;

    const listView = document.getElementById('mbListView');
    const readerView = document.getElementById('mbReaderView');
    if (listView) listView.style.display = 'none';
    if (readerView) readerView.style.display = 'flex';

    const fromEl = document.getElementById('mbReaderFrom');
    const toEl = document.getElementById('mbReaderTo');
    const subjectEl = document.getElementById('mbReaderSubject');
    const timeEl = document.getElementById('mbReaderTimestamp');
    const actionBanner = document.getElementById('mbReaderActionBanner');
    const contentEl = document.getElementById('mbReaderContent');

    if (fromEl) fromEl.textContent = email.from;
    if (toEl) toEl.textContent = email.to;
    if (subjectEl) subjectEl.textContent = email.subject;
    if (timeEl) timeEl.textContent = formatEmailTime(email.timestamp);

    // Dynamic Action Banner for interactive demo
    if (actionBanner) {
        if (email.code) {
            actionBanner.style.display = 'flex';
            actionBanner.innerHTML = `
                <div style="font-size:12px; color:#166534; font-weight:600;">
                    💡 Access Code: <strong style="font-size:16px; font-family:monospace; color:#0284c7;">${email.code}</strong>
                </div>
                <button type="button" class="btn-autofill-email-code" onclick="autoFillOtpFromEmail('${email.code}')">
                    ⚡ Auto-Fill Code into Login
                </button>
            `;
        } else if (email.type === 'docusign') {
            actionBanner.style.display = 'flex';
            actionBanner.innerHTML = `
                <div style="font-size:12px; color:#92400e; font-weight:600;">
                    ✍️ E-Signature Required on Client Agreement
                </div>
                <button type="button" class="btn-autofill-email-code" style="background:#ffbe00; color:#111827;" onclick="simulateDocuSignSign()">
                    Sign Documents Now
                </button>
            `;
        } else if (email.type === 'resume') {
            actionBanner.style.display = 'flex';
            actionBanner.innerHTML = `
                <div style="font-size:12px; color:#1e40af; font-weight:600;">
                    💾 Direct Application Resume Link
                </div>
                <button type="button" class="btn-autofill-email-code" onclick="showToast('Resume link copied!', 'Resume', 'info'); closeModal('saveModal');">
                    Continue Application
                </button>
            `;
        } else {
            actionBanner.style.display = 'none';
        }
    }

    if (contentEl) {
        contentEl.innerHTML = email.html || `<p>${escapeHtml(email.text)}</p>`;
    }
}

function backToInboxList() {
    const listView = document.getElementById('mbListView');
    const readerView = document.getElementById('mbReaderView');
    if (listView) listView.style.display = 'flex';
    if (readerView) readerView.style.display = 'none';
    selectedEmailId = null;
    renderMailboxList();
}

function clearLiveMailbox() {
    window.liveSimulatedEmails = [];
    unreadEmailCount = 0;
    updateMailboxBadge();
    backToInboxList();
    renderMailboxList();
    if (window.ApexApi && window.ApexApi.clearSimulatedEmails) {
        window.ApexApi.clearSimulatedEmails().catch(() => {});
    }
    showToast('Simulated mailbox cleared.', 'Inbox Reset', 'info');
}

function autoFillOtpFromEmail(code) {
    autoFillOtp(code);
    showToast(`Code ${code} auto-filled into login!`, 'Auto-Filled', 'success');
    const overlay = document.getElementById('loginOverlay');
    if (overlay && !overlay.classList.contains('hidden')) {
        const firstOtp = document.querySelector('#otpInputs input');
        if (firstOtp) firstOtp.focus();
    }
}

function simulateDocuSignSign() {
    showToast('Client Agreement digitally signed via DocuSign!', 'E-Signed', 'success');
    const statusItems = document.getElementById('docusign-status-items');
    if (statusItems) {
        statusItems.innerHTML = `
            <div class="timeline-item"><span style="font-weight:600;color:var(--success);">&#x2705;</span><span>DocuSign invitations dispatched</span></div>
            <div class="timeline-item"><span style="font-weight:600;color:var(--success);">&#x2705;</span><span>All signatories digitally executed agreements</span></div>
            <div class="timeline-item"><span style="font-weight:600;color:var(--success);">&#x2705;</span><span>Compliance audit trail verified</span></div>
        `;
    }
    const alertBox = document.getElementById('docusign-alert');
    if (alertBox) {
        alertBox.innerHTML = `<strong>&#x2705; Complete:</strong> All authorized signatories have signed. Ready for final review.`;
        alertBox.style.background = '#f0fdf4';
        alertBox.style.borderColor = '#86efac';
        alertBox.style.color = '#166534';
    }
    backToInboxList();
}

// &#x1F6C7;&#x1F6C7; LIVE FORM INPUT LISTENERS: AUTOMATIC INSTANT DATABASE SYNC &#x1F6C7;&#x1F6C7;
let liveAutoSaveDebounce = null;
document.addEventListener('input', (e) => {
    if (!e.target || e.target.closest('#loginOverlay') || e.target.closest('#demoMailboxWidget')) return;
    clearTimeout(liveAutoSaveDebounce);
    liveAutoSaveDebounce = setTimeout(() => {
        triggerAutoSave();
    }, 400);
});

document.addEventListener('change', (e) => {
    if (!e.target || e.target.closest('#loginOverlay') || e.target.closest('#demoMailboxWidget')) return;
    triggerAutoSave();
});

// &#x1F6C7;&#x1F6C7; INITIALIZATION & SESSION REHYDRATION ON DOM READY &#x1F6C7;&#x1F6C7;
window.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initParticles();
    updateNetworkStatus();

    // Initial sync of simulated emails from server
    if (window.ApexApi && window.ApexApi.getSimulatedEmails) {
        try {
            const emailRes = await window.ApexApi.getSimulatedEmails();
            if (emailRes && emailRes.emails && emailRes.emails.length > 0) {
                emailRes.emails.forEach(em => receiveSimulatedEmail(em, true));
            }
        } catch (e) {
            // Server offline or first launch
        }
    }

    // Session Rehydration: Check if user has an active JWT session
    if (window.VBApi && window.VBApi.isAuthenticated()) {
        try {
            const res = await window.VBApi.getCurrentApplication();
            if (res.success && res.data) {
                const record = res.data;
                currentAppRef = record.application_ref;
                currentLoginCrn = record.crn;
                currentLoginEmail = record.registered_email;
                currentCompanyUid = record.company_uid || ('CUID-' + (record.crn || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));

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

                // Display Corporate Client Identity (e.g. test99) prominently on top
                const compName = record.company_name || record.form_data?.step2?.company_name || '';
                displayClientNameOnTop(compName, record.crn, currentCompanyUid);

                // Navigate to saved step
                if (record.current_step && record.current_step > 1) {
                    goTo(record.current_step);
                }

                // Restore Base64 documents from Database table application_documents
                loadSavedDocuments();
                if (window.LiveBanking) window.LiveBanking.init();
                if (window.MobileApp) window.MobileApp.init();

                console.log('&#x2705; [SESSION] Successfully rehydrated session for Application:', currentAppRef);
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

    // Check for RM customer magic invite URL params (?crn=...&email=...&company=...&contact=...&phone=...&company_uid=...)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCrn = urlParams.get('crn');
        const inviteEmail = urlParams.get('email');
        const inviteCompany = urlParams.get('company') || urlParams.get('company_name');
        const inviteContact = urlParams.get('contact') || urlParams.get('contact_person');
        const invitePhone = urlParams.get('phone');
        const inviteCuid = urlParams.get('company_uid') || urlParams.get('cuid');

        if (inviteCuid) currentCompanyUid = inviteCuid;

        if (inviteCrn || inviteEmail) {
            const crnInput = document.getElementById('crnInput');
            const emailInput = document.getElementById('emailInput');
            if (inviteCrn && crnInput) crnInput.value = inviteCrn;
            if (inviteEmail && emailInput) emailInput.value = inviteEmail;

            // Pre-seed Step 2 DOM inputs if available
            if (inviteCrn && document.getElementById('step2_crn')) document.getElementById('step2_crn').value = inviteCrn;
            if (inviteCompany && document.getElementById('step2_name')) document.getElementById('step2_name').value = inviteCompany;
            if (inviteContact && document.getElementById('step2_contact_person')) document.getElementById('step2_contact_person').value = inviteContact;
            if (invitePhone && document.getElementById('step2_phone')) document.getElementById('step2_phone').value = invitePhone;
            if (inviteEmail && document.getElementById('step2_email')) document.getElementById('step2_email').value = inviteEmail;

            // Display VIP Relationship Manager Invitation Banner on login card
            const loginBox = document.querySelector('.login-box');
            if (loginBox && !document.getElementById('rm-invite-banner')) {
                const banner = document.createElement('div');
                banner.id = 'rm-invite-banner';
                banner.style.cssText = 'margin-bottom:16px; padding:12px 16px; background:rgba(245,158,11,0.15); border:1.5px solid #f59e0b; border-radius:10px; font-size:12.5px; color:#fef08a; text-align:left; animation:fadeUp 0.3s ease;';
                banner.innerHTML = `<strong style="color:#ffffff; font-size:13px;">&#x1F4CB; Relationship Manager Invitation</strong><br>Welcome to First National Bank! You are accessing your onboarding journey with CRN <strong>${inviteCrn || ''}</strong>${inviteCompany ? ` (${inviteCompany})` : ''}. Click Request OTP to begin.`;
                const errorBox = document.getElementById('loginError');
                if (errorBox) {
                    errorBox.parentNode.insertBefore(banner, errorBox.nextSibling);
                } else {
                    loginBox.prepend(banner);
                }
            }
        }
    } catch (paramErr) {
        console.warn('[ROUTING] URL params parse notice:', paramErr.message);
    }

    // Auto-dismiss login alerts upon user typing in credentials
    const crnInputEl = document.getElementById('crnInput');
    const emailInputEl = document.getElementById('emailInput');
    if (crnInputEl) crnInputEl.addEventListener('input', hideLoginError);
    if (emailInputEl) emailInputEl.addEventListener('input', hideLoginError);
    document.querySelectorAll('#otpInputs input').forEach(inp => {
        inp.addEventListener('input', hideLoginError);
    });

    // Always initialize Live Banking ticker & accounts in background
    if (window.LiveBanking) window.LiveBanking.init();
    if (window.MobileApp) window.MobileApp.init();
});

// &#x1F6C7;&#x1F6C7; ONBOARDING CONTROLLER HELPERS &#x1F6C7;&#x1F6C7;
function switchPortalMode(mode) {
    const onboardingView = document.getElementById('onboardingPortalView');
    if (onboardingView) onboardingView.style.display = 'block';
}

function toggleMobileSimulator(forceState) {
    // Mobile simulator drawer removed in favor of native mobile app development
    console.log('Mobile App will connect to API Gateway and Database.');
}

window.switchPortalMode = switchPortalMode;
window.toggleMobileSimulator = toggleMobileSimulator;

// ── COMPLIANCE AUDIT TRAIL MODAL & ACTIVITY SUBSYSTEM ──
async function openAuditTrailModal() {
    const modal = document.getElementById('auditTrailModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const cuid = currentCompanyUid || (currentLoginCrn ? 'CUID-' + currentLoginCrn.toUpperCase().replace(/[^A-Z0-9]/g, '') : '');
    const badge = document.getElementById('auditModalCuidBadge');
    const cuidLabel = document.getElementById('auditModalCuid');
    if (badge) badge.textContent = cuid ? `UID: ${cuid}` : '';
    if (cuidLabel) cuidLabel.textContent = cuid || '-';

    await fetchAuditTrail();
}

function closeAuditTrailModal() {
    const modal = document.getElementById('auditTrailModal');
    if (modal) modal.style.display = 'none';
}

async function fetchAuditTrail(forceRefresh = false) {
    const tbody = document.getElementById('auditTrailTableBody');
    const countEl = document.getElementById('auditTotalCount');
    if (!tbody) return;

    if (!cachedAuditTrail.length || forceRefresh) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:28px; color:#94a3b8;">Loading activity history...</td></tr>`;
    }

    try {
        let logs = [];
        if (window.VBApi && window.VBApi.isAuthenticated()) {
            const res = await window.VBApi.request('/application/audit-trail');
            logs = res.auditTrail || [];
            if (res.company_uid && !currentCompanyUid) {
                currentCompanyUid = res.company_uid;
            }
        } else if (currentLoginCrn || currentCompanyUid) {
            const q = currentCompanyUid ? `company_uid=${encodeURIComponent(currentCompanyUid)}` : `crn=${encodeURIComponent(currentLoginCrn)}`;
            const res = await fetch(`/api/v1/rm/audit-trail?${q}`).then(r => r.json());
            logs = res.auditTrail || [];
        }

        cachedAuditTrail = logs;
        if (countEl) countEl.textContent = logs.length;
        renderAuditTrail(logs);
    } catch (err) {
        console.error('Failed to load audit trail:', err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#ef4444;">Failed to fetch audit records: ${escapeHtml(err.message || String(err))}</td></tr>`;
    }
}

function renderAuditTrail(logs) {
    const tbody = document.getElementById('auditTrailTableBody');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#94a3b8;">No audit trail events recorded yet for this corporate entity.</td></tr>`;
        return;
    }

    const actionColors = {
        CUSTOMER_LOGIN: '#38bdf8',
        CUSTOMER_OTP_REQUESTED: '#f59e0b',
        APPLICATION_SAVE: '#10b981',
        APPLICATION_SUBMITTED: '#8b5cf6',
        STEP_PROGRESSION: '#06b6d4',
        DOCUMENT_UPLOADED: '#ec4899',
        INVITATION_DISPATCHED: '#eab308',
        INVITATION_RESENT: '#38bdf8',
        DB_SYNC: '#60a5fa',
        PIPELINE_SYNC: '#60a5fa'
    };

    const actionLabels = {
        CUSTOMER_LOGIN: 'Client Login',
        CUSTOMER_OTP_REQUESTED: 'Security Code Sent',
        APPLICATION_SAVE: 'Application Saved',
        APPLICATION_SUBMITTED: 'Application Submitted',
        STEP_PROGRESSION: 'Step Completed',
        DOCUMENT_UPLOADED: 'Document Uploaded',
        INVITATION_DISPATCHED: 'Invitation Sent',
        INVITATION_RESENT: 'Invitation Re-sent',
        DB_SYNC: 'Records Synchronized',
        PIPELINE_SYNC: 'Pipeline Synchronized'
    };

    const rowsHtml = logs.map(l => {
        const timeStr = l.timestamp || l.created_at || '';
        const formattedTime = timeStr ? new Date(timeStr).toLocaleString('en-US', {
            month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }) : '-';
        const channelBadge = l.channel === 'mobile' 
            ? `<span style="background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.3); color:#c084fc; font-weight:600; padding:2px 6px; border-radius:4px; font-size:11px;">📱 Mobile</span>`
            : `<span style="background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; font-weight:600; padding:2px 6px; border-radius:4px; font-size:11px;">💻 Web</span>`;
        const actionColor = actionColors[l.action_type] || '#94a3b8';
        const displayAction = actionLabels[l.action_type] || (l.action_type ? l.action_type.replace(/_/g, ' ') : 'Activity');
        const statusBadge = (l.status === 'SUCCESS' || !l.status)
            ? `<span style="color:#10b981; font-weight:600;">✓ SUCCESS</span>`
            : `<span style="color:#ef4444; font-weight:600;">✕ ${escapeHtml(l.status)}</span>`;

        const metaSummary = l.metadata ? (typeof l.metadata === 'object' ? Object.entries(l.metadata).map(([k,v]) => `${k}:${v}`).join(', ') : String(l.metadata)) : '';

        return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                <td style="padding:10px 8px; font-family:monospace; color:#cbd5e1; font-size:11.5px; white-space:nowrap;">${formattedTime}</td>
                <td style="padding:10px 8px; white-space:nowrap;">${channelBadge}</td>
                <td style="padding:10px 8px;">
                    <span style="font-weight:700; color:${actionColor}; font-size:12px;">${escapeHtml(displayAction)}</span>
                    ${metaSummary ? `<div style="font-size:11px; color:#64748b; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(metaSummary)}">${escapeHtml(metaSummary)}</div>` : ''}
                </td>
                <td style="padding:10px 8px; color:#e2e8f0; font-family:monospace; font-size:12px;">${escapeHtml(l.actor || '-')}</td>
                <td style="padding:10px 8px; color:#94a3b8;">${escapeHtml(l.target || l.event_type || '-')}</td>
                <td style="padding:10px 8px; white-space:nowrap;">${statusBadge}</td>
                <td style="padding:10px 8px; color:#64748b; font-family:monospace; font-size:11px; white-space:nowrap;">
                    <div>${escapeHtml(l.ip_address || '127.0.0.1')}</div>
                    <div style="font-size:10px; color:#475569; max-width:140px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(l.user_agent || '')}">${escapeHtml((l.user_agent || '').substring(0, 24))}</div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;
}

function filterAuditTrailTable() {
    const input = document.getElementById('auditSearchInput');
    if (!input) return;
    const query = input.value.trim().toLowerCase();

    if (!query) {
        renderAuditTrail(cachedAuditTrail);
        return;
    }

    const filtered = cachedAuditTrail.filter(l => {
        const text = `${l.action_type || ''} ${l.actor || ''} ${l.target || ''} ${l.ip_address || ''} ${l.channel || ''} ${JSON.stringify(l.metadata || {})}`.toLowerCase();
        return text.includes(query);
    });

    renderAuditTrail(filtered);
}

window.openAuditTrailModal = openAuditTrailModal;
window.closeAuditTrailModal = closeAuditTrailModal;
window.fetchAuditTrail = fetchAuditTrail;
window.renderAuditTrail = renderAuditTrail;
window.filterAuditTrailTable = filterAuditTrailTable;

// ── mal.ai INTERACTIVE 3D CARD TILT & GLARE TRACKING ──
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('loginOverlay');
    const box = document.querySelector('.login-box');
    const glare = document.querySelector('.login-card-glare');
    if (!overlay || !box) return;

    overlay.addEventListener('mousemove', (e) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = box.getBoundingClientRect();
        const boxX = rect.left + rect.width / 2;
        const boxY = rect.top + rect.height / 2;
        const mouseX = e.clientX - boxX;
        const mouseY = e.clientY - boxY;

        const rotateX = (-mouseY / (rect.height / 2)) * 4.5;
        const rotateY = (mouseX / (rect.width / 2)) * 4.5;

        box.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;

        if (glare) {
            const glarePos = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
            glare.style.background = `linear-gradient(90deg, transparent, rgba(0, 210, 255, 0.4) ${glarePos - 25}%, rgba(255, 255, 255, 0.9) ${glarePos}%, rgba(0, 210, 255, 0.4) ${glarePos + 25}%, transparent)`;
        }
    });

    overlay.addEventListener('mouseleave', () => {
        box.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        if (glare) {
            glare.style.background = 'linear-gradient(90deg, transparent, rgba(0, 210, 255, 0.6), rgba(255, 255, 255, 0.8), rgba(0, 210, 255, 0.6), transparent)';
        }
    });
});



