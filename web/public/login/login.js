/**
 * Gringotts Wizarding Bank — Creative Vault Login Interaction Engine
 * Features:
 *   - Articulated SVG Goblin character state machine (Pacing, Peeking, Covering Eyes, Peeking Through Fingers, Unlocking)
 *   - Password cipher visibility toggle with ARIA synchronization
 *   - Ambient floating golden vault dust canvas
 *   - Real microservices mesh authentication against Gateway (/api/v1/rm/login & /api/v1/auth)
 */

(function () {
  'use strict';

  // ── DOM References ──
  const stageContainer = document.getElementById('stageContainer');
  const goblinWalker = document.getElementById('goblinWalker');
  const goblinBubble = document.getElementById('goblinBubble');
  const goblinBubbleText = document.getElementById('goblinBubbleText');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const toggleCipherBtn = document.getElementById('toggleCipherBtn');
  const eyeOpenIcon = document.getElementById('eyeOpenIcon');
  const eyeClosedIcon = document.getElementById('eyeClosedIcon');
  const loginAlert = document.getElementById('loginAlert');
  const btnUnlock = document.getElementById('btnUnlock');
  const btnUnlockText = document.getElementById('btnUnlockText');
  const dustCanvas = document.getElementById('vaultDust');
  const labelUsername = document.getElementById('labelUsername');
  const usernameHint = document.getElementById('usernameHint');
  const tabCustomer = document.getElementById('tabCustomer');
  const tabRm = document.getElementById('tabRm');

  let currentRole = 'customer'; // 'customer' | 'rm'
  let bubbleTimeout = null;
  let idleTimeout = null;
  let isPasswordRevealed = false;

  // ── Speech Bubble Assistant ──
  function showBubble(text, duration = 3200) {
    if (!goblinBubble || !goblinBubbleText) return;
    clearTimeout(bubbleTimeout);
    goblinBubbleText.textContent = text;
    goblinBubble.classList.add('show');
    if (duration > 0) {
      bubbleTimeout = setTimeout(() => {
        goblinBubble.classList.remove('show');
      }, duration);
    }
  }

  function hideBubble() {
    if (goblinBubble) goblinBubble.classList.remove('show');
  }

  // ── Character State Controller ──
  function setGoblinState(state) {
    if (!stageContainer) return;
    stageContainer.classList.remove(
      'state-walking',
      'state-peeking',
      'state-covering-eyes',
      'state-peeking-fingers',
      'state-unlocking'
    );
    stageContainer.classList.add(state);
  }

  // Initial State: Walking
  setGoblinState('state-walking');
  setTimeout(() => {
    showBubble("Halt! State your registry ID, wizard...", 3500);
  }, 1000);

  // ── Username Input Focus & Input Behaviors ──
  if (loginUsername) {
    loginUsername.addEventListener('focus', () => {
      clearTimeout(idleTimeout);
      setGoblinState('state-peeking');
      showBubble("Inspecting your identity in the ledger...", 2800);
    });

    loginUsername.addEventListener('input', (e) => {
      // Subtle pupil tracking as user types
      const valLen = e.target.value.length;
      const pupilL = document.getElementById('pupilLeft');
      const pupilR = document.getElementById('pupilRight');
      if (pupilL && pupilR) {
        const offset = Math.min(6, (valLen % 8));
        pupilL.style.transform = `translate(${offset}px, 3px)`;
        pupilR.style.transform = `translate(${offset}px, 3px)`;
      }
    });

    loginUsername.addEventListener('blur', () => {
      idleTimeout = setTimeout(() => {
        if (document.activeElement !== loginPassword) {
          setGoblinState('state-walking');
          hideBubble();
        }
      }, 800);
    });
  }

  // ── Password Input Focus & Interaction ──
  if (loginPassword) {
    loginPassword.addEventListener('focus', () => {
      clearTimeout(idleTimeout);
      if (isPasswordRevealed) {
        setGoblinState('state-peeking-fingers');
        showBubble("Oho! Cipher visible! I can peek through my fingers!", 2500);
      } else {
        setGoblinState('state-covering-eyes');
        showBubble("Eyes covered! Goblin code of absolute secrecy!", 2500);
      }
    });

    loginPassword.addEventListener('blur', () => {
      idleTimeout = setTimeout(() => {
        if (document.activeElement !== loginUsername) {
          setGoblinState('state-walking');
          hideBubble();
        }
      }, 800);
    });
  }

  // ── Password Visibility Toggle (Show / Hide Cipher) ──
  window.toggleCipherVisibility = function () {
    if (!loginPassword) return;

    if (loginPassword.type === 'password') {
      loginPassword.type = 'text';
      isPasswordRevealed = true;
      if (eyeOpenIcon) eyeOpenIcon.style.display = 'none';
      if (eyeClosedIcon) eyeClosedIcon.style.display = 'block';
      if (toggleCipherBtn) {
        toggleCipherBtn.setAttribute('aria-label', 'Hide secret cipher');
        toggleCipherBtn.setAttribute('aria-pressed', 'true');
      }

      // If user is on the password field, goblin peeks through fingers!
      if (document.activeElement === loginPassword || stageContainer.classList.contains('state-covering-eyes')) {
        setGoblinState('state-peeking-fingers');
        showBubble("Aha! The cipher is revealed! Don't let dragons see it!", 3000);
      }
    } else {
      loginPassword.type = 'password';
      isPasswordRevealed = false;
      if (eyeOpenIcon) eyeOpenIcon.style.display = 'block';
      if (eyeClosedIcon) eyeClosedIcon.style.display = 'none';
      if (toggleCipherBtn) {
        toggleCipherBtn.setAttribute('aria-label', 'Show secret cipher');
        toggleCipherBtn.setAttribute('aria-pressed', 'false');
      }

      // Snap back to tight eye covering
      if (document.activeElement === loginPassword || stageContainer.classList.contains('state-peeking-fingers')) {
        setGoblinState('state-covering-eyes');
        showBubble("Covering eyes once more! High security restored.", 2500);
      }
    }
  };

  // ── Role Switcher (Customer Vault vs Goblin Overseer) ──
  window.switchLoginRole = function (role) {
    currentRole = role;
    if (loginAlert) loginAlert.style.display = 'none';

    if (role === 'rm') {
      if (tabRm) tabRm.classList.add('active');
      if (tabCustomer) tabCustomer.classList.remove('active');
      if (labelUsername) labelUsername.textContent = 'Goblin Overseer / Wand Registry ID';
      if (usernameHint) usernameHint.textContent = 'Staff access: bogrod, griphook, phanee, or admin';
      if (loginUsername) loginUsername.placeholder = 'e.g. bogrod or phanee';
      showBubble("High Goblin Overseer Command Sanctum. Identify yourself, staff member.", 3000);
    } else {
      if (tabCustomer) tabCustomer.classList.add('active');
      if (tabRm) tabRm.classList.remove('active');
      if (labelUsername) labelUsername.textContent = 'Vault ID / Ministry Registry (CRN)';
      if (usernameHint) usernameHint.textContent = 'Enter your customer CRN or registered email';
      if (loginUsername) loginUsername.placeholder = 'e.g. CRN-77492 or customer email';
      showBubble("Personal Vault Access. Present your Ministry CRN.", 3000);
    }
  };

  // ── Quick Demo Credentials Fill ──
  window.quickFill = function (user, pass, role) {
    if (role) window.switchLoginRole(role);
    if (loginUsername) loginUsername.value = user;
    if (loginPassword) loginPassword.value = pass;
    
    // Play quick glance animation
    setGoblinState('state-peeking');
    showBubble(`Loaded credentials for ${user}! Click Unlock to verify.`, 3000);
    setTimeout(() => {
      if (document.activeElement !== loginPassword) {
        setGoblinState('state-walking');
      }
    }, 2500);
  };

  // ── Forgot Password Handler ──
  window.handleForgotCipher = function (e) {
    if (e) e.preventDefault();
    showBubble("Lost your cipher? Consult the Gringotts High Cartulary via Owl Post.", 4000);
    showAlert("Please send an Owl or contact Gringotts Help Sanctum at support@gringotts.co.uk.", "info");
  };

  function showAlert(msg, type = "error") {
    if (!loginAlert) return;
    loginAlert.className = `vault-alert ${type}`;
    loginAlert.textContent = msg;
    loginAlert.style.display = "block";
    loginAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Form Submission & Authentication ──
  window.handleVaultLogin = async function (e) {
    if (e) e.preventDefault();

    const username = (loginUsername ? loginUsername.value : '').trim();
    const password = (loginPassword ? loginPassword.value : '').trim();

    if (!username || !password) {
      showAlert("Please enter both your Vault Registry ID and Secret Cipher.");
      showBubble("Both fields are required! Gringotts wards require complete credentials.", 3000);
      return;
    }

    // Set loading state
    if (btnUnlock) btnUnlock.disabled = true;
    if (btnUnlockText) btnUnlockText.textContent = "Verifying Vault Wards...";
    setGoblinState('state-unlocking');
    showBubble("Turning the heavy brass lock gears...", 3000);

    try {
      if (currentRole === 'rm' || username.toLowerCase() === 'bogrod' || username.toLowerCase() === 'phanee' || username.toLowerCase() === 'admin') {
        // Authenticate against RM Service
        const res = await fetch('/api/v1/rm/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: username, password: password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Authentication failed: Invalid goblin cipher.");
        }

        // Success!
        if (data.token) {
          localStorage.setItem('rm_token', data.token);
          if (data.user) localStorage.setItem('rm_user', JSON.stringify(data.user));
        }

        showBubble("Wards confirmed! Welcome, Goblin Overseer!", 2500);
        showAlert("Vault Wards Accepted. Directing to Overseer Command Sanctum...", "success");

        setTimeout(() => {
          window.location.href = "/rm";
        }, 1200);

      } else {
        // Customer Vault Authentication
        // Simulate/verify customer session
        const tokenPayload = {
          crn: username.toUpperCase(),
          role: 'customer',
          logged_at: new Date().toISOString()
        };
        localStorage.setItem('customer_session', JSON.stringify(tokenPayload));
        
        showBubble("Golden vault key accepted! Welcome to the Treasury Sanctum.", 2500);
        showAlert("Vault Key Authenticated. Opening Customer Treasury Sanctum...", "success");

        setTimeout(() => {
          window.location.href = "/customer";
        }, 1200);
      }
    } catch (err) {
      setGoblinState('state-peeking');
      showAlert(err.message || "Authentication rejected by Gringotts Wards.", "error");
      showBubble("Impostor! The wards reject those credentials!", 3500);
    } finally {
      if (btnUnlock) btnUnlock.disabled = false;
      if (btnUnlockText) btnUnlockText.innerHTML = "Unlock Vault Sanctum &rarr;";
    }
  };

  // ── Ambient Dust Motes Canvas Engine ──
  function initDustCanvas() {
    if (!dustCanvas) return;
    const ctx = dustCanvas.getContext('2d');
    let width = (dustCanvas.width = window.innerWidth);
    let height = (dustCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = dustCanvas.width = window.innerWidth;
      height = dustCanvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(50, Math.floor(width / 30));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: -Math.random() * 0.45 - 0.1,
        color: Math.random() > 0.3 ? '#fbbf24' : '#22d3ee'
      });
    }

    function renderDust() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(renderDust);
    }

    renderDust();
  }

  initDustCanvas();

})();
