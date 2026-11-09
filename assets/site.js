(function(){
  /* ——— clean URLs: show /projects/x instead of /projects/x.html, and / instead of /index.html ——— */
  if (/^https?:$/.test(location.protocol) && /\.html$/.test(location.pathname)) {
    var clean = location.pathname.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
    history.replaceState(history.state, '', clean + location.search + location.hash);
  }

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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


  /* ——— hero pipeline: one real input from each project, and what comes out ——— */
  var flow = document.getElementById('flow');
  if (flow) {
    var STEPS = [
      { model: 'gpt-4o-mini', file: 'fairshare / extract.json', check: 'Items add up to the printed total',
        data: [['vendor', 'Ember & Oak Grill'], ['line_items', 7], ['tax_lines', ['CGST', 'SGST']], ['total', 3218.26]] },
      { model: 'qwen2.5-7b-instruct', file: 'sa-tax-bot / answer.json', check: 'Every point is matched to a passage of the Act',
        data: [['question', 'Can I deduct trade expenses?'], ['section', '11(a)'], ['lines', '1894–1896'], ['gazette_page', 59], ['unsupported_points', 0]] },
      { model: 'siebert + mistral-7b', file: 'yt-analyzer / overview.json', check: 'Chat answers come only from retrieved comments',
        data: [['comments', 840], ['positive', 0.434], ['negative', 0.564], ['chat_index', 'faiss']] },
      { model: 'qwen2.5-14b · ollama', file: 'gleaner / suggest.json', check: 'Selectors tested on the live page first',
        data: [['item_selector', '.product-card'], ['price', '.price .price-now'], ['items', 12], ['fill_rate', 1.0]] },
      { model: 'qwen2.5-14b · ollama', file: 'solarops / report.json', check: 'Nothing is saved until a person approves it',
        data: [['summary', 'Seized cooling fan replaced; inverter back online'], ['work_performed', 3], ['findings', 2], ['status', 'draft']] }
    ];
    var chips = Array.prototype.slice.call(flow.querySelectorAll('.chip'));
    var svg = flow.querySelector('.flow-wires'), node = flow.querySelector('.flow-node');
    var modelEl = flow.querySelector('.node-model'), out = flow.querySelector('.flow-out');
    var fileEl = flow.querySelector('.flow-file'), codeEl = flow.querySelector('.flow-json code'), checkEl = flow.querySelector('.flow-check');
    var pauseBtn = flow.querySelector('.flow-pause');
    var NS = 'http://www.w3.org/2000/svg', paths = [], outPath = null, dot = null;
    var current = 0, paused = reduce, visible = true, timer = null, busy = false;

    var esc = function(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var val = function(v){
      if (Array.isArray(v)) return '<span class="p">[</span>' + v.map(val).join('<span class="p">, </span>') + '<span class="p">]</span>';
      if (typeof v === 'number') return '<span class="n">' + (v % 1 ? v : v.toFixed(v === 1 ? 1 : 0)) + '</span>';
      return '"' + esc(v) + '"';
    };
    var render = function(i, animate){
      var s = STEPS[i];
      modelEl.textContent = s.model; fileEl.textContent = s.file; checkEl.textContent = s.check;
      codeEl.innerHTML = '<span class="p">{</span>\n' + s.data.map(function(kv, j){
        return '  <span class="k">"' + kv[0] + '"</span><span class="p">: </span>' + val(kv[1]) + (j < s.data.length - 1 ? '<span class="p">,</span>' : '');
      }).join('\n') + '\n<span class="p">}</span>';
      if (animate) { out.classList.remove('swap'); void out.offsetWidth; out.classList.add('swap'); }
    };
    var mark = function(i){
      chips.forEach(function(c, j){ c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      paths.forEach(function(p, j){ p.classList.toggle('on', j === i); });
    };
    var draw = function(){
      var f = flow.getBoundingClientRect(), n = node.getBoundingClientRect(), o = out.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + f.width + ' ' + f.height);
      svg.innerHTML = ''; paths = [];
      var nx = n.left + n.width / 2 - f.left, ny = n.top - f.top;
      chips.forEach(function(c){
        var r = c.getBoundingClientRect(), x = r.left + r.width / 2 - f.left, y = r.bottom - f.top, mid = (ny - y) / 2;
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', 'M' + x + ' ' + y + ' C' + x + ' ' + (y + mid) + ' ' + nx + ' ' + (ny - mid) + ' ' + nx + ' ' + ny);
        svg.appendChild(p); paths.push(p);
      });
      outPath = document.createElementNS(NS, 'path');
      outPath.setAttribute('d', 'M' + nx + ' ' + (n.bottom - f.top) + ' L' + nx + ' ' + (o.top - f.top));
      outPath.classList.add('on'); svg.appendChild(outPath);
      dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '4'); dot.style.opacity = '0'; svg.appendChild(dot);
      mark(current);
    };
    // Each run gets a token; starting a new one (a click) cancels whatever is still animating.
    var run = 0;
    var travel = function(path, ms, token, done){
      if (!path || !dot) { done(); return; }
      var len = path.getTotalLength(), t0 = performance.now();
      dot.style.opacity = '1';
      (function step(now){
        if (token !== run) return;
        var k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var pt = path.getPointAtLength(len * e);
        dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
        if (k < 1) requestAnimationFrame(step); else { dot.style.opacity = '0'; done(); }
      })(t0);
    };
    var hit = function(){ node.classList.remove('hit'); void node.offsetWidth; node.classList.add('hit'); };
    // now = true (a click): the answer shows at once and the pulse only decorates it.
    // now = false (the auto cycle): the pulse carries the input through before the answer appears.
    var go = function(i, now){
      var token = ++run;
      current = i; mark(i);
      if (dot) dot.style.opacity = '0';
      if (reduce || !paths[i]) { render(i, false); busy = false; return; }
      if (now) {
        render(i, true); hit(); busy = false;
        travel(paths[i], 450, token, function(){});
        return;
      }
      busy = true;
      travel(paths[i], 750, token, function(){
        hit(); modelEl.textContent = STEPS[i].model;
        travel(outPath, 380, token, function(){ render(i, true); busy = false; });
      });
    };
    var schedule = function(){
      clearTimeout(timer);
      if (paused) return;
      timer = setTimeout(function(){
        if (!paused && visible && !document.hidden && !busy) go((current + 1) % STEPS.length, false);
        schedule();
      }, 3800);
    };
    var setPaused = function(p){
      paused = p; pauseBtn.textContent = p ? 'Play' : 'Pause'; pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false'); schedule();
    };
    chips.forEach(function(c, j){ c.addEventListener('click', function(){ setPaused(true); go(j, true); }); });
    pauseBtn.addEventListener('click', function(){ setPaused(!paused); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(flow);
    if ('ResizeObserver' in window) new ResizeObserver(function(){ draw(); }).observe(flow);
    render(0, false); draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    setPaused(paused);
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

  /* ——— email links: copy the address as well as opening the mail app ——— */
  var status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
  document.body.appendChild(status);
  document.querySelectorAll('a[href^="mailto:"]').forEach(function(a){
    var timer;
    a.classList.add('copyable');
    a.addEventListener('click', function(){
      var addr = decodeURIComponent(a.getAttribute('href').slice(7).split('?')[0]);
      var done = function(){
        a.classList.remove('copied'); void a.offsetWidth; a.classList.add('copied');
        status.textContent = 'Email address copied';
        clearTimeout(timer);
        timer = setTimeout(function(){ a.classList.remove('copied'); status.textContent = ''; }, 1600);
      };
      var fallback = function(){
        var t = document.createElement('textarea');
        t.value = addr; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(t); t.select();
        try { if (document.execCommand('copy')) done(); } catch (e) {}
        t.remove();
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(addr).then(done, fallback);
      else fallback();
    });
  });
})();
