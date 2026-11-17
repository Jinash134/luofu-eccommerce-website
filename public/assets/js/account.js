(function () {
  'use strict';
  var config = window.LUOFU_SERVICES || {};
  var ready = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || '') && !!config.publishableKey;
  var adminPage = !!document.body.dataset.admin;
  function selectedMethod() {
    if (el('accountMethod').value === 'password') return 'password';
    return el('accountDelivery').value;
  }
  function methodReady() {
    var method = selectedMethod();
    if (method !== 'password' && !el('accountContact').value.trim()) return ready && (config.emailOtpEnabled === true || config.phoneOtpEnabled === true);
    return ready && (method === 'password' || (method === 'phone' ? config.phoneOtpEnabled === true : config.emailOtpEnabled === true));
  }
  function availability() {
    if (session) return;
    var available = methodReady();
    el('accountSubmit').disabled = !available;
    if (!available) el('accountMessage').textContent = 'Code sign-in is being set up. Shopping and WhatsApp checkout are available.';
    else if (!pending && !session) el('accountMessage').textContent = '';
  }
  var session = null, pending = null, cooldown = 0, refreshing = null;
  var storageKey = 'luofu-account-v1';
  try { session = JSON.parse(sessionStorage.getItem(storageKey)); } catch (_) {}
  if (!session || !session.access_token || !session.refresh_token || !session.user || !Number.isFinite(session.expires_at)) session = null;

  async function request(path, body, token, method) {
    if (!ready) throw new Error('Login is being set up. Please try again later.');
    var headers = { apikey: config.publishableKey, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    var response = await fetch(config.supabaseUrl + path, {
      method: method || 'POST', headers: headers, body: method === 'GET' ? undefined : JSON.stringify(body || {}), signal: AbortSignal.timeout(15000)
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(response.status === 429 ? 'Too many attempts. Please wait before trying again.' :
        path === '/auth/v1/verify' ? 'That code is invalid or expired. Please try again or request a new code.' :
        response.status === 401 || response.status === 403 ? 'Access denied. Please sign in with an authorised account.' :
        'Unable to complete the request. Please try again later.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function save(value) {
    session = value;
    if (session) session.expires_at = session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in;
    try { if (session) sessionStorage.setItem(storageKey, JSON.stringify(session)); else sessionStorage.removeItem(storageKey); } catch (_) {}
    window.dispatchEvent(new Event('luofu:account'));
  }
  async function token() {
    if (!session) return null;
    if (session.expires_at > Date.now() / 1000 + 60) return session.access_token;
    if (!refreshing) {
      var refreshToken = session.refresh_token;
      refreshing = request('/auth/v1/token?grant_type=refresh_token', {refresh_token: refreshToken})
        .then(function (value) {
          if (!session || session.refresh_token !== refreshToken) return null;
          if (session.pending_profile) value.pending_profile = session.pending_profile;
          save(value); return value.access_token;
        })
        .catch(function (error) {
          if (session && session.refresh_token === refreshToken && (error.status === 400 || error.status === 401 || error.status === 403)) save(null);
          throw error;
        })
        .finally(function () { refreshing = null; });
    }
    return refreshing;
  }
  async function rpc(name, args, authenticated) {
    var access = authenticated ? await token() : null;
    if (authenticated && !access) throw new Error('Sign in to view the admin panel.');
    return request('/rest/v1/rpc/' + name, args, access);
  }
  var dialog = document.createElement('dialog');
  dialog.className = 'cart-dialog account-dialog';
  dialog.setAttribute('aria-labelledby', 'accountTitle');
  dialog.innerHTML = '<form id="accountForm"><h2 id="accountTitle">Sign in</h2>' +
    '<p class="account-intro">Welcome to LUOFU. Enter your details to sign in with a one-time code.</p>' +
    '<label id="accountMethodLabel" hidden>Sign in using<select id="accountMethod"><option value="auto">Email / mobile number</option></select></label>' +
    '<div id="accountProfileFields"><label>User name<input id="accountName" autocomplete="name" placeholder="Your name" maxlength="80"></label></div>' +
    '<label id="accountContactLabel"><span id="accountContactText">Email address</span><input id="accountContact" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="you@example.com" required maxlength="254"></label>' +
    '<div id="accountPhoneFields" class="account-phone"><label>Country code<input id="accountCountry" type="tel" autocomplete="tel-country-code" aria-label="Country code" value="+974" placeholder="+974" maxlength="4" list="countryCodes"><datalist id="countryCodes"><option value="+974">Qatar</option><option value="+91">India</option><option value="+971">UAE</option><option value="+966">Saudi Arabia</option><option value="+44">UK</option><option value="+1">USA / Canada</option></datalist></label><label>Mobile number<input id="accountPhone" type="tel" autocomplete="tel-national" placeholder="Mobile number" maxlength="20"></label></div>' +
    '<label id="accountDeliveryLabel">Send verification code by<select id="accountDelivery"><option value="email">Email</option><option value="phone">SMS</option></select></label>' +
    '<label id="accountPasswordLabel" hidden>Password<input id="accountPassword" type="password" autocomplete="current-password" maxlength="256"></label>' +
    '<label id="accountCodeLabel" hidden>Verification code<input id="accountCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10"></label>' +
    '<button class="btn btn-primary" id="accountSubmit" type="submit">Send code</button></form>' +
    '<p id="accountMessage" role="status" aria-live="polite"></p><div class="account-actions">' +
    '<button id="accountResend" class="btn btn-ghost" type="button" hidden>Resend code</button>' +
    '<button id="accountChange" class="btn btn-ghost" type="button" hidden>Change email / phone</button>' +
    '<button id="accountLogout" class="btn btn-ghost" type="button" hidden>Sign out</button>' +
    '<button id="accountSaveProfile" class="btn btn-ghost" type="button" hidden>Retry saving details</button>' +
    '<button id="accountClose" class="btn btn-ghost" type="button">Close</button></div>';
  document.body.appendChild(dialog);
  function el(id) { return document.getElementById(id); }
  if (adminPage) {
    var passwordOption = document.createElement('option'); passwordOption.value = 'password'; passwordOption.textContent = 'Admin email and password';
    el('accountMethod').prepend(passwordOption);
    el('accountMethod').value = 'password';
    el('accountMethodLabel').hidden = false;
  }
  function passwordMode() {
    var enabled = el('accountMethod').value === 'password';
    el('accountPasswordLabel').hidden = !enabled;
    el('accountPassword').required = enabled;
    el('accountSubmit').textContent = enabled ? 'Sign in' : 'Send code';
    el('accountContact').type = 'email';
    el('accountContactText').textContent = 'Email address';
    el('accountContact').placeholder = 'you@example.com';
    ['accountProfileFields','accountPhoneFields','accountDeliveryLabel'].forEach(function(id){el(id).hidden=enabled;});
    ['accountName','accountCountry','accountPhone'].forEach(function(id){el(id).required=!enabled;});
  }
  var toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'account-toggle'; toggle.id = 'accountToggle';
  toggle.setAttribute('aria-label', 'Sign in'); toggle.setAttribute('aria-haspopup', 'dialog');
  toggle.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>';
  var cart = el('cartToggle');
  if (cart) cart.before(toggle);
  function reset() {
    pending = null; el('accountCode').value = ''; el('accountCode').required = false;
    el('accountCodeLabel').hidden = true; el('accountContactLabel').hidden = false;
    el('accountMethodLabel').hidden = !adminPage; el('accountSubmit').textContent = 'Send code';
    el('accountResend').hidden = true; el('accountChange').hidden = true;
    el('accountPassword').value = ''; passwordMode();
  }
  function render() {
    el('accountForm').hidden = !!session;
    el('accountLogout').hidden = !session;
    el('accountSaveProfile').hidden = !session || !session.pending_profile;
    toggle.setAttribute('aria-label', session ? 'Your account' : 'Sign in');
    if (session) { reset(); el('accountMessage').textContent = 'Signed in as ' + (session.user.email || session.user.phone || 'customer') + '.'; }
  }
  var returnFocus;
  function open() {
    returnFocus = document.activeElement;
    window.dispatchEvent(new Event('luofu:before-account'));
    if (!returnFocus || !returnFocus.getClientRects().length) returnFocus = document.getElementById('menuToggle') || toggle;
    render();
    availability();
    dialog.showModal();
    document.body.classList.add('account-open');
  }
  dialog.addEventListener('close', function () {
    document.body.classList.remove('account-open');
    if (returnFocus && returnFocus.getClientRects().length) returnFocus.focus();
  });
  toggle.addEventListener('click', open);
  el('accountClose').onclick = function () { dialog.close(); };
  el('accountMethod').onchange = function () {
    el('accountContact').value = '';
    passwordMode(); availability();
  };
  el('accountContact').addEventListener('input', availability);
  el('accountDelivery').addEventListener('change', availability);
  var profileDraft = session && session.pending_profile || null;
  function profileDetails() {
    var name = el('accountName').value.trim(), email = el('accountContact').value.trim();
    var country = el('accountCountry').value.trim(), number = el('accountPhone').value.replace(/[\s()-]/g,'');
    if (!name) throw new Error('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
    if (!/^\+[1-9][0-9]{0,2}$/.test(country) || !/^[0-9]+$/.test(number) || !/^\+[1-9][0-9]{6,14}$/.test(country+number)) throw new Error('Enter a valid country code and mobile number, without repeating the country code.');
    return {full_name:name, contact_email:email, contact_phone:country+number};
  }
  async function saveProfile() {
    if (!profileDraft || !session) return;
    var user = await request('/auth/v1/user', {data:profileDraft}, await token(), 'PUT');
    if (!user || !user.id) throw new Error('Your details could not be saved. Please retry.');
    session.user = user; profileDraft = null; delete session.pending_profile; save(session);
    el('accountSaveProfile').hidden = true; render();
  }
  el('accountSaveProfile').onclick = function () { busy(saveProfile); };
  async function send() {
    if (!methodReady()) throw new Error('Code sign-in is being set up. Please try again later.');
    if (Date.now() < cooldown) throw new Error('Please wait ' + Math.ceil((cooldown - Date.now()) / 1000) + ' seconds before requesting another code.');
    var method = selectedMethod();
    var details = profileDetails();
    var value = method === 'phone' ? details.contact_phone : details.contact_email;
    if (method === 'phone') {
      value = value.replace(/[\s()-]/g, '');
      if (!/^\+[1-9][0-9]{6,14}$/.test(value)) throw new Error('Enter an international number with + and country code, for example +97412345678.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email address.');
    var body = { create_user: true }; body[method] = value;
    if (method === 'phone') body.channel = 'sms';
    await request('/auth/v1/otp', body);
    cooldown = Date.now() + 60000; pending = { method: method, value: value, profile:details };
    ['accountProfileFields','accountPhoneFields','accountDeliveryLabel'].forEach(function(id){el(id).hidden=true;});
    el('accountContactLabel').hidden = true; el('accountMethodLabel').hidden = true;
    el('accountCodeLabel').hidden = false; el('accountCode').required = true;
    el('accountSubmit').textContent = 'Verify and sign in';
    el('accountResend').hidden = false; el('accountChange').hidden = false;
    el('accountMessage').textContent = 'Code requested for ' + value + '. Check your ' + (method === 'phone' ? 'SMS messages.' : 'inbox and spam folder.');
    el('accountCode').focus();
  }
  async function busy(work) {
    var controls = Array.from(dialog.querySelectorAll('input, select, button:not(#accountClose)'));
    controls.forEach(function (control) { control.disabled = true; });
    try { await work(); } catch (error) { el('accountMessage').textContent = error.name === 'TimeoutError' || error instanceof TypeError ? 'Connection failed. Please try again.' : error.message; }
    finally {
      controls.forEach(function (control) { control.disabled = false; });
      el('accountSubmit').disabled = !methodReady();
      if (dialog.open && pending && !session) el('accountCode').focus();
    }
  }
  el('accountForm').onsubmit = function (event) {
    event.preventDefault();
    busy(async function () {
      if (el('accountMethod').value === 'password') {
        var result = await request('/auth/v1/token?grant_type=password', {email: el('accountContact').value.trim(), password: el('accountPassword').value});
        if (!result.access_token || !result.refresh_token || !result.user) throw new Error('Sign-in did not complete. Please try again.');
        save(result); render(); return;
      }
      if (!pending) return send();
      var body = { type: pending.method === 'phone' ? 'sms' : 'email', token: el('accountCode').value.trim() };
      body[pending.method] = pending.value;
      var result = await request('/auth/v1/verify', body);
      if (!result.access_token || !result.refresh_token || !result.user) throw new Error('Verification did not complete. Please try again.');
      profileDraft = pending.profile;
      result.pending_profile = profileDraft;
      save(result); render();
      el('accountSaveProfile').hidden = false;
      try { await saveProfile(); } catch (_) { el('accountMessage').textContent = 'You are signed in, but your details were not saved. Please retry saving details.'; }
    });
  };
  el('accountResend').onclick = function () { busy(send); };
  el('accountChange').onclick = function () { reset(); el('accountMessage').textContent = ''; el('accountContact').focus(); };
  el('accountLogout').onclick = function () { busy(async function () {
    try { var access = await token(); if (access) await request('/auth/v1/logout?scope=local', {}, access); }
    finally { profileDraft=null; el('accountSaveProfile').hidden=true; save(null); reset(); render(); el('accountMessage').textContent = 'Signed out on this device.'; }
  }); };
  dialog.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    var controls = Array.from(dialog.querySelectorAll('button, input, select')).filter(function (item) { return !item.disabled && item.getClientRects().length; });
    var first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener('luofu:account', render);
  function userId() { return session && session.user && session.user.id || null; }
  async function readFavourites() {
    var id = userId(), access = await token();
    if (!id || !access || id !== userId()) throw new Error('Sign in to sync favourites.');
    var user = await request('/auth/v1/user', null, access, 'GET');
    if (id !== userId() || user.id !== id) throw new Error('Account changed. Please try again.');
    return user.user_metadata && user.user_metadata.luofu_favourites || [];
  }
  async function writeFavourites(models) {
    var id = userId(), access = await token();
    if (!id || !access || id !== userId()) throw new Error('Sign in to sync favourites.');
    var user = await request('/auth/v1/user', { data: { luofu_favourites: models } }, access, 'PUT');
    if (id !== userId() || user.id !== id) throw new Error('Account changed. Please try again.');
    session.user = user;
    // This is a preference update, not an authentication transition.
    try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch (_) {}
  }
  window.LuofuAccount = { ready: ready, rpc: rpc, open: open, userId: userId,
    readFavourites: readFavourites, writeFavourites: writeFavourites,
    signedIn: function () { return !!session; } };
  passwordMode(); render();
})();
