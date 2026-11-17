(function () {
  'use strict';
  var account = window.LuofuAccount, config = window.LUOFU_SERVICES || {};
  if (!account || !account.ready || !config.analyticsEnabled || document.body.dataset.admin) return;
  var consentKey = 'luofu-analytics-consent', visitorKey = 'luofu-visitor', visitKey = 'luofu-visit';
  var allowed = false, visitor, visit;
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  var choice = read(consentKey);
  var notice = document.createElement('aside'); notice.className = 'analytics-consent';
  notice.setAttribute('aria-label', 'Visitor analytics preferences');
  notice.innerHTML = '<p>Allow anonymous usage analytics? We count visits, product interest and cart actions to improve the shop. We do not include your email, phone number or message contents.</p><button class="btn btn-primary" type="button">Allow analytics</button><button class="btn btn-ghost" type="button">Decline</button>';
  document.body.appendChild(notice); notice.hidden = !!choice;
  var preferences = document.createElement('button'); preferences.type = 'button';
  preferences.className = 'analytics-preferences'; preferences.textContent = 'Analytics preferences';
  var footer = document.querySelector('.footer-bottom-inner');
  if (footer) footer.appendChild(preferences);
  preferences.onclick = function () { notice.hidden = false; notice.querySelector('button').focus(); };
  function start() {
    allowed = true;
    visitor = read(visitorKey) || crypto.randomUUID(); write(visitorKey, visitor);
    try { visit = JSON.parse(sessionStorage.getItem(visitKey)); } catch (_) {}
    track('page_view');
  }
  function stop() {
    allowed = false;
    try { localStorage.removeItem(visitorKey); sessionStorage.removeItem(visitKey); } catch (_) {}
  }
  notice.querySelectorAll('button').forEach(function (button, index) {
    button.onclick = function () { write(consentKey, index === 0 ? 'yes' : 'no'); notice.hidden = true; if (!index) start(); else stop(); };
  });
  window.addEventListener('storage', function (event) { if (event.key === consentKey && event.newValue !== 'yes') stop(); });
  function track(event, product) {
    if (!allowed) return;
    if (!visit || !visit.id || Date.now() - visit.time > 30 * 60 * 1000) visit = { id: crypto.randomUUID() };
    visit.time = Date.now();
    try { sessionStorage.setItem(visitKey, JSON.stringify(visit)); } catch (_) {}
    var referrer = '';
    try { referrer = new URL(document.referrer).hostname; if (referrer === location.hostname) referrer = ''; } catch (_) {}
    account.rpc('record_visit_event', {
      p_visitor: visitor, p_session: visit.id, p_event: event,
      p_product: String(product || '').slice(0, 80),
      p_device: innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop',
      p_referrer: referrer.slice(0, 253)
    }, false).catch(function () { /* Analytics failure must never interrupt shopping. */ });
  }
  document.addEventListener('click', function (event) {
    var target = event.target.closest('a,button'); if (!target) return;
    if (target.id === 'cartCheckout') track('checkout_click');
    else if (target.matches('.modal-wa') && (target.getAttribute('href') || '').indexOf('https://wa.me/') === 0) track('whatsapp_click', target.dataset.productId || '');
  });
  window.LuofuAnalytics = { track: track };
  if (choice === 'yes') start();
})();
