/* Cart records reference unique catalogue card IDs, including the separate photo batch. */
(function () {
  'use strict';
  var STORAGE_KEY = 'luofu-cart-v1';
  var items = [];
  var products = {};
  var options;
  var dialog = document.getElementById('cartDialog');
  var toggle = document.getElementById('cartToggle');
  var list = document.getElementById('cartItems');
  var checkout = document.getElementById('cartCheckout');
  var returnFocus;

  function node(tag, className, text) {
    var result = document.createElement(tag);
    result.className = className || '';
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function sizesFor(product) {
    return window.LuofuSizes.sizesFor(product);
  }
  function needsOptions(product) { return needsColour(product) || sizesFor(product).length > 0; }
  function identity(item) { return JSON.stringify([item.id, item.colour, item.size]); }
  /* Colour is required across the entire catalogue.
     A single colourway is nothing to decide, so it is taken automatically and
     only a real choice interrupts the shopper. */
  function defaultColour(product) {
    var colours = (product && product.colors) || [];
    return colours.length === 1 ? colours[0] : null;
  }
  function needsColour(product) { return ((product && product.colors) || []).length > 1; }
  function resolveColour(product, selection) {
    return (selection && selection.colour) || defaultColour(product);
  }
  function validSelection(product, selection) {
    if (!product || product.availability === 'unavailable' || product.stock === 0) return false;
    var colours = (product && product.colors) || [];
    return (!colours.length || colours.indexOf(resolveColour(product, selection)) >= 0) &&
      (!sizesFor(product).length || !!selection && sizesFor(product).indexOf(selection.size) >= 0);
  }
  function clean(records) {
    if (!Array.isArray(records)) return [];
    var merged = [];
    records.slice(0, 1000).forEach(function (record) {
      if (!record || typeof record.id !== 'string' || !Object.prototype.hasOwnProperty.call(products, record.id)) return;
      if (!Number.isInteger(record.quantity) || record.quantity < 1) return;
      var product = products[record.id];
      var images = options.imagesFor(product).images;
      var entry = {
        id: product.id || product.model,
        colour: (product.colors || []).indexOf(record.colour) >= 0 ? record.colour : '',
        size: sizesFor(product).indexOf(record.size) >= 0 ? record.size : '',
        image: images.indexOf(record.image) >= 0 ? record.image : (images[0] || ''),
        quantity: Math.min(99, record.quantity)
      };
      var previous = merged.filter(function (item) { return identity(item) === identity(entry); })[0];
      if (previous) previous.quantity = Math.min(99, previous.quantity + entry.quantity);
      else merged.push(entry);
    });
    return merged;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (error) { /* Cart still works for this visit. */ }
  }
  function message() {
    var lines = ['Hello LUOFU, I would like to order:', ''];
    items.forEach(function (item, index) {
      var product = products[item.id];
      lines.push((index + 1) + '. ' + product._name + ' | Model: ' + product.model);
      lines.push('Quantity: ' + item.quantity + ' | Colour: ' + (item.colour || 'Please confirm'));
      var price = window.LuofuCommerce.priceFor(product);
      if (price !== null) lines.push(window.LuofuCommerce.formatPriceValue(price) + ' each | ' + window.LuofuCommerce.formatPriceValue(price * item.quantity));
      if (item.size) lines.push('Size: EU ' + item.size);
      lines.push(options.productUrl(product));
      if (item.image && item.image !== options.imagesFor(product).images[0]) {
        lines.push('Selected photo: ' + new URL(item.image, location.href).href);
      }
      lines.push('');
    });
    lines.push('Total quantity: ' + items.reduce(function (n, item) { return n + item.quantity; }, 0));
    if (items.every(function (item) { return window.LuofuCommerce.priceFor(products[item.id]) !== null; })) {
      lines.push('Product subtotal: ' + window.LuofuCommerce.formatPriceValue(subtotal()));
    }
    lines.push('Please confirm availability, colours, prices and delivery details.');
    return lines.join('\n');
  }
  function subtotal() {
    return items.reduce(function (sum, item) { return sum + (window.LuofuCommerce.priceFor(products[item.id]) || 0) * item.quantity; }, 0);
  }
  function action(text, label, handler) {
    var button = node('button', 'cart-action', text);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.addEventListener('click', handler);
    return button;
  }
  function render() {
    list.innerHTML = '';
    var total = items.reduce(function (n, item) { return n + item.quantity; }, 0);
    document.getElementById('cartCount').textContent = total;
    document.getElementById('cartCount').hidden = total === 0;
    toggle.setAttribute('aria-label', 'Open cart, ' + total + (total === 1 ? ' item' : ' items'));
    document.getElementById('cartEmpty').hidden = items.length > 0;
    document.getElementById('cartSummary').textContent = total ? total + (total === 1 ? ' item' : ' items') + ' in your cart' : '';
    var totalNode = document.getElementById('cartSubtotal');
    if (totalNode) {
      totalNode.hidden = !items.length;
      totalNode.textContent = items.every(function (item) { return window.LuofuCommerce.priceFor(products[item.id]) !== null; })
        ? 'Product subtotal: ' + window.LuofuCommerce.formatPriceValue(subtotal()) : 'Subtotal confirmed on WhatsApp';
    }
    var incomplete = items.some(function (item) { return !validSelection(products[item.id], item); });
    checkout.hidden = !items.length || incomplete;
    if (incomplete) document.getElementById('cartSummary').textContent += ' — review options or unavailable items below.';
    if (items.length && !incomplete) checkout.href = 'https://wa.me/' + options.whatsappNumber + '?text=' + encodeURIComponent(message());
    else checkout.removeAttribute('href');
    items.forEach(function (item, index) {
      var product = products[item.id];
      var row = node('article', 'cart-item');
      var image = node('img', 'cart-image');
      if (options.setImage) options.setImage(image, item.image, options.imageFallbacks(product));
      else image.src = item.image;
      image.alt = product._name;
      image.loading = 'lazy';
      row.appendChild(image);
      var info = node('div', 'cart-item-info');
      info.appendChild(node('h3', '', product._name));
      var price = window.LuofuCommerce.priceFor(product);
      info.appendChild(node('p', 'cart-price', price === null ? 'Price on request' : window.LuofuCommerce.formatPriceValue(price * item.quantity)));
      if (price !== null && item.quantity > 1) info.appendChild(node('p', 'cart-model', window.LuofuCommerce.formatPriceValue(price) + ' each'));
      info.appendChild(node('p', 'cart-colour', item.colour || 'Confirm colour on WhatsApp'));
      if (item.size) info.appendChild(node('p', 'cart-colour', 'Size: EU ' + item.size));
      if (product.availability === 'unavailable' || product.stock === 0) info.appendChild(node('p', 'stock-notes', 'Unavailable — remove this item to continue.'));
      else if (!validSelection(product, item)) {
        info.appendChild(action('Choose colour and size', 'Choose colour and size for ' + product._name, function () {
          close();
          options.choose(product, function (selection) {
            if (!validSelection(product, selection) || items.indexOf(item) < 0) return false;
            item.colour = resolveColour(product, selection) || '';
            item.size = selection.size;
            item.image = selection.image || item.image;
            items = clean(items); save(); render();
            document.getElementById('cartStatus').textContent = product._name + ' updated in cart.';
            return true;
          });
        }));
      }
      var controls = node('div', 'cart-controls');
      var minus = action('−', 'Decrease quantity for ' + product._name, function () { change(index, -1); });
      minus.disabled = item.quantity <= 1;
      controls.appendChild(minus);
      controls.appendChild(node('span', 'cart-quantity', String(item.quantity)));
      var plus = action('+', 'Increase quantity for ' + product._name, function () { change(index, 1); });
      plus.disabled = item.quantity >= 99 || product.availability === 'unavailable' || product.stock === 0;
      controls.appendChild(plus);
      var remove = action('Remove', 'Remove ' + product._name + ' from cart', function () {
        items.splice(index, 1); save(); render();
        document.getElementById('cartStatus').textContent = product._name + ' removed from cart.';
        var next = list.querySelector('button:not([disabled])');
        (next || document.getElementById('cartContinue')).focus();
      });
      remove.className += ' cart-remove';
      controls.appendChild(remove);
      info.appendChild(controls);
      row.appendChild(info);
      list.appendChild(row);
    });
    if (window.dispatchEvent) window.dispatchEvent(new Event('luofu:cart'));
  }
  function matching(product, selection) {
    var id = product.id || product.model;
    return items.filter(function (item) { return item.id === id && (!selection ||
      item.colour === (resolveColour(product, selection) || '') && item.size === (selection.size || '')); });
  }
  function quantity(product, selection) {
    return matching(product, selection).reduce(function (sum, item) { return sum + item.quantity; }, 0);
  }
  function adjust(product, selection, delta) {
    var matches = matching(product, selection);
    // Multiple variants need an explicit choice; never change an arbitrary size/colour.
    if (matches.length !== 1) return false;
    var item = matches[0];
    item.quantity = Math.max(0, Math.min(99, item.quantity + delta));
    items = items.filter(function (entry) { return entry.quantity > 0; });
    save(); render(); return true;
  }
  function change(index, delta) {
    items[index].quantity = Math.max(1, Math.min(99, items[index].quantity + delta));
    save(); render();
    var row = list.children[index];
    var buttons = row.querySelector('.cart-controls').querySelectorAll('.cart-action');
    (buttons[delta > 0 ? 1 : 0].disabled ? buttons[delta > 0 ? 0 : 1] : buttons[delta > 0 ? 1 : 0]).focus();
  }
  function add(product, selection) {
    if (!validSelection(product, selection)) return false;
    if (window.LuofuAnalytics) window.LuofuAnalytics.track('cart_add', product.id || product.model);
    selection = selection || {};
    items = clean(items.concat([{
      id: product.id || product.model, colour: resolveColour(product, selection) || '',
      size: selection.size || '',
      image: selection.image || options.imagesFor(product).images[0], quantity: 1
    }]));
    save(); render();
    document.getElementById('cartStatus').textContent = product._name + ' added to cart.';
  }
  function close() { dialog.close(); }
  function keepFocusInside(event) {
    if (event.key !== 'Tab' || !dialog.open) return;
    var controls = Array.prototype.filter.call(
      dialog.querySelectorAll('a[href]:not([hidden]), button:not([disabled]):not([hidden])'),
      function (control) { return control.offsetParent !== null; }
    );
    if (!controls.length) return;
    var first = controls[0];
    var last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  function init(settings) {
    options = settings;
    settings.products.forEach(function (product) {
      products[product.id || product.model] = product;
      // Saved carts from the original catalogue migrate to the current photo entry.
      products[product.model] = product;
      if (product.sourceModel) products[product.sourceModel] = product;
    });
    try { items = clean(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch (error) { items = []; }
    render();
    window.addEventListener('storage', function (event) {
      if (event.key !== STORAGE_KEY) return;
      try { items = clean(JSON.parse(event.newValue || '[]')); } catch (_) { items = []; }
      render();
    });
    toggle.addEventListener('click', function () {
      returnFocus = toggle;
      options.beforeOpen();
      render(); dialog.showModal();
      document.body.classList.add('cart-open');
      document.getElementById('cartClose').focus();
    });
    document.getElementById('cartClose').addEventListener('click', close);
    document.getElementById('cartContinue').addEventListener('click', close);
    dialog.addEventListener('keydown', keepFocusInside);
    dialog.addEventListener('close', function () {
      document.body.classList.remove('cart-open');
      if (returnFocus) returnFocus.focus();
    });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    // Checkout opens a draft; keep the cart until the shopper removes its items.
  }
  window.LuofuCart = {
    init: init, add: add, quantity: quantity, adjust: adjust,
    needsColour: needsColour, needsOptions: needsOptions, sizesFor: sizesFor, validSelection: validSelection,
    defaultColour: defaultColour, resolveColour: resolveColour
  };
})();
