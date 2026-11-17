/* ==========================================================================
   LUOFU — product catalogue
   Vanilla JS. No dependencies. Data source: data/products.json
   ========================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     Config
     ----------------------------------------------------------------------
     Supplied retail prices use QAR. Commerce owns formatting and precedence.
     -------------------------------------------------------------------- */
  var CONFIG = {
    PRODUCTS_URL: 'data/products.json',
    ADDITIONAL_PRODUCTS_URL: 'data/products-whatsapp.json',
    COPY_URL: 'data/product-copy.json',
    HQ_MANIFEST_URL: 'data/hq-manifest.json',
    CLOUDINARY_MANIFEST_URL: 'data/cloudinary-manifest.json',
    HQ_DIR: 'assets/products-hq/',
    HQ_EXTENSIONS: ['webp', 'png', 'jpg', 'jpeg'],
    /* Cart checkout prepares the order in WhatsApp. */
    WHATSAPP_NUMBER: '97433518274'
  };

  /* The five catalogue categories, and every spelling seen in the source data
     that maps onto them. Anything unrecognised falls back to the copy overlay,
     so "Not specified" can never reach the page. */
  var CATEGORY_ALIASES = {
    slipper: 'Slippers', slippers: 'Slippers',
    slide: 'Slides', slides: 'Slides',
    chappal: 'Chappals', chappals: 'Chappals',
    sandal: 'Sandals', sandals: 'Sandals',
    clog: 'Clogs', clogs: 'Clogs'
  };

  /* ---------------------------------------------------------------------- */

  var els = {
    grid: document.getElementById('productGrid'),
    resultCount: document.getElementById('resultCount'),
    emptyState: document.getElementById('emptyState'),
    loadError: document.getElementById('loadError'),
    resetFilters: document.getElementById('resetFilters'),
    search: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    genderFilters: document.getElementById('genderFilters'),
    typeFilters: document.getElementById('typeFilters'),
    modal: document.getElementById('productModal'),
    modalBody: document.getElementById('modalBody'),
    menuToggle: document.getElementById('menuToggle'),
    mobileMenu: document.getElementById('mobileMenu'),
    catalogue: document.getElementById('catalogue'),
    favourites: document.getElementById('favourites'),
    favouritesGrid: document.getElementById('favouritesGrid'),
    favouritesEmpty: document.getElementById('favouritesEmpty'),
    headerFavouritesCount: document.getElementById('headerFavouritesCount'),
    mobileFavouritesCount: document.getElementById('mobileFavouritesCount')
  };

  var state = {
    products: [],
    gender: 'all',
    type: 'all',
    query: '',
    lastFocused: null
  };

  /* HQ image resolution -------------------------------------------------- */

  var hqImages = {};  // { MODEL: ["assets/products-hq/MODEL.webp", ...] }
  var referenceImages = {};

  var HQ_FILE_RE = new RegExp('\\.(' + CONFIG.HQ_EXTENSIONS.join('|') + ')$', 'i');
  var HQ_VARIANT_RE = /-(\d+)$/;   // MODEL-2.webp is the second image of MODEL

  /**
   * Images to show for a product: high-quality overrides when present,
   * otherwise the low-resolution images extracted from the spreadsheet.
   */
  function imagesFor(product) {
    var hq = hqImages[product.model];
    if (hq && hq.length) return { images: hq, isHq: true };

    if (product.imageSource === 'cloudinary' && product.images && product.images.length) {
      return {
        images: product.images.filter(function (src) { return (product.hiddenGalleryImages || []).indexOf(src) < 0; }),
        fallbackImages: product.fallbackImages || [],
        isHq: true
      };
    }
    var fallback = (product.images && product.images.length)
      ? product.images
      : (product.image ? [product.image] : []);
    return { images: fallback, isHq: false };
  }

  /** Group HQ filenames by model code: MODEL.ext first, then MODEL-2, -3 … */
  function groupHqFiles(filenames) {
    var grouped = {};

    filenames.filter(function (name) { return HQ_FILE_RE.test(name); })
      .forEach(function (name) {
        var stem = name.replace(HQ_FILE_RE, '');
        var model = stem.replace(HQ_VARIANT_RE, '');
        var variant = HQ_VARIANT_RE.exec(stem);
        (grouped[model] = grouped[model] || []).push({
          path: CONFIG.HQ_DIR + name,
          index: variant ? parseInt(variant[1], 10) : 1,
          ext: CONFIG.HQ_EXTENSIONS.indexOf(name.split('.').pop().toLowerCase())
        });
      });

    Object.keys(grouped).forEach(function (model) {
      grouped[model] = grouped[model].sort(function (a, b) {
        return (a.index - b.index) || (a.ext - b.ext);
      }).map(function (entry) { return entry.path; });
    });
    return grouped;
  }

  /** Upgrade a single <img data-model> to its HQ file when one exists. */
  function upgradeImage(img) {
    var hq = hqImages[img.getAttribute('data-model')];
    var original = img.getAttribute('src');
    if (hq && hq.length) setImage(img, hq[0], [original]);
  }

  function setImage(img, src, fallbacks) {
    var candidates = [src].concat(fallbacks || []).filter(function (value, i, list) {
      return typeof value === 'string' && value && list.indexOf(value) === i;
    });
    var index = 0;
    img.onerror = function () {
      index++;
      if (index < candidates.length) img.src = candidates[index];
      else {
        img.onerror = null; img.hidden = true;
        if (!img.parentNode.querySelector('.no-image')) img.parentNode.appendChild(el('span', 'no-image', 'Image unavailable'));
      }
    };
    img.hidden = false;
    if (candidates.length) img.src = candidates[0];
  }
  function imageFallbacks(product) {
    return (product.fallbackImages || []).concat(referenceImages[product.sourceModel || product.model] || []);
  }

  /* Helpers -------------------------------------------------------------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function normalize(value) {
    return String(value == null ? '' : value).toLowerCase().trim();
  }

  /* Colourways are stored in caps ("ROSE SMOKE/WISTFUL MAUVE"); soften the
     case for display without altering the wording itself. */
  function titleCase(value) {
    return String(value).toLowerCase().replace(/(^|[\s/\-])([a-z])/g, function (match, sep, letter) {
      return sep + letter.toUpperCase();
    });
  }

  /* Product copy ---------------------------------------------------------
     Name, category and description live in data/product-copy.json, keyed by
     model code, so that regenerating products.json from the Excel file never
     overwrites them. Resolved once at load into _name/_category/_description.
     -------------------------------------------------------------------- */

  var productCopy = {};

  /** Map any raw type string onto one of the five catalogue categories. */
  function normalizeCategory(value) {
    var key = normalize(value).replace(/[^a-z]/g, '');
    return CATEGORY_ALIASES[key] || null;
  }

  /** The catalogue's own TYPE column wins; the copy overlay fills the gaps. */
  function resolveCategory(product) {
    var fromData = normalizeCategory(product.type);
    if (fromData) return fromData;

    var entry = productCopy[product.sourceModel || product.model];
    return (entry && entry.categoryVerified && normalizeCategory(entry.category)) || '';
  }

  function resolveName(product) {
    var entry = productCopy[product.sourceModel || product.model];
    if (entry && entry.name) return entry.name;

    /* No overlay entry: build something readable rather than showing a code. */
    var gender = product.gender ? product.gender + "'s " : '';
    return product.name || gender + 'Footwear';
  }

  function resolveDescription(product) {
    var entry = productCopy[product.sourceModel || product.model];
    if (entry && entry.descriptionAr && window.LuofuI18n && window.LuofuI18n.language === 'ar') return entry.descriptionAr;
    if (entry && entry.description) return entry.description;

    return '';
  }

  function colourCountLabel(product) {
    var n = (product.colors || []).length;
    if (!n) return '';
    /* Non-breaking space so "3 colours" never splits across two lines. */
    return n + ' ' + (n === 1 ? 'colour' : 'colours');
  }

  function searchIndex(product) {
    return normalize([
      product.model,
      product._name,
      product._category,
      product._description,
      product.description,
      product.name,
      product.gender,
      product.type,
      product.material,
      window.LuofuI18n ? window.LuofuI18n.t(product._name) : '',
      window.LuofuI18n ? window.LuofuI18n.t(product.gender) : '',
      window.LuofuI18n ? window.LuofuI18n.t(product._category) : '',
      (product.colors || []).join(' ')
    ].join(' '));
  }

  /* WhatsApp ordering ----------------------------------------------------- */

  /**
   * Build a wa.me link with a prefilled enquiry naming the product, its model
   * code, the chosen colour when there is one, and the page it came from.
   */
  function whatsappLink(product, colour, size) {
    var parts = [
      'Hello LUOFU, I am interested in the ' + product._name,
      'model ' + product.model
    ];
    if (colour) parts.push('colour ' + titleCase(colour));
    if (size) parts.push('size EU ' + size);
    if (product._category) parts.push('category ' + product._category);
    if (window.LuofuCommerce.formatPrice(product)) parts.push(window.LuofuCommerce.formatPrice(product));

    var message = parts.join(', ') +
      '. Please share availability and ordering details.\n' + productUrl(product);

    return 'https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }

  /** Deep link back to this product, so the enquiry says what was being viewed. */
  function productUrl(product) {
    return location.origin + location.pathname + '#product/' + encodeURIComponent(product.id || product.model);
  }

  function buildWhatsappButton(product, className, label) {
    var link = el('a', className, label);
    link.dataset.productId = product.id || product.model;
    /* Until a colour is picked the link points at the product, never at a
       colourless wa.me order -- so even opening it in a new tab is safe. */
    link.href = window.LuofuCart.needsOptions(product)
      ? productUrl(product)
      : whatsappLink(product, window.LuofuCart.defaultColour(product));
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Order ' + product._name + ' on WhatsApp');
    return link;
  }

  function buildCartButton(product, className, selection, onSelect) {
    var wrapper = el('div', 'purchase-control ' + className + '-control');
    var button = el('button', 'btn btn-primary ' + className, 'Add to cart');
    button.type = 'button';
    button.setAttribute('aria-label', 'Add ' + product._name + ' to cart');
    if (product.availability === 'unavailable' || product.stock === 0) {
      button.disabled = true; button.textContent = 'Unavailable';
      wrapper.appendChild(button); wrapper.syncQuantity = function () {}; return wrapper;
    }
    var feedbackTimer;
    button.addEventListener('click', function () {
      /* Cards carry no colour choice, so send the shopper to the detail to make one. */
      if (!selection && window.LuofuCart.needsOptions(product)) { openModal(product.id || product.model); return; }
      var chosen = selection ? selection() : {};
      if (!chosen) return;
      if ((onSelect ? onSelect(chosen) : window.LuofuCart.add(product, chosen)) === false) return;
      announce(onSelect ? 'Cart updated' : 'Added to cart');
      if (onSelect) {
        button.textContent = 'Cart updated';
        clearTimeout(feedbackTimer);
        feedbackTimer = setTimeout(function () { button.textContent = 'Add to cart'; }, 1400);
      }
      sync();
      if (!stepper.hidden) plus.focus();
    });
    wrapper.appendChild(button);
    var stepper = el('div', 'quantity-stepper');
    stepper.setAttribute('aria-label', 'Quantity in cart');
    var minus = el('button', '', '\u2212'), count = el('output', '', '0'), plus = el('button', '', '+');
    minus.type = plus.type = 'button';
    minus.setAttribute('aria-label', 'Reduce quantity for ' + product._name);
    plus.setAttribute('aria-label', 'Increase quantity for ' + product._name);
    count.setAttribute('aria-live', 'polite');
    function sync() {
      var choice = selection ? selection(true) : null;
      var total = selection && !choice ? 0 : window.LuofuCart.quantity(product, choice);
      button.hidden = total > 0 && !onSelect;
      stepper.hidden = !button.hidden;
      count.textContent = String(total);
      plus.disabled = total >= 99;
    }
    function adjust(delta) {
      var choice = selection ? selection(true) : null;
      if (!window.LuofuCart.adjust(product, choice, delta)) {
        openModal(product.id || product.model);
        return;
      }
      sync();
      if (stepper.hidden) button.focus();
    }
    minus.addEventListener('click', function () { adjust(-1); });
    plus.addEventListener('click', function () { adjust(1); });
    stepper.appendChild(minus); stepper.appendChild(count); stepper.appendChild(plus);
    wrapper.appendChild(stepper);
    wrapper.syncQuantity = sync;
    sync();
    return wrapper;
  }

  /* Filtering ------------------------------------------------------------ */

  function matchesGender(product, gender) {
    return gender === 'all' || normalize(product.gender) === normalize(gender);
  }

  function matchesType(product, type) {
    if (type === 'all') return true;
    return normalize(product._category) === normalize(type);
  }

  function matchesQuery(product, query) {
    if (!query) return true;
    var haystack = product._search;
    return query.split(/\s+/).every(function (token) {
      return haystack.indexOf(token) !== -1;
    });
  }

  function filterProducts(overrides) {
    var gender = overrides && 'gender' in overrides ? overrides.gender : state.gender;
    var type = overrides && 'type' in overrides ? overrides.type : state.type;
    var query = normalize(state.query);

    return state.products.filter(function (product) {
      return matchesGender(product, gender)
        && matchesType(product, type)
        && matchesQuery(product, query);
    });
  }

  /* Filter chips --------------------------------------------------------- */

  function buildChip(label, value, active, count) {
    var chip = el('button', 'chip');
    chip.type = 'button';
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    chip.dataset.value = value;
    chip.appendChild(document.createTextNode(label));

    if (typeof count === 'number') {
      chip.appendChild(el('span', 'chip-count', String(count)));
      /* A facet with nothing behind it stays visible but cannot be selected. */
      if (count === 0 && !active) chip.disabled = true;
    }
    return chip;
  }

  function renderFilters() {
    /* Chips are rebuilt on every render, so remember which one had focus. */
    var active = document.activeElement;
    var focusedGroup = null;
    var focusedValue = null;
    if (active && active.classList && active.classList.contains('chip')) {
      focusedGroup = active.parentNode === els.typeFilters ? els.typeFilters : els.genderFilters;
      focusedValue = active.dataset.value;
    }

    var genders = [];
    var types = [];

    state.products.forEach(function (product) {
      if (product.gender && genders.indexOf(product.gender) === -1) genders.push(product.gender);
      if (product._category && types.indexOf(product._category) === -1) types.push(product._category);
    });
    genders.sort();
    types.sort();

    /* Range (gender) chips — counts ignore the gender filter itself. */
    els.genderFilters.innerHTML = '';
    els.genderFilters.appendChild(
      buildChip('All', 'all', state.gender === 'all', filterProducts({ gender: 'all' }).length)
    );
    genders.forEach(function (gender) {
      els.genderFilters.appendChild(
        buildChip(gender, gender, state.gender === gender, filterProducts({ gender: gender }).length)
      );
    });

    /* Category chips — only rendered where the catalogue records a type. */
    els.typeFilters.innerHTML = '';
    if (types.length) {
      els.typeFilters.appendChild(
        buildChip('All categories', 'all', state.type === 'all', filterProducts({ type: 'all' }).length)
      );
      types.forEach(function (type) {
        els.typeFilters.appendChild(
          buildChip(type, type, state.type === type, filterProducts({ type: type }).length)
        );
      });
    }

    if (focusedGroup && focusedValue) {
      var replacement = focusedGroup.querySelector('.chip[data-value="' + focusedValue + '"]');
      if (replacement) replacement.focus();
    }
  }

  /* Product cards -------------------------------------------------------- */

  var toastTimer;
  function announce(message) {
    var toast = document.getElementById('shopStatus');
    toast.textContent = message; toast.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2600);
  }
  var HEART = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"/></svg>';
  function favouriteButton(product) {
    var button = el('button', 'favourite-button');
    button.type = 'button'; button.dataset.favourite = product.model; button.dataset.productName = product._name;
    button.innerHTML = HEART;
    syncFavouriteButton(button);
    button.addEventListener('click', function () {
      var selected = window.LuofuFavourites.toggle(product.model);
      announce(selected ? 'Added to favourites' : 'Removed from favourites');
    });
    return button;
  }
  function syncFavouriteButton(button) {
    var active = window.LuofuFavourites.has(button.dataset.favourite);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', (active ? 'Remove from favourites: ' : 'Add to favourites: ') + button.dataset.productName);
  }
  function renderFavourites() {
    var selected = window.LuofuFavourites.list(), seen = {};
    var renderKey = selected.slice().sort().join('|');
    if (els.favouritesGrid.dataset.selection === renderKey) return;
    els.favouritesGrid.dataset.selection = renderKey;
    var focused = document.activeElement;
    var restore = els.favouritesGrid.contains(focused) && focused.dataset.favourite;
    var previousIndex = restore ? Array.from(els.favouritesGrid.querySelectorAll('[data-favourite]')).indexOf(focused) : -1;
    els.favouritesGrid.replaceChildren();
    state.products.forEach(function (product) {
      if (selected.indexOf(product.model) < 0 || seen[product.model]) return;
      seen[product.model] = true; els.favouritesGrid.appendChild(buildCard(product));
    });
    els.favouritesEmpty.hidden = selected.length > 0;
    els.favouritesGrid.hidden = selected.length === 0;
    if (previousIndex >= 0) {
      var buttons = els.favouritesGrid.querySelectorAll('[data-favourite]');
      (buttons[Math.min(previousIndex, buttons.length - 1)] || els.favouritesEmpty.querySelector('a')).focus();
    }
  }
  function syncFavourites() {
    document.querySelectorAll('[data-favourite]').forEach(syncFavouriteButton);
    var count = window.LuofuFavourites.list().length;
    [els.headerFavouritesCount, els.mobileFavouritesCount].forEach(function (node) { node.textContent = count; node.hidden = !count; });
    document.getElementById('favouritesSyncStatus').textContent = window.LuofuFavourites.status();
    document.getElementById('favouritesRetry').hidden = window.LuofuFavourites.status().indexOf('unavailable') < 0;
    if (!els.favourites.hidden) renderFavourites();
  }
  function buildSizeGuide(product) {
    var guide = window.LuofuSizes.guideFor(product);
    if (!guide) return null;
    var button = el('button', 'size-guide-trigger', 'Size guide');
    button.type = 'button'; button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', function () { window.LuofuSizes.open(product); });
    return button;
  }

  /**
   * Cards show only the essential product information. Image and copy open
   * details, where shoppers choose options and order; the heart stays separate.
   */
  function buildCard(product) {
    var card = el('article', 'product-card');
    card.dataset.model = product.model;
    card.appendChild(favouriteButton(product));

    var open = el('button', 'card-main');
    open.type = 'button';
    open.dataset.model = product.model;
    open.dataset.productId = product.id || product.model;
    open.setAttribute('aria-label', 'View details for ' + product._name);

    var media = el('div', 'product-image-wrapper');
    var resolved = imagesFor(product);
    var img = null;

    if (resolved.images.length) {
      img = document.createElement('img');
      setImage(img, resolved.images[0], imageFallbacks(product));
      img.alt = product._name;
      img.decoding = 'async';
      /* The grid always sits below the hero and the category banners, so no
         card image is ever above the fold on any screen size. */
      img.loading = 'lazy';
      if (!resolved.isHq) img.setAttribute('data-model', product.model);
      media.appendChild(img);
    } else {
      media.appendChild(el('p', 'no-image', 'No image'));
    }
    var body = el('div', 'card-body');
    body.appendChild(el('h3', 'card-title', product._name.replace(/^(?:Men|Women)'s\s+/, '')));
    body.appendChild(el('p', 'card-meta', product.gender));
    var colours = colourCountLabel(product);
    if (colours) body.appendChild(el('p', 'card-sub', colours));

    open.appendChild(media);
    open.appendChild(body);
    card.appendChild(open);

    if (img && !resolved.isHq) upgradeImage(img);
    return card;
  }

  function render() {
    var matches = filterProducts();

    els.grid.innerHTML = '';
    var fragment = document.createDocumentFragment();
    matches.forEach(function (product) {
      fragment.appendChild(buildCard(product));
    });
    els.grid.appendChild(fragment);

    els.grid.hidden = matches.length === 0;
    els.emptyState.hidden = matches.length !== 0;

    var total = state.products.length;
    els.resultCount.textContent = matches.length === total
      ? 'Showing all ' + total + ' models'
      : 'Showing ' + matches.length + ' of ' + total + ' models';

    renderFilters();
  }

  /* Product detail modal ------------------------------------------------- */

  function specRow(label, valueNode) {
    var row = el('div', 'spec-row');
    row.appendChild(el('dt', null, label));
    var dd = el('dd');
    if (typeof valueNode === 'string') {
      dd.textContent = valueNode;
    } else {
      dd.appendChild(valueNode);
    }
    row.appendChild(dd);
    return row;
  }

  function buildModalContent(product, onSelect) {
    var resolved = imagesFor(product);
    var frag = document.createDocumentFragment();

    /* Gallery */
    var gallery = el('div', 'modal-gallery');
    var figure = el('figure', 'modal-figure');
    var mainImg = null;
    var selectedImage = resolved.images[0] || '';
    if (resolved.images.length) {
      mainImg = document.createElement('img');
      setImage(mainImg, selectedImage, imageFallbacks(product));
      mainImg.alt = product._name;
      mainImg.decoding = 'async';
      figure.appendChild(mainImg);
    } else {
      figure.appendChild(el('p', 'no-image', 'No image'));
    }
    gallery.appendChild(figure);
    var mediaItems = resolved.images.map(function (src) { return { type: 'image', src: src }; })
      .concat((product.videos || []).map(function (src) { return { type: 'video', src: src }; }));
    var mediaStatus = el('p', 'gallery-status', mediaItems.length ? 'Image 1 of ' + mediaItems.length : '');
    mediaStatus.setAttribute('role', 'status');
    var videoPlayer = null, videoControls = null, videoPlay = null, videoMute = null;
    var videoVolume = null, videoVolumeHelp = null, activeVideoSrc = '';

    function updateVideoControls() {
      if (!videoPlayer) return;
      var playing = !videoPlayer.paused && !videoPlayer.ended;
      videoPlay.textContent = playing ? 'Pause' : 'Play';
      videoPlay.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
      var silent = videoPlayer.muted || videoPlayer.volume === 0;
      videoMute.textContent = silent ? 'Unmute' : 'Mute';
      videoMute.setAttribute('aria-label', silent ? 'Unmute video' : 'Mute video');
      videoVolume.value = Math.round(videoPlayer.volume * 100);
    }

    function prepareVideo(src) {
      if (videoPlayer.getAttribute('src') === src) return;
      videoPlayer.preload = 'metadata';
      videoPlayer.src = src;
    }

    function playVideo() {
      if (!activeVideoSrc) return;
      if (videoPlayer.error) {
        videoPlayer.removeAttribute('src');
        videoPlayer.load();
      }
      prepareVideo(activeVideoSrc);
      videoPlayer.preload = 'auto';
      if (videoPlayer.ended) videoPlayer.currentTime = 0;
      mediaStatus.textContent = 'Loading video…';
      var attempt = videoPlayer.play();
      updateVideoControls();
      if (attempt && attempt.catch) attempt.catch(function (error) {
        if (error.name !== 'AbortError' && !videoPlayer.hidden) {
          mediaStatus.textContent = videoPlayer.error
            ? 'Video unavailable. Select Play to retry.'
            : 'Playback blocked. Select Play to try again.';
          updateVideoControls();
        }
      });
    }

    if ((product.videos || []).length) {
      videoPlayer = el('video'); videoPlayer.controls = false; videoPlayer.playsInline = true;
      videoPlayer.preload = 'none'; videoPlayer.hidden = true; videoPlayer.poster = selectedImage;
      videoPlayer.muted = false;
      videoPlayer.setAttribute('aria-label', 'Product video: ' + product._name);
      figure.appendChild(videoPlayer);
      videoPlayer.addEventListener('play', function () { document.querySelectorAll('.hero video').forEach(function (video) { video.pause(); }); });
      videoPlayer.addEventListener('playing', function () {
        if (videoPlayer.hidden) return;
        videoPlayer.classList.add('is-ready');
        if (mainImg) mainImg.hidden = true;
        mediaStatus.textContent = 'Video playing';
        updateVideoControls();
      });
      videoPlayer.addEventListener('waiting', function () {
        if (!videoPlayer.hidden) mediaStatus.textContent = 'Buffering video…';
      });
      videoPlayer.addEventListener('pause', updateVideoControls);
      videoPlayer.addEventListener('ended', updateVideoControls);
      videoPlayer.addEventListener('volumechange', updateVideoControls);
      videoPlayer.addEventListener('error', function () {
        if (videoPlayer.hidden) return;
        videoPlayer.classList.remove('is-ready');
        if (mainImg) mainImg.hidden = false;
        mediaStatus.textContent = 'Video unavailable. Select Play to retry.';
        updateVideoControls();
      });

      videoControls = el('div', 'product-video-controls'); videoControls.hidden = true;
      videoPlay = el('button', 'product-video-action', 'Play'); videoPlay.type = 'button';
      videoPlay.setAttribute('aria-label', 'Play video');
      videoPlay.addEventListener('click', function () {
        if (videoPlayer.paused || videoPlayer.ended) playVideo();
        else { videoPlayer.pause(); mediaStatus.textContent = 'Video paused'; }
      });
      videoMute = el('button', 'product-video-action', 'Mute'); videoMute.type = 'button';
      videoMute.setAttribute('aria-label', 'Mute video');
      videoMute.addEventListener('click', function () {
        videoPlayer.muted = !videoPlayer.muted;
        updateVideoControls();
      });
      var volumeLabel = el('label', 'product-video-volume');
      volumeLabel.appendChild(el('span', null, 'Volume'));
      videoVolume = document.createElement('input');
      videoVolume.type = 'range'; videoVolume.min = '0'; videoVolume.max = '100';
      videoVolume.step = '5'; videoVolume.value = '100';
      videoVolume.setAttribute('aria-label', 'Volume');
      volumeLabel.appendChild(videoVolume);
      videoVolume.addEventListener('input', function () {
        var requested = Number(videoVolume.value) / 100;
        var unsupported = false;
        try { videoPlayer.volume = requested; } catch (_) { unsupported = true; }
        videoPlayer.muted = requested === 0;
        if (unsupported || Math.abs(videoPlayer.volume - requested) > 0.02) {
          videoVolume.disabled = true;
          videoVolumeHelp.hidden = false;
        }
        updateVideoControls();
      });
      videoVolumeHelp = el('p', 'product-video-volume-help', 'Use your device volume buttons.');
      videoVolumeHelp.hidden = true;
      videoControls.appendChild(videoPlay);
      videoControls.appendChild(videoMute);
      videoControls.appendChild(volumeLabel);
      videoControls.appendChild(videoVolumeHelp);
      gallery.appendChild(videoControls);
    }
    if (mediaItems.length > 1) {
      var thumbs = el('div', 'modal-thumbs'); thumbs.setAttribute('aria-label', 'Product media');
      mediaItems.forEach(function (item, i) {
        var thumb = el('button', 'modal-thumb');
        thumb.type = 'button';
        thumb.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        thumb.setAttribute('aria-label', 'Show ' + item.type + ' ' + (i + 1) + ' of ' + mediaItems.length);
        if (item.type === 'image') {
          var timg = document.createElement('img');
          setImage(timg, item.src, imageFallbacks(product)); timg.alt = ''; timg.loading = 'lazy';
          thumb.appendChild(timg);
        } else {
          thumb.classList.add('video-thumb'); thumb.appendChild(el('span', '', '▷'));
          thumb.appendChild(el('small', '', 'Video'));
          function primeVideo() {
            var connection = navigator.connection;
            if (videoPlayer.hidden && !(connection && (connection.saveData || /2g/.test(connection.effectiveType)))) {
              prepareVideo(item.src);
            }
          }
          thumb.addEventListener('pointerenter', primeVideo);
          thumb.addEventListener('focus', primeVideo);
        }
        thumb.addEventListener('click', function () {
          if (videoPlayer && (item.type !== 'video' || activeVideoSrc !== item.src)) videoPlayer.pause();
          if (item.type === 'video') {
            var changed = activeVideoSrc !== item.src;
            activeVideoSrc = item.src;
            videoPlayer.hidden = false;
            videoControls.hidden = false;
            if (changed) {
              videoPlayer.classList.remove('is-ready');
              videoPlayer.poster = selectedImage;
              if (mainImg) mainImg.hidden = false;
            }
            if (changed || videoPlayer.paused) playVideo();
          } else {
            activeVideoSrc = '';
            if (videoPlayer) {
              videoPlayer.hidden = true;
              videoControls.hidden = true;
              videoPlayer.classList.remove('is-ready');
              if (videoPlayer.getAttribute('src')) {
                videoPlayer.removeAttribute('src');
                videoPlayer.preload = 'none';
                videoPlayer.load();
              }
            }
            if (mainImg) {
              mainImg.hidden = false;
              selectedImage = item.src;
              setImage(mainImg, item.src, imageFallbacks(product));
            }
            mediaStatus.textContent = 'Image ' + (i + 1) + ' of ' + mediaItems.length;
          }
          updateOrderLink();
          thumbs.querySelectorAll('.modal-thumb').forEach(function (node) {
            node.setAttribute('aria-pressed', node === thumb ? 'true' : 'false');
          });
        });
        thumbs.appendChild(thumb);
      });
      gallery.appendChild(thumbs);
    }
    gallery.appendChild(mediaStatus);
    frag.appendChild(gallery);

    /* Article codes are kept in the outgoing WhatsApp order only. */
    var info = el('div', 'modal-info');
    var heading = el('h2', null, product._name);
    heading.id = 'modalTitle';
    info.appendChild(heading);
    info.appendChild(favouriteButton(product));
    info.appendChild(el('p', 'modal-price', window.LuofuCommerce.formatPrice(product) || 'Price on request'));
    info.appendChild(el('p', 'modal-desc', product._description));

    var productSpecs = el('dl', 'spec-list');
    if (product.brand) productSpecs.appendChild(specRow('Brand', product.brand));
    if (product.gender) productSpecs.appendChild(specRow('Range', product.gender));
    if (product._category) productSpecs.appendChild(specRow('Category', product._category));
    if (product.material) productSpecs.appendChild(specRow('Material', product.material));
    var specs = el('dl', 'spec-list');

    /* Colourways double as a selector: the chosen one is named in the
       WhatsApp enquiry, so nobody has to type it out. */
    var chosenColour = window.LuofuCart.defaultColour(product);
    var waButton = null;
    var required = window.LuofuCart.needsOptions(product);
    var sizeSelect = null, purchaseControl = null;
    var selectionNotice = required ? el('p', 'selection-notice', 'Choose your colour and EU size before ordering.') : null;
    if (selectionNotice) selectionNotice.setAttribute('role', 'status');

    function currentSelection() {
      return { colour: chosenColour, size: sizeSelect ? sizeSelect.value : '', image: selectedImage };
    }
    /* Keep the order link honest: it only becomes a wa.me link once a colour is set. */
    function updateOrderLink() {
      if (purchaseControl) purchaseControl.syncQuantity();
      if (!waButton) return;
      var choice = currentSelection();
      if (window.LuofuCart.validSelection(product, choice)) {
        waButton.href = whatsappLink(product, choice.colour, choice.size);
        if (selectionNotice) selectionNotice.textContent = 'Selected: ' + titleCase(choice.colour || '') + (choice.size ? ' · EU ' + choice.size : '');
      } else {
        waButton.href = productUrl(product);
        if (selectionNotice) selectionNotice.textContent = 'Choose your colour and EU size before ordering.';
      }
    }
    function checkedSelection(silent) {
      var choice = currentSelection();
      if (!window.LuofuCart.validSelection(product, choice)) {
        if (silent) return null;
        var missingColour = window.LuofuCart.needsColour(product) && !choice.colour;
        selectionNotice.textContent = missingColour ? 'Please choose a colour first.' : 'Please choose an EU size first.';
        var chip = missingColour ? info.querySelector('.color-chip') : sizeSelect;
        if (chip) chip.focus();
        return null;
      }
      return choice;
    }

    if (product.colors && product.colors.length) {
      var colors = el('div', 'color-list');
      product.colors.forEach(function (color) {
        var chip = el('button', 'color-chip', titleCase(color));
        chip.type = 'button';
        chip.setAttribute('aria-pressed', chosenColour === color ? 'true' : 'false');
        chip.addEventListener('click', function () {
          /* With a single colourway there is nothing to toggle off. */
          chosenColour = (chosenColour === color && product.colors.length > 1) ? null : color;
          colors.querySelectorAll('.color-chip').forEach(function (node) {
            node.setAttribute('aria-pressed', node === chip && chosenColour ? 'true' : 'false');
          });
          updateOrderLink();
        });
        colors.appendChild(chip);
      });
      var colourRow = specRow('Choose colour', colors); colourRow.className += ' option-row';
      specs.appendChild(colourRow);
    }

    var sizes = window.LuofuCart.sizesFor(product);
    if (sizes.length) {
      sizeSelect = el('select', 'product-size'); sizeSelect.setAttribute('aria-label', 'EU size'); sizeSelect.required = true;
      var placeholder = el('option', '', 'Choose EU size'); placeholder.value = ''; sizeSelect.appendChild(placeholder);
      sizes.forEach(function (size) { var option = el('option', '', 'EU ' + size); option.value = size; sizeSelect.appendChild(option); });
      sizeSelect.value = ''; sizeSelect.addEventListener('change', updateOrderLink);
      var sizeRow = specRow(Array.isArray(product.sizes) ? 'Choose your size' : 'Requested EU size', sizeSelect); sizeRow.className += ' option-row';
      var sizeGuide = buildSizeGuide(product);
      if (sizeGuide) sizeRow.querySelector('dd').appendChild(sizeGuide);
      specs.appendChild(sizeRow);
      if (!Array.isArray(product.sizes)) sizeRow.querySelector('dd').appendChild(el('p', 'size-availability', 'Size availability is confirmed on WhatsApp.'));
    }
    info.appendChild(specs);
    if (product.notes && product.notes.length) info.appendChild(el('p', 'stock-notes', product.notes.join(' · ')));

    waButton = buildWhatsappButton(product, 'modal-wa', 'Order on WhatsApp');
    if (required && product.availability !== 'unavailable' && product.stock !== 0) {
      waButton.addEventListener('click', function (event) { if (!checkedSelection()) event.preventDefault(); });
      info.appendChild(selectionNotice);
    }
    updateOrderLink();
    purchaseControl = buildCartButton(product, 'modal-add', required ? checkedSelection : currentSelection, onSelect);
    info.appendChild(purchaseControl);
    info.appendChild(waButton);
    if (product.availability === 'unavailable' || product.stock === 0) {
      waButton.textContent = 'Ask about availability'; waButton.href = whatsappLink(product);
    }
    if (productSpecs.children.length) {
      var details = el('details', 'product-specifications');
      details.appendChild(el('summary', '', 'Product details'));
      details.appendChild(productSpecs); info.appendChild(details);
    }

    var back = el('button', 'modal-back', 'Back to catalogue');
    back.type = 'button';
    back.setAttribute('data-close-modal', '');
    info.appendChild(back);

    if (!resolved.isHq) {
      info.appendChild(el('p', 'hq-flag', 'Reference image from the source catalogue — high-resolution photography pending.'));
    }

    frag.appendChild(info);
    return frag;
  }

  if (window.addEventListener) window.addEventListener('luofu:cart', function () {
    document.querySelectorAll('.purchase-control').forEach(function (control) { control.syncQuantity(); });
  });

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, summary, video[controls], [tabindex]:not([tabindex="-1"])';
  function setBackgroundInert(inert) {
    document.querySelectorAll('body > header, body > main, body > footer, .analytics-consent').forEach(function (node) { node.inert = inert; });
  }

  function releaseProductVideo() {
    els.modalBody.querySelectorAll('.modal-figure video').forEach(function (video) {
      video.hidden = true;
      video.pause();
      video.removeAttribute('src');
      video.preload = 'none';
      video.load();
    });
  }

  function openModal(model, onSelect) {
    var product = state.products.filter(function (p) { return (p.id || p.model) === model || p.model === model || p.sourceModel === model; })[0];
    if (!product) { closeModal(true); announce('This product could not be found. Browse the current collection.'); return; }
    if (window.LuofuAnalytics) window.LuofuAnalytics.track('product_view', product.id || product.model);

    if (els.modal.hidden) {
      state.lastFocused = document.activeElement;
      state.returnHash = location.hash.indexOf('#product/') === 0 ? '#catalogue' : location.hash;
    }
    var hash = '#product/' + encodeURIComponent(model);
    if (location.hash !== hash) history.pushState(null, '', hash);
    document.title = product._name + ' | LUOFU Qatar';
    setMenu(false);
    document.querySelectorAll('.hero video').forEach(function (video) { video.pause(); });
    releaseProductVideo();
    els.modalBody.innerHTML = '';
    els.modalBody.appendChild(buildModalContent(product, onSelect));
    els.modal.hidden = false;
    els.modalBody.scrollTop = 0;
    document.body.classList.add('modal-open');
    setBackgroundInert(true);

    var closeBtn = els.modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(keepHash) {
    if (els.modal.hidden) return;
    els.modal.hidden = true;
    releaseProductVideo();
    els.modalBody.innerHTML = '';
    document.body.classList.remove('modal-open');
    setBackgroundInert(false);
    if (!keepHash && location.hash.indexOf('#product/') === 0) history.replaceState(null, '', state.returnHash || location.pathname);
    document.title = els.favourites.hidden ? 'LUOFU Qatar | Footwear Catalogue' : 'Favourites | LUOFU Qatar';
    if (state.lastFocused && document.contains(state.lastFocused)) {
      state.lastFocused.focus();
    }
    state.lastFocused = null;
  }

  function openLinkedProduct() {
    if (location.hash.indexOf('#product/') !== 0) { closeModal(true); return; }
    try { openModal(decodeURIComponent(location.hash.slice(9))); } catch (error) { /* Ignore malformed links. */ }
  }
  function routeView() {
    var favouritesView = location.hash === '#favourites';
    // A product opened from favourites keeps that page behind the dialog.
    if (location.hash.indexOf('#product/') !== 0) {
      document.querySelectorAll('[data-home-section]').forEach(function (section) { section.hidden = favouritesView; });
      els.favourites.hidden = !favouritesView;
      if (favouritesView) {
        renderFavourites();
        document.getElementById('favouritesTitle').focus({ preventScroll: true });
        window.scrollTo(0, 0);
      }
      document.title = favouritesView ? 'Favourites | LUOFU Qatar' : 'LUOFU Qatar | Footwear Catalogue';
    }
    openLinkedProduct();
    window.dispatchEvent(new Event('luofu:view'));
  }

  function trapFocus(event) {
    if (els.modal.hidden || event.key !== 'Tab') return;

    var nodes = Array.prototype.filter.call(
      els.modal.querySelectorAll(FOCUSABLE),
      function (node) { return node.offsetParent !== null; }
    );
    if (!nodes.length) return;

    var first = nodes[0];
    var last = nodes[nodes.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* Mobile menu ---------------------------------------------------------- */

  function setMenu(open) {
    els.mobileMenu.hidden = !open;
    els.menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    els.menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    document.querySelector('main').inert = open || !els.modal.hidden;
    document.querySelector('footer').inert = open || !els.modal.hidden;
    if (open) els.mobileMenu.querySelector('a').focus();
  }

  /* Events --------------------------------------------------------------- */

  function applyNavFilter(value) {
    state.gender = value;
    state.type = 'all';
    state.query = '';
    els.search.value = '';
    els.searchClear.hidden = true;
    render();
  }

  function bindEvents() {
    window.addEventListener('hashchange', routeView);
    window.addEventListener('luofu:favourites', syncFavourites);
    document.getElementById('headerFavouritesToggle').addEventListener('click', function () { location.hash = 'favourites'; setMenu(false); });
    document.getElementById('favouritesRetry').addEventListener('click', window.LuofuFavourites.retry);
    document.querySelectorAll('[data-open-cart]').forEach(function (button) {
      button.addEventListener('click', function () { setMenu(false); document.getElementById('cartToggle').click(); });
    });
    document.querySelectorAll('[data-open-account]').forEach(function (button) {
      button.addEventListener('click', function () { setMenu(false); window.LuofuAccount.open(); });
    });
    window.addEventListener('luofu:before-account', function () { closeModal(); setMenu(false); });
    document.getElementById('retryCatalogue').addEventListener('click', function () { location.reload(); });
    els.search.addEventListener('input', function () {
      state.query = els.search.value;
      els.searchClear.hidden = !state.query;
      render();
    });

    els.searchClear.addEventListener('click', function () {
      els.search.value = '';
      state.query = '';
      els.searchClear.hidden = true;
      els.search.focus();
      render();
    });

    els.genderFilters.addEventListener('click', function (event) {
      var chip = event.target.closest('.chip');
      if (!chip) return;
      state.gender = chip.dataset.value;
      render();
    });

    els.typeFilters.addEventListener('click', function (event) {
      var chip = event.target.closest('.chip');
      if (!chip) return;
      state.type = chip.dataset.value;
      render();
    });

    els.resetFilters.addEventListener('click', function () {
      state.gender = 'all';
      state.type = 'all';
      state.query = '';
      els.search.value = '';
      els.searchClear.hidden = true;
      render();
      els.search.focus();
    });

    document.querySelector('main').addEventListener('click', function (event) {
      var open = event.target.closest('.card-main');
      if (open) openModal(open.dataset.productId);
    });

    els.modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-close-modal]')) closeModal();
    });

    els.menuToggle.addEventListener('click', function () {
      setMenu(els.mobileMenu.hidden);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        if (!els.modal.hidden) {
          closeModal();
        } else if (!els.mobileMenu.hidden) {
          setMenu(false);
          els.menuToggle.focus();
        }
      }
      if (event.key === 'Tab' && !els.mobileMenu.hidden) {
        var menuNodes = [els.menuToggle].concat(Array.from(els.mobileMenu.querySelectorAll('a,button')));
        var first = menuNodes[0], last = menuNodes[menuNodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      trapFocus(event);
    });

    document.querySelectorAll('[data-nav-filter]').forEach(function (link) {
      link.addEventListener('click', function () {
        applyNavFilter(link.getAttribute('data-nav-filter'));
        if (!els.favourites.hidden) {
          document.querySelectorAll('[data-home-section]').forEach(function (section) { section.hidden = false; });
          els.favourites.hidden = true;
        }
        if (!els.mobileMenu.hidden) setMenu(false);
      });
    });

    els.mobileMenu.querySelectorAll('a:not([data-nav-filter])').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024 && !els.mobileMenu.hidden) setMenu(false);
    });
  }

  /* Category banner numbers ---------------------------------------------- */

  function renderStats() {
    document.querySelectorAll('[data-count]').forEach(function (node) {
      var gender = node.getAttribute('data-count');
      node.textContent = String(state.products.filter(function (product) {
        return matchesGender(product, gender);
      }).length);
    });
  }

  /* Boot ----------------------------------------------------------------- */

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error(url + ' → HTTP ' + response.status);
      return response.json();
    });
  }

  /**
   * Which high-quality images exist. The manifest written by
   * sync_high_quality_images.py is authoritative; without it we read the
   * directory listing that static dev servers produce, so images dropped
   * straight into assets/products-hq/ are still picked up. If neither is
   * available every product simply keeps its fallback image.
   */
  function loadHqIndex() {
    return fetchJson(CONFIG.HQ_MANIFEST_URL)
      .then(function (data) {
        hqImages = (data && data.images) || {};
      })
      .catch(function () {
        return fetch(CONFIG.HQ_DIR, { cache: 'no-cache' })
          .then(function (response) {
            if (!response.ok) throw new Error('no directory listing');
            return response.text();
          })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var names = Array.prototype.map.call(doc.querySelectorAll('a[href]'), function (link) {
              var href = link.getAttribute('href').split('?')[0].split('#')[0];
              return decodeURIComponent(href.replace(/\/$/, '').split('/').pop());
            });
            hqImages = groupHqFiles(names);
          })
          .catch(function () {
            hqImages = {};
          });
      })
      .then(function () {
        return fetchJson(CONFIG.CLOUDINARY_MANIFEST_URL)
          .then(function (data) {
            Object.keys((data && data.images) || {}).forEach(function (model) {
              var urls = data.images[model];
              if (Array.isArray(urls) && urls.length && urls.every(function (url) {
                return typeof url === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(url);
              }) && !hqImages[model]) hqImages[model] = urls;
            });
          })
          .catch(function () { /* Existing catalogue images remain available. */ });
      });
  }

  function showLoadError() {
    document.getElementById('catalogueLoading').hidden = true;
    els.grid.setAttribute('aria-busy', 'false');
    els.loadError.hidden = false;
    els.grid.hidden = true;
    els.emptyState.hidden = true;
    els.resultCount.textContent = '';
    document.querySelector('.toolbar').hidden = true;
  }

  function init() {
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    bindEvents();

    Promise.all([
      loadHqIndex(),
      fetchJson(CONFIG.COPY_URL).then(function (copy) { productCopy = (copy && copy.products) || {}; }).catch(function () { productCopy = {}; }),
      fetchJson(CONFIG.PRODUCTS_URL),
      fetchJson(CONFIG.ADDITIONAL_PRODUCTS_URL),
      fetchJson('data/catalogue-updates.json').catch(function () { return { products: {} }; })
    ]).then(function (loaded) {
        /* Category banner images are static markup, so upgrade them as soon
           as we know which HQ files exist. */
        document.querySelectorAll('.category-media img[data-model]').forEach(upgradeImage);
        if (!Array.isArray(loaded[2]) || !Array.isArray(loaded[3])) throw new Error('Product catalogues must be arrays');
        loaded[2].forEach(function (product) { referenceImages[product.model] = product.images || (product.image ? [product.image] : []); });
        if (!loaded[3].length) throw new Error('The current collection is empty');
        // Retain the original catalogue for image fallbacks only.
        return loaded[3].map(function (product) {
          var update = (loaded[4].products || {})[product.sourceModel || product.model];
          var current = Object.assign({}, product, update || {});
          // Only the supplied selling-price list authorizes a displayed price.
          current.sellingPrice = update && Number.isFinite(update.sellingPrice) ? update.sellingPrice : null;
          return current;
        });
      })
      .then(function (products) {
        if (!Array.isArray(products)) throw new Error('products.json is not an array');

        var ids = {};
        state.products = products.map(function (product) {
          var id = product && (product.id || product.model);
          if (!id || typeof product.model !== 'string' || ids[id]) throw new Error('Missing or duplicate product identifier');
          ids[id] = true;
          product.gender = window.LuofuSizes.genderFor(product) || product.gender || '';
          product.colors = Array.isArray(product.colors) ? product.colors.filter(function (colour) { return typeof colour === 'string'; }) : [];
          product._name = resolveName(product);
          product._category = resolveCategory(product);
          product._description = resolveDescription(product);
          product._search = searchIndex(product);
          return product;
        });
        window.LuofuFavourites.init(state.products);
        window.LuofuCart.init({
          products: state.products,
          imagesFor: imagesFor,
          setImage: setImage,
          imageFallbacks: imageFallbacks,
          productUrl: productUrl,
          whatsappNumber: CONFIG.WHATSAPP_NUMBER,
          choose: function (product, onSelect) { openModal(product.id || product.model, onSelect); },
          beforeOpen: function () { closeModal(); setMenu(false); }
        });
        renderStats();
        render();
        document.getElementById('catalogueLoading').hidden = true;
        els.grid.setAttribute('aria-busy', 'false');
        var seenBest = {};
        state.products.forEach(function(product){
          if(product.bestSeller && !seenBest[product.model]) {
            document.getElementById('bestSellerGrid').appendChild(buildCard(product));
            seenBest[product.model] = true;
          }
        });
        routeView();
      })
      .catch(function (error) {
        console.error('LUOFU catalogue:', error);
        showLoadError();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
