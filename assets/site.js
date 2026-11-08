(function(){
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  /* ——— home intro: the name resolves from OCR-style noise as the images load ——— */
  var name = document.getElementById('name');
  if (name) {
    var lines = Array.prototype.slice.call(name.querySelectorAll('.line'));
    var counter = document.getElementById('count');
    var finish = function(){
      lines.forEach(function(l){ l.textContent = l.dataset.text; });
      doc.classList.remove('loading');
      try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
      requestAnimationFrame(function(){ name.classList.add('marked'); });
    };
    if (!doc.classList.contains('loading')) { name.classList.add('instant'); finish(); }
    else {
      var noise = 'Nn1lI|!hH4AarR7TtJmMpP0O8B:;.,_-';
      var slots = [];
      lines.forEach(function(l){
        var t = l.dataset.text; l.textContent = '';
        for (var i = 0; i < t.length; i++) {
          var s = document.createElement('span'); s.className = 'ch noise'; s.textContent = t[i];
          l.appendChild(s); slots.push({ el: s, ch: t[i] });
        }
      });
      var srcs = Array.prototype.map.call(document.querySelectorAll('.rows img'), function(i){ return i.getAttribute('src'); });
      var loaded = 0;
      srcs.forEach(function(src){ var im = new Image(); im.onload = im.onerror = function(){ loaded++; }; im.src = src; });
      var start = performance.now(), MIN = 1300, MAX = 3200, shown = 0, done = false;
      (function tick(now){
        if (done) return;
        var el = now - start;
        var target = Math.min(srcs.length ? loaded / srcs.length : 1, el / MIN);
        if (el > MAX) target = 1;
        shown += (target * 100 - shown) * 0.12;
        if (target === 1 && shown > 99.4) shown = 100;
        counter.textContent = Math.round(shown);
        var resolved = Math.floor(shown / 100 * slots.length);
        slots.forEach(function(s, i){
          if (i < resolved) { if (s.el.classList.contains('noise')) { s.el.classList.remove('noise'); s.el.textContent = s.ch; } }
          else if (Math.random() < .35) { s.el.textContent = noise[(Math.random() * noise.length) | 0]; }
        });
        if (shown >= 100) { done = true; setTimeout(finish, 120); return; }
        requestAnimationFrame(tick);
      })(start);
    }
  }

  /* ——— smooth scroll ——— */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = a.getAttribute('href'); var target = id === '#top' ? 0 : document.querySelector(id);
        if (target === null) return;
        e.preventDefault(); lenis.scrollTo(target, { offset: id === '#top' ? 0 : -60 });
        if (id !== '#top') history.replaceState(null, '', id);
      });
    });
  }

  /* ——— pointer: a marker dot that opens over images ——— */
  var c = document.querySelector('.cursor');
  if (c && fine && !reduce) {
    var label = c.querySelector('span');
    doc.classList.add('has-cursor');
    var x = -500, y = -500, cx = -500, cy = -500;
    window.addEventListener('pointermove', function(e){ x = e.clientX; y = e.clientY; c.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', function(){ c.classList.remove('on'); });
    document.addEventListener('pointerover', function(e){
      var t = e.target.closest('.shot,.row-media');
      if (t) label.textContent = t.classList.contains('row-media') ? 'View' : 'Open';
      c.classList.toggle('open', !!t);
    });
    (function loop(){
      cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
      c.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ——— lightbox, with a shared-element transition where supported ——— */
  var dlg = document.getElementById('lightbox');
  if (dlg) {
    var big = document.getElementById('lightbox-img'), from = null;
    var vt = function(fn){ if (document.startViewTransition && !reduce) document.startViewTransition(fn); else fn(); };
    var closeBox = function(){
      vt(function(){ big.style.viewTransitionName = ''; dlg.close(); if (from) from.style.viewTransitionName = 'shot'; });
      setTimeout(function(){ if (from) from.style.viewTransitionName = ''; }, 500);
    };
    document.querySelectorAll('.shot').forEach(function(btn){
      btn.addEventListener('click', function(){
        var img = btn.querySelector('img'); from = img;
        img.style.viewTransitionName = 'shot';
        vt(function(){
          img.style.viewTransitionName = '';
          big.src = img.currentSrc || img.src; big.alt = img.alt; big.style.viewTransitionName = 'shot';
          dlg.showModal(); if (lenis) lenis.stop();
        });
      });
    });
    dlg.addEventListener('click', function(e){ if (e.target === dlg) closeBox(); });
    dlg.addEventListener('cancel', function(e){ e.preventDefault(); closeBox(); });
    dlg.querySelector('form').addEventListener('submit', function(e){ e.preventDefault(); closeBox(); });
    dlg.addEventListener('close', function(){ if (lenis) lenis.start(); if (from) from.closest('.shot').focus({ preventScroll: true }); });
  }
})();
