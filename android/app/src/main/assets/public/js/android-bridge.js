/**
 * Gringotts Bank — Android Native Bridge
 * Bridges Android WebView with the Customer Portal web application:
 * - Dynamic API Base URL detection (Emulator 10.0.2.2 vs Physical Phone LAN IP)
 * - Native Haptic Feedback on OTP input and button taps
 * - Hardware Back Button handling (steps & modals)
 * - File picker helper for KYC Document Vault uploads
 */

(function () {
    const STORAGE_KEY = 'gringotts_android_api_url';
    const DEFAULT_EMULATOR_URL = 'http://10.0.2.2:3000';

    // 1. Resolve API Gateway Base URL
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    if (savedUrl) {
        window.API_BASE_URL = savedUrl;
    } else if (window.AndroidBridge && typeof window.AndroidBridge.getGatewayUrl === 'function') {
        window.API_BASE_URL = window.AndroidBridge.getGatewayUrl();
    } else if (window.location.protocol === 'file:') {
        window.API_BASE_URL = DEFAULT_EMULATOR_URL;
    } else {
        // Fallback to origin (for web mode)
        window.API_BASE_URL = window.location.origin;
    }

    console.log('[AndroidBridge] Initialized. Gateway URL:', window.API_BASE_URL);

    // 2. Hardware Back Button handler for Android Activity
    window.handleAndroidBack = function () {
        // Close any active modal dialog first
        const activeModals = document.querySelectorAll('.modal-overlay:not([style*="display: none"]):not([style*="display:none"]), #auditTrailModal:not([style*="display: none"])');
        for (const m of activeModals) {
            if (m.style.display !== 'none') {
                m.style.display = 'none';
                return 'MODAL_CLOSED';
            }
        }

        // If on step 2-7, go back one step
        if (typeof currentStep !== 'undefined' && currentStep > 1) {
            if (typeof goTo === 'function') {
                goTo(currentStep - 1);
                return 'STEP_BACK';
            }
        }

        // If on OTP verification step, go back to CRN/Email input step
        const lStep2 = document.getElementById('lStep2');
        const lStep1 = document.getElementById('lStep1');
        if (lStep2 && !lStep2.classList.contains('hidden') && lStep1) {
            lStep2.classList.add('hidden');
            lStep1.classList.remove('hidden');
            return 'LOGIN_STEP_BACK';
        }

        return 'EXIT';
    };

    // 3. Native Haptic Feedback Trigger
    window.triggerAppHaptic = function () {
        if (window.AndroidBridge && typeof window.AndroidBridge.triggerHaptic === 'function') {
            window.AndroidBridge.triggerHaptic();
        } else if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    };

    // 4. Native Toast Notification
    window.showAppToast = function (msg) {
        if (window.AndroidBridge && typeof window.AndroidBridge.showToast === 'function') {
            window.AndroidBridge.showToast(msg);
        } else if (typeof showToast === 'function') {
            showToast(msg);
        }
    };

    // 5. Developer Endpoint Switcher (allows user on physical phone to switch to their PC LAN IP)
    window.setAndroidApiGateway = function (newUrl) {
        if (!newUrl) return;
        newUrl = newUrl.trim().replace(/\/+$/, '');
        localStorage.setItem(STORAGE_KEY, newUrl);
        window.API_BASE_URL = newUrl;
        if (window.AndroidBridge && typeof window.AndroidBridge.setGatewayUrl === 'function') {
            window.AndroidBridge.setGatewayUrl(newUrl);
        } else {
            alert('API Gateway configured: ' + newUrl);
        }
    };

    // Attach secret 5-tap on header logo to open Gateway Switcher dialog
    document.addEventListener('DOMContentLoaded', () => {
        const logo = document.querySelector('.logo-mark') || document.querySelector('.login-header h1');
        if (logo) {
            let tapCount = 0;
            let lastTap = 0;
            logo.addEventListener('click', () => {
                const now = Date.now();
                if (now - lastTap < 600) {
                    tapCount++;
                } else {
                    tapCount = 1;
                }
                lastTap = now;

                if (tapCount >= 5) {
                    tapCount = 0;
                    const promptVal = prompt(
                        '⚙️ [Android Bridge] Set API Gateway Base URL:\n\n' +
                        '• Emulator default: http://10.0.2.2:3000\n' +
                        '• Physical phone via WiFi: http://<YOUR_PC_IP>:3000',
                        window.API_BASE_URL || DEFAULT_EMULATOR_URL
                    );
                    if (promptVal) {
                        window.setAndroidApiGateway(promptVal);
                    }
                }
            });
        }
    });
})();
