(function () {
  'use strict';
  var slides = Array.from(document.querySelectorAll('[data-slide]'));
  var track = document.querySelector('.hero-track');
  if (!track || !slides.length) return;
  var hero = document.querySelector('.hero'), visible = true;
  var header = document.querySelector('.site-header');
  var headerRow = document.querySelector('.header-inner');
  // Measure the navigation row, excluding the expandable mobile menu.
  // This also accommodates font loading, zoom and responsive header changes.
  function fitHeader() {
    var border = parseFloat(getComputedStyle(header).borderBottomWidth) || 0;
    document.documentElement.style.setProperty('--hero-header-height', (headerRow.getBoundingClientRect().height + border) + 'px');
  }
  if (header && headerRow) {
    fitHeader();
    if ('ResizeObserver' in window) new ResizeObserver(fitHeader).observe(headerRow);
    else window.addEventListener('resize', fitHeader);
  }
  var current = 0, timer = null;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function schedule() {
    clearTimeout(timer);
    if (!reduceMotion && canPlay() && current === 0) {
      timer = setTimeout(function () { show(1); }, 8000);
    }
  }
  function canPlay() { return visible && !hero.hidden && !document.hidden && !document.body.classList.contains('modal-open') && !document.querySelector('dialog[open]'); }
  function show(index){
    clearTimeout(timer);current=(index+slides.length)%slides.length;
    track.style.transform='translateX(-'+current*100+'%)';
    slides.forEach(function(slide,i){
      var active=i===current;slide.inert=!active;slide.setAttribute('aria-hidden',String(!active));
      var video=slide.querySelector('video');
      if(video){
        video.pause();
        video.controls = false;
        video.autoplay = active && canPlay() && !reduceMotion;
        if(active && canPlay() && !reduceMotion){
          if(!video.getAttribute('src')) video.src=video.dataset.src;
          video.muted = true;
          video.loop = true;
          video.play().then(function () { slide.classList.remove('hero-media-fallback'); }).catch(function(){ slide.classList.add('hero-media-fallback'); });
        } else if (!active && video.getAttribute('src')) {
          video.removeAttribute('src'); video.load();
        }
      }
    });
    schedule();
  }
  track.parentElement.addEventListener('keydown', function (event) {
    if (event.target !== track.parentElement || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  slides.forEach(function(slide){var video=slide.querySelector('video');if(video){
    video.addEventListener('error',function(){ slide.classList.add('hero-media-fallback'); });
    video.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  }});
  document.addEventListener('play',function(event){
    if(event.target.tagName==='VIDEO' && event.target.closest('.hero')) {
      document.querySelectorAll('.hero video').forEach(function(video){if(video!==event.target)video.pause();});
    }
  },true);
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){clearTimeout(timer);document.querySelectorAll('video').forEach(function(v){v.pause();});}
    else show(current);
  });
  window.addEventListener('luofu:view', function () { show(current); });
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    show(current);
  }, { threshold: .15 }).observe(hero);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (event) { reduceMotion = event.matches; show(current); });
  var pointerStart = null;
  // Native image dragging cancels pointer gestures on desktop browsers.
  track.addEventListener('dragstart', function (event) { event.preventDefault(); });
  track.addEventListener('pointerdown', function(event) {
    if (event.target.closest('a, button')) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointerup', function(event) {
    if (!pointerStart) return;
    var horizontal = event.clientX - pointerStart.x;
    var vertical = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(horizontal) < 42 || Math.abs(horizontal) <= Math.abs(vertical)) return;
    show(current + (horizontal < 0 ? 1 : -1));
  });
  track.addEventListener('pointercancel', function(){ pointerStart = null; });
  show(0);
})();
