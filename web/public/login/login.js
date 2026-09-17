/**
 * Creative Login Page — Yellow Edition with Animated Boy Character
 * Features:
 *   - Walking boy state machine (pacing, peeking, covering eyes, peeking through fingers)
 *   - Password visibility eye toggle
 *   - Code dock tab switcher (HTML vs CSS snippets from prompt)
 *   - Authentication handling against API Gateway
 */

(function () {
  'use strict';

  const cardScene = document.querySelector('.card-scene');
  const boyBubble = document.getElementById('boyBubble');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const eyeToggleBtn = document.getElementById('eyeToggleBtn');
  const iconEyeOpen = document.getElementById('iconEyeOpen');
  const iconEyeClosed = document.getElementById('iconEyeClosed');
  const loginAlert = document.getElementById('loginAlert');
  const btnLogin = document.getElementById('btnLogin');
  const tabHtml = document.getElementById('tabHtml');
  const tabCss = document.getElementById('tabCss');
  const codeHtml = document.getElementById('codeHtml');
  const codeCss = document.getElementById('codeCss');

  let bubbleTimeout = null;
  let isPasswordVisible = false;

  function showBubble(text, duration = 3000) {
    if (!boyBubble) return;
    clearTimeout(bubbleTimeout);
    boyBubble.querySelector('span').textContent = text;
    boyBubble.classList.add('show');
    if (duration > 0) {
      bubbleTimeout = setTimeout(() => {
        boyBubble.classList.remove('show');
      }, duration);
    }
  }

  function hideBubble() {
    if (boyBubble) boyBubble.classList.remove('show');
  }

  function setBoyState(stateClass) {
    if (!cardScene) return;
    cardScene.classList.remove(
      'state-peeking-user',
      'state-covering-eyes',
      'state-peeking-fingers'
    );
    if (stateClass) cardScene.classList.add(stateClass);
  }

  // Initial Bubble
  setTimeout(() => {
    showBubble("Hello there! 👋", 3000);
  }, 1200);

  // ── Username Focus ──
  if (usernameInput) {
    usernameInput.addEventListener('focus', () => {
      setBoyState('state-peeking-user');
      showBubble("Who's logging in? 👀", 2500);
    });

    usernameInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== passwordInput) {
          setBoyState(null);
          hideBubble();
        }
      }, 300);
    });
  }

  // ── Password Focus ──
  if (passwordInput) {
    passwordInput.addEventListener('focus', () => {
      if (isPasswordVisible) {
        setBoyState('state-peeking-fingers');
        showBubble("Peeking through my fingers! 🙈", 2500);
      } else {
        setBoyState('state-covering-eyes');
        showBubble("I'm not looking! 🙈", 2500);
      }
    });

    passwordInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== usernameInput) {
          setBoyState(null);
          hideBubble();
        }
      }, 300);
    });
  }

  // ── Toggle Password Visibility ──
  window.togglePasswordVisibility = function () {
    if (!passwordInput) return;

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      isPasswordVisible = true;
      if (iconEyeOpen) iconEyeOpen.style.display = 'none';
      if (iconEyeClosed) iconEyeClosed.style.display = 'block';
      if (eyeToggleBtn) eyeToggleBtn.setAttribute('aria-label', 'Hide password');

      if (document.activeElement === passwordInput || cardScene.classList.contains('state-covering-eyes')) {
        setBoyState('state-peeking-fingers');
        showBubble("I can see your password now! 🤫", 2800);
      }
    } else {
      passwordInput.type = 'password';
      isPasswordVisible = false;
      if (iconEyeOpen) iconEyeOpen.style.display = 'block';
      if (iconEyeClosed) iconEyeClosed.style.display = 'none';
      if (eyeToggleBtn) eyeToggleBtn.setAttribute('aria-label', 'Show password');

      if (document.activeElement === passwordInput || cardScene.classList.contains('state-peeking-fingers')) {
        setBoyState('state-covering-eyes');
        showBubble("Eyes covered tight! 🙈", 2500);
      }
    }
  };

  // ── Quick Fill Credentials ──
  window.fillCreds = function (username, password) {
    if (usernameInput) usernameInput.value = username;
    if (passwordInput) passwordInput.value = password;
    showBubble(`Filled credentials for ${username}!`, 2500);
  };

  // ── Code Snippet Tab Switcher ──
  window.switchCodeTab = function (tab) {
    if (tab === 'html') {
      if (tabHtml) tabHtml.classList.add('active');
      if (tabCss) tabCss.classList.remove('active');
      if (codeHtml) codeHtml.style.display = 'block';
      if (codeCss) codeCss.style.display = 'none';
    } else {
      if (tabCss) tabCss.classList.add('active');
      if (tabHtml) tabHtml.classList.remove('active');
      if (codeCss) codeCss.style.display = 'block';
      if (codeHtml) codeHtml.style.display = 'none';
    }
  };

  // ── Form Submission ──
  window.handleLoginSubmit = async function (e) {
    if (e) e.preventDefault();

    const username = (usernameInput ? usernameInput.value : '').trim();
    const password = (passwordInput ? passwordInput.value : '').trim();

    if (!username || !password) {
      showAlert("Please enter both username and password.", "error");
      showBubble("Wait! Both fields are required! ✋", 3000);
      return;
    }

    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = "Logging in...";
    }

    showBubble("Checking your credentials... ⏳", 2500);

    try {
      if (username.toLowerCase() === 'bogrod' || username.toLowerCase() === 'phanee' || username.toLowerCase() === 'admin') {
        const res = await fetch('/api/v1/rm/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: username, password: password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Invalid credentials");

        if (data.token) {
          localStorage.setItem('rm_token', data.token);
          if (data.user) localStorage.setItem('rm_user', JSON.stringify(data.user));
        }

        showAlert("Login successful! Redirecting to RM Sanctum...", "success");
        showBubble("Welcome back! Let's go! 🚀", 2500);
        setTimeout(() => {
          window.location.href = "/rm";
        }, 1200);

      } else {
        // Standard / Customer login simulation
        localStorage.setItem('user_session', JSON.stringify({ username, loggedAt: new Date().toISOString() }));
        showAlert("Login successful! Welcome, " + username + "!", "success");
        showBubble("Great job! Logging you in... 🎉", 2500);
        setTimeout(() => {
          window.location.href = "/customer";
        }, 1200);
      }
    } catch (err) {
      showAlert(err.message || "Invalid username or password.", "error");
      showBubble("Uh oh! Incorrect credentials! ❌", 3500);
    } finally {
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = "Log In";
      }
    }
  };

  function showAlert(msg, type = "error") {
    if (!loginAlert) return;
    loginAlert.className = `alert-box ${type}`;
    loginAlert.textContent = msg;
    loginAlert.style.display = "block";
  }

})();
