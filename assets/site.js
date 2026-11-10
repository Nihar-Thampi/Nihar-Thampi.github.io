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


  /* ——— hero: before → after, one real input from each project ——— */
  var flow = document.getElementById('flow');
  if (flow) {
    var STEPS = [{"tab": "FairShare", "src": "receipt.jpg · OCR", "raw": "EMBER & OAK GRILL\nTBL 12        GUESTS 4\n2 PANEER TIKKA       640.00\n1 BUTTER CHKN        485.00\n3 GARLIC NAAN        2l0.00\n2 MANGO LASSI        360.0O\n  ...\nCGST 2.5%             76.63\nSGST 2.5%             76.63\nTOTAL            Rs 3218.26", "model": "gpt-4o-mini", "file": "extract.json", "check": "Items add up to the printed total", "data": [["vendor", "Ember & Oak Grill"], ["line_items", 7], ["tax_lines", ["CGST", "SGST"]], ["total", 3218.26]]}, {"tab": "SA Tax Bot", "src": "question + Income Tax Act", "raw": "> can i deduct trade expenses??\n\n11. General deductions allowed in\ndetermination of taxable income.—\nFor the purpose of determining the\ntaxable income derived by any person\n... there shall be allowed as\ndeductions from the income of such\nperson so derived—\n(a) expenditure and losses actually\nincurred in the production of the\nincome, provided such expenditure", "model": "qwen2.5-7b-instruct", "file": "answer.json", "check": "Every point is matched to a passage of the Act", "data": [["question", "Can I deduct trade expenses?"], ["section", "11(a)"], ["lines", "1894–1896"], ["gazette_page", 59], ["unsupported_points", 0]]}, {"tab": "YT Analyzer", "src": "comments · YouTube Data API", "raw": "@rk_builds   this saved me hours ngl\n@m.ira      audio is SO quiet?? cant hear\n@devnull    bro just read the docs lol\n@ana.k      12:40 is wrong, flag changed\n@throwaway  first\n@lena_codes ok but why not use a venv\n@p.sharma   finally someone explains it\n@kxz        mic peaking again...", "model": "siebert + mistral-7b", "file": "overview.json", "check": "Chat answers come only from retrieved comments", "data": [["positive", 0.434], ["negative", 0.564], ["chat_index", "faiss"]]}, {"tab": "Gleaner", "src": "shop page · HTML", "raw": "<div class=\"grid js-plp\" data-v=\"3\">\n <article class=\"product-card\">\n  <a href=\"/p/trail-runner-2\">\n   <h3>Trail Runner 2</h3>\n  </a>\n  <div class=\"price\">\n   <s>₹4,999</s>\n   <span class=\"price-now\">₹3,499</span>\n  </div>\n  <span class=\"badge\">In stock</span>", "model": "qwen2.5-14b · ollama", "file": "suggest.json", "check": "Selectors tested on the live page first", "data": [["item_selector", ".product-card"], ["price", ".price .price-now"], ["items", 12], ["fill_rate", 1.0]]}, {"tab": "SolarOps", "src": "technician notes", "raw": "site 14 - inv2 down on arrival.\nfan seized, swapped w spare.\nreset breaker, inv back up ~11:40\nstring 3 voltage low?? chk\nconnectors nxt visit.\ncleaned filters. cust informed\n- RK", "model": "qwen2.5-14b · ollama", "file": "report.json", "check": "Nothing is saved until a person approves it", "data": [["summary", "Seized cooling fan replaced; inverter back online"], ["work_performed", 3], ["findings", 2], ["status", "draft"]]}];
    var tabs = Array.prototype.slice.call(flow.querySelectorAll('.flow-tab'));
    var panel = flow.querySelector('.flow-panel');
    var srcEl = flow.querySelector('.flow-src'), rawEl = flow.querySelector('.flow-raw'), modelEl = flow.querySelector('.flow-model');
    var fileEl = flow.querySelector('.flow-file'), codeEl = flow.querySelector('.flow-json code'), checkEl = flow.querySelector('.flow-check');
    var pauseBtn = flow.querySelector('.flow-pause');
    var current = 0, paused = reduce, visible = true, timer = null, run = 0;

    var esc = function(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var val = function(v){
      if (Array.isArray(v)) return '<span class="p">[</span>' + v.map(val).join('<span class="p">, </span>') + '<span class="p">]</span>';
      if (typeof v === 'number') return '<span class="n">' + (v % 1 ? v : v.toFixed(v === 1 ? 1 : 0)) + '</span>';
      return '"' + esc(v) + '"';
    };
    var json = function(s){
      return '<span class="p">{</span>\n' + s.data.map(function(kv, j){
        return '  <span class="k">"' + kv[0] + '"</span><span class="p">: </span>' + val(kv[1]) + (j < s.data.length - 1 ? '<span class="p">,</span>' : '');
      }).join('\n') + '\n<span class="p">}</span>';
    };
    // now = true (a click): the output shows straight away. now = false (auto cycle): the input is read first.
    var show = function(i, now){
      var token = ++run, s = STEPS[i];
      current = i;
      tabs.forEach(function(t, j){ t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', tabs[i].id);
      srcEl.textContent = s.src; rawEl.textContent = s.raw; modelEl.textContent = s.model;
      fileEl.textContent = s.file; codeEl.innerHTML = json(s); checkEl.textContent = s.check;
      if (reduce) return;
      panel.classList.remove('read', 'done'); void panel.offsetWidth; panel.classList.add('read');
      if (now) panel.classList.add('done');
      else setTimeout(function(){ if (token === run) panel.classList.add('done'); }, 900);
    };
    var schedule = function(){
      clearTimeout(timer);
      if (paused) return;
      timer = setTimeout(function(){
        if (!paused && visible && !document.hidden) show((current + 1) % STEPS.length, false);
        schedule();
      }, 4800);
    };
    var setPaused = function(p){
      paused = p; pauseBtn.textContent = p ? 'Play' : 'Pause'; pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false'); schedule();
    };
    tabs.forEach(function(t, j){
      t.addEventListener('click', function(){ setPaused(true); show(j, true); });
      t.addEventListener('keydown', function(e){
        var k = e.key, n = tabs.length;
        var to = k === 'ArrowRight' ? (j + 1) % n : k === 'ArrowLeft' ? (j - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1;
        if (to < 0) return;
        e.preventDefault(); tabs[to].focus(); setPaused(true); show(to, true);
      });
    });
    pauseBtn.addEventListener('click', function(){ setPaused(!paused); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(flow);
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
