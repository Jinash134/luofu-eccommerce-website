(function () {
  'use strict';
  var account = window.LuofuAccount, report = null, generation = 0;
  function el(id) { return document.getElementById(id); }
  function table(id, headers, rows) {
    var target = el(id); target.replaceChildren();
    if (!rows.length) { target.textContent = 'No activity in this period.'; return; }
    var table = document.createElement('table'), head = table.createTHead().insertRow();
    headers.forEach(function (title) { var cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = title; head.appendChild(cell); });
    var body = table.createTBody();
    rows.forEach(function (values) { var row = body.insertRow(); values.forEach(function (value) { row.insertCell().textContent = String(value); }); });
    target.appendChild(table);
  }
  async function refresh() {
    var current = ++generation;
    el('adminDashboard').hidden = true; report = null;
    el('adminLogin').textContent = account.signedIn() ? 'Your account' : 'Sign in';
    if (!account.ready) { el('adminStatus').textContent = 'Admin analytics is not connected yet. Backend configuration is required.'; return; }
    if (!account.signedIn()) { el('adminStatus').textContent = 'Sign in with the administrator account to view analytics.'; return; }
    el('adminStatus').textContent = 'Loading analytics…';
    try {
      var data = await account.rpc('admin_analytics', { p_days: Number(el('adminDays').value) }, true);
      if (current !== generation) return;
      report = data;
      var metrics = el('adminMetrics'); metrics.replaceChildren();
      [['Unique visitors', data.visitors], ['Sessions', data.sessions], ['Page views', data.page_views], ['Product views', data.product_views], ['Cart additions', data.cart_adds], ['Checkout clicks', data.checkouts], ['Direct WhatsApp clicks', data.whatsapp_clicks], ['Verified accounts (all time)', data.accounts], ['New verified accounts', data.new_accounts]].forEach(function (item) {
        var box = document.createElement('div'); box.className = 'admin-metric';
        var number = document.createElement('strong'); number.textContent = Number(item[1] || 0).toLocaleString();
        var label = document.createElement('span'); label.textContent = item[0]; box.append(number, label); metrics.appendChild(box);
      });
      table('adminDaily', ['Date (UTC)', 'Visitors', 'Sessions', 'Views'], data.daily.map(function (row) { return [row.day, row.visitors, row.sessions, row.views]; }));
      table('adminProducts', ['Product ID', 'Views', 'Cart adds'], data.products.map(function (row) { return [row.product, row.views, row.adds]; }));
      table('adminDevices', ['Device', 'Sessions'], data.devices.map(function (row) { return [row.device, row.sessions]; }));
      table('adminReferrers', ['Source', 'Sessions'], data.referrers.map(function (row) { return [row.referrer || 'Direct / unknown', row.sessions]; }));
      el('adminDashboard').hidden = false;
      el('adminStatus').textContent = 'Updated ' + new Date(data.generated_at).toLocaleString() + '.';
    } catch (error) {
      if (current === generation) el('adminStatus').textContent = error.status === 401 || error.status === 403 ? 'This account does not have administrator access.' : error.message;
    }
  }
  el('adminLogin').onclick = account.open;
  el('adminRefresh').onclick = refresh; el('adminDays').onchange = refresh;
  el('adminExport').onclick = function () {
    if (!report) return;
    var url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'}));
    var link = document.createElement('a'); link.href = url; link.download = 'luofu-analytics-' + new Date().toISOString().slice(0, 10) + '.json'; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
  window.addEventListener('luofu:account', refresh); refresh();
})();
