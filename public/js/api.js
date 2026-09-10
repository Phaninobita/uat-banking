/**
 * Apex Bank Platform — Microservices API Client Module
 * Communicates with the API Gateway (/api/v1/...) across all microservices:
 *   - Auth Service
 *   - Document & Base64 Vault Service
 *   - Corporate Onboarding Service
 *   - Live Core Banking & FX Service
 *   - Notification Service
 */

(function () {
    const TOKEN_KEY = 'apex_session_token';
    const REF_KEY = 'apex_application_ref';
    const LEGACY_TOKEN_KEY = 'vb_session_token';
    const LEGACY_REF_KEY = 'vb_application_ref';

    const ApexApi = {
        getToken() {
            return sessionStorage.getItem(TOKEN_KEY) ||
                   localStorage.getItem(TOKEN_KEY) ||
                   sessionStorage.getItem(LEGACY_TOKEN_KEY) ||
                   localStorage.getItem(LEGACY_TOKEN_KEY) ||
                   null;
        },

        setToken(token, appRef) {
            if (token) {
                sessionStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(TOKEN_KEY, token);
            }
            if (appRef) {
                sessionStorage.setItem(REF_KEY, appRef);
                localStorage.setItem(REF_KEY, appRef);
            }
        },

        clearToken() {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(REF_KEY);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REF_KEY);
            sessionStorage.removeItem(LEGACY_TOKEN_KEY);
            sessionStorage.removeItem(LEGACY_REF_KEY);
            localStorage.removeItem(LEGACY_TOKEN_KEY);
            localStorage.removeItem(LEGACY_REF_KEY);
        },

        getApplicationRef() {
            return sessionStorage.getItem(REF_KEY) ||
                   localStorage.getItem(REF_KEY) ||
                   sessionStorage.getItem(LEGACY_REF_KEY) ||
                   localStorage.getItem(LEGACY_REF_KEY) ||
                   'AB-2026-DEMO01';
        },

        isAuthenticated() {
            return Boolean(this.getToken());
        },

        async _fetch(endpoint, options = {}) {
            const headers = {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            };

            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(endpoint, {
                ...options,
                headers
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                }
                const errorMsg = data.error || `Request failed with status ${response.status}`;
                const err = new Error(errorMsg);
                err.status = response.status;
                err.data = data;
                err.code = data.code;
                err.title = data.title;
                err.detail = data.detail;
                throw err;
            }

            return data;
        },

        // ── AUTH SERVICE ──
        async requestOtp(crn, email) {
            return this._fetch('/api/v1/auth/request-otp', {
                method: 'POST',
                body: JSON.stringify({ crn, email })
            });
        },

        async verifyOtp(crn, email, otp) {
            const result = await this._fetch('/api/v1/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ crn, email, otp })
            });

            if (result.success && result.token) {
                this.setToken(result.token, result.data?.application_ref);
            }

            return result;
        },

        async loginMobileBiometric(crn = '509077205') {
            const result = await this._fetch('/api/v1/auth/mobile/biometric', {
                method: 'POST',
                body: JSON.stringify({
                    crn,
                    deviceId: 'iPhone-16-Pro-Simulator',
                    biometricSignature: 'bio_sig_' + Date.now()
                })
            });
            if (result.success && result.token) {
                this.setToken(result.token, result.user?.application_ref);
            }
            return result;
        },

        // ── APPLICATION SERVICE ──
        async getCurrentApplication() {
            return this._fetch('/api/v1/applications/current', {
                method: 'GET'
            });
        },

        async saveApplication(currentStep, status, formData) {
            return this._fetch('/api/v1/applications/save', {
                method: 'POST',
                body: JSON.stringify({
                    current_step: currentStep,
                    status: status || undefined,
                    form_data: formData
                })
            });
        },

        // ── DOCUMENT SERVICE (BASE64 DB STORAGE) ──
        async uploadDocumentBase64({ docType, fileName, fileType, fileSize, base64Data, applicationRef }) {
            const appRef = applicationRef || this.getApplicationRef();
            return this._fetch('/api/v1/documents/upload', {
                method: 'POST',
                body: JSON.stringify({
                    document_type: docType,
                    file_name: fileName,
                    file_type: fileType,
                    file_size: fileSize,
                    file_data_base64: base64Data,
                    application_ref: appRef
                })
            });
        },

        async getDocuments(applicationRef) {
            const appRef = applicationRef || this.getApplicationRef();
            return this._fetch(`/api/v1/documents/list/${encodeURIComponent(appRef)}`, {
                method: 'GET'
            });
        },

        async deleteDocument(id) {
            return this._fetch(`/api/v1/documents/${id}`, {
                method: 'DELETE'
            });
        },

        getDownloadUrl(id) {
            return `/api/v1/documents/download/${id}`;
        },

        async performOcr(imageBase64, docType = 'individual', clientText = '') {
            return this._fetch('/api/v1/documents/ocr', {
                method: 'POST',
                body: JSON.stringify({
                    imageBase64,
                    docType,
                    clientText
                })
            });
        },

        // ── CORE BANKING & FX SERVICE ──
        async getAccounts() {
            return this._fetch('/api/v1/banking/accounts', {
                method: 'GET'
            });
        },

        async getTransactions() {
            return this._fetch('/api/v1/banking/transactions', {
                method: 'GET'
            });
        },

        async getFxRates() {
            return this._fetch('/api/v1/banking/fx-rates', {
                method: 'GET'
            });
        },

        async executeTransfer(payload) {
            return this._fetch('/api/v1/banking/transfer', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },

        async getMobileSummary() {
            return this._fetch('/api/v1/banking/mobile/summary', {
                method: 'GET'
            });
        },

        // ── NOTIFICATION SERVICE ──
        async getSimulatedEmails(email) {
            const query = email ? `?email=${encodeURIComponent(email)}` : '';
            return this._fetch(`/api/v1/notifications/emails${query}`, {
                method: 'GET'
            });
        },

        async clearSimulatedEmails() {
            return this._fetch('/api/v1/notifications/emails', {
                method: 'DELETE'
            });
        },

        async simulateEmail(payload) {
            return this._fetch('/api/v1/notifications/simulate', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },

        // ── GATEWAY HEALTH & MESH MONITOR ──
        async getMeshHealth() {
            return this._fetch('/api/v1/gateway/health', {
                method: 'GET'
            });
        }
    };

    window.ApexApi = ApexApi;
    window.VBApi = ApexApi; // Aliased for complete backward compatibility
})();
