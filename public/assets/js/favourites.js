(function () {
  'use strict';
  var account = window.LuofuAccount;
  var guestKey = 'luofu-favourites';
  var owner, key, models = [], pending = {}, validModels = [], aliases = {}, generation = 0;
  var timer, syncing = false, status = '';
  function read(name, fallback) {
    try { return JSON.parse(localStorage.getItem(name)) || fallback; } catch (_) { return fallback; }
  }
  function clean(values) {
    return Array.isArray(values) ? values.map(function (model) { return aliases[model] || model; }).filter(function (model, index, canonical) {
      return typeof model === 'string' && validModels.indexOf(model) >= 0 && canonical.indexOf(model) === index;
    }) : [];
  }
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(models));
      if (owner) localStorage.setItem(key + '-pending', JSON.stringify(pending));
    } catch (_) { status = 'Favourites are saved for this visit. Browser storage is unavailable.'; }
  }
  function notify() { window.dispatchEvent(new Event('luofu:favourites')); }
  function apply(values, changes) {
    var result = clean(values);
    Object.keys(changes).forEach(function (model) {
      var index = result.indexOf(model);
      if (changes[model] && index < 0) result.push(model);
      if (!changes[model] && index >= 0) result.splice(index, 1);
    });
    return clean(result);
  }
  async function sync() {
    if (!owner || syncing || !navigator.onLine) return;
    var version = generation;
    syncing = true;
    try {
      var remote = await account.readFavourites();
      if (version !== generation) return;
      var changes = Object.assign({}, pending);
      var merged = apply(remote, changes);
      if (Object.keys(changes).length) await account.writeFavourites(merged);
      if (version !== generation) return;
      Object.keys(changes).forEach(function (model) {
        if (pending[model] === changes[model]) delete pending[model];
      });
      models = apply(merged, pending);
      status = 'Saved to your account.';
      persist(); notify();
    } catch (_) {
      if (version === generation) {
        status = 'Saved on this device. Account sync is unavailable; retry when connected.';
        notify();
      }
    } finally {
      if (version === generation) {
        syncing = false;
        // New edits made while saving get their own request. Errors retry only
        // on an explicit retry, a new edit or a restored connection.
        if (status === 'Saved to your account.' && Object.keys(pending).length) schedule();
      }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(sync, 450); }
  function switchAccount() {
    var next = account && account.userId();
    if (key && next === owner) return;
    generation++; clearTimeout(timer); syncing = false;
    owner = next; key = owner ? guestKey + ':' + owner : guestKey;
    models = clean(read(key, [])); pending = owner ? read(key + '-pending', {}) : {};
    if (!pending || typeof pending !== 'object' || Array.isArray(pending)) pending = {};
    Object.keys(pending).forEach(function (model) {
      if (validModels.indexOf(model) < 0 || typeof pending[model] !== 'boolean') delete pending[model];
    });
    if (owner) {
      // Move the current guest selection into this account once. Signing out
      // returns to a separate guest list rather than exposing account data.
      clean(read(guestKey, [])).forEach(function (model) { pending[model] = true; });
      models = apply(models, pending);
      try { localStorage.removeItem(guestKey); } catch (_) {}
    }
    status = owner ? 'Syncing your favourites…' : 'Saved on this device.';
    persist(); notify(); sync();
  }
  function init(products) {
    validModels = products.map(function (product) { return product.model; });
    products.forEach(function (product) { if (product.sourceModel && product.sourceModel !== product.model) aliases[product.sourceModel] = product.model; });
    switchAccount();
    window.addEventListener('luofu:account', switchAccount);
    window.addEventListener('online', sync);
    window.addEventListener('storage', function (event) {
      if (event.key === key) { models = clean(read(key, [])); notify(); }
      if (event.key === key + '-pending') { pending = read(key + '-pending', {}); schedule(); }
    });
  }
  function toggle(model) {
    if (validModels.indexOf(model) < 0) return;
    var selected = models.indexOf(model) < 0;
    models = apply(models, Object.fromEntries([[model, selected]]));
    if (owner) pending[model] = selected;
    status = owner ? 'Saving your favourites…' : 'Saved on this device.';
    persist(); notify(); if (owner) schedule();
    return selected;
  }
  window.LuofuFavourites = { init: init, toggle: toggle, retry: sync,
    has: function (model) { return models.indexOf(model) >= 0; },
    list: function () { return models.slice(); }, status: function () { return status; } };
})();
