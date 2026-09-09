/**
 * Vision Bank Portal — API Client Module
 * Secure communication layer handling JWT session tokens, OTP auth, and data persistence.
 */

(function () {
    const TOKEN_KEY = 'vb_session_token';
    const REF_KEY = 'vb_application_ref';

    const VBApi = {
        getToken() {
            return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
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
        },

        getApplicationRef() {
            return sessionStorage.getItem(REF_KEY) || localStorage.getItem(REF_KEY) || null;
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
                throw new Error(errorMsg);
            }

            return data;
        },

        async requestOtp(crn, email) {
            return this._fetch('/api/auth/request-otp', {
                method: 'POST',
                body: JSON.stringify({ crn, email })
            });
        },

        async verifyOtp(crn, email, otp) {
            const result = await this._fetch('/api/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ crn, email, otp })
            });

            if (result.success && result.token) {
                this.setToken(result.token, result.data?.application_ref);
            }

            return result;
        },

        async getCurrentApplication() {
            return this._fetch('/api/application/current', {
                method: 'GET'
            });
        },

        async saveApplication(currentStep, status, formData) {
            return this._fetch('/api/application/save', {
                method: 'POST',
                body: JSON.stringify({
                    current_step: currentStep,
                    status: status || undefined,
                    form_data: formData
                })
            });
        },

        async performOcr(imageBase64, docType = 'individual') {
            return this._fetch('/api/documents/ocr', {
                method: 'POST',
                body: JSON.stringify({
                    imageBase64,
                    docType
                })
            });
        }
    };

    window.VBApi = VBApi;
})();
