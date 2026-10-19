/* =========================================================
   Portfolio — Yudha Laurens
   Vanilla JS, tanpa build step. Dimuat dengan `defer`.
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };

  icons();

  /* ---------- Theme toggle ---------- */
  const themeBtn = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function syncThemeUI() {
    const light = root.classList.contains('light-theme');
    themeBtn.innerHTML = `<i data-lucide="${light ? 'moon' : 'sun'}" aria-hidden="true"></i>`;
    themeBtn.setAttribute('aria-label', light ? 'Ganti ke tema gelap' : 'Ganti ke tema terang');
    if (themeMeta) themeMeta.setAttribute('content', light ? '#f5f5f7' : '#070e17');
    icons();
  }
  themeBtn.addEventListener('click', () => {
    root.classList.toggle('light-theme');
    localStorage.setItem('theme', root.classList.contains('light-theme') ? 'light' : 'dark');
    syncThemeUI();
  });
  syncThemeUI();

  /* ---------- Mobile menu ---------- */
  const nav = document.querySelector('.pill-nav');
  const menuBtn = document.getElementById('menu-toggle');

  function setMenu(open) {
    nav.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    menuBtn.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}" aria-hidden="true"></i>`;
    icons();
  }
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('nav-open')));
  nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('nav-open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => {
    // composedPath() dihitung saat event dikirim, jadi tetap benar walau ikon di dalam tombol sudah diganti.
    if (nav.classList.contains('nav-open') && !e.composedPath().includes(nav)) setMenu(false);
  });

  /* ---------- Active nav link (IntersectionObserver, bukan scroll listener) ---------- */
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => sectionObserver.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');
      // Setelah animasi masuk selesai, buang delay supaya hover/transition terasa instan.
      setTimeout(() => el.classList.add('done'), reducedMotion ? 0 : 1400);
      obs.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => revealObserver.observe(el));

  /* ---------- Counter ---------- */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseInt(el.dataset.count, 10);
    const pad = parseInt(el.dataset.pad || '0', 10);
    const suffix = el.dataset.suffix || '';
    const fmt = (n) => (pad ? String(n).padStart(pad, '0') : String(n)) + suffix;
    if (reducedMotion) { el.textContent = fmt(end); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 900;
      (function step(now) {
        const t = clamp((now - start) / dur, 0, 1);
        el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      })(start);
    }, { threshold: 0.6 });
    io.observe(el);
  });

  /* ---------- 3D Tilt & Cursor Spotlight on Cards ---------- */
  function initTiltSpotlight() {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach((card) => {
      let raf = 0;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        if (!raf) {
          raf = requestAnimationFrame(() => {
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rotX = clamp(((y - cy) / cy) * -6, -6, 6);
            const rotY = clamp(((x - cx) / cx) * 6, -6, 6);
            card.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-4px)`;
            raf = 0;
          });
        }
      });
      card.addEventListener('mouseleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        card.style.transform = '';
      });
    });
  }
  initTiltSpotlight();

  /* ---------- Project Category Filters ---------- */
  function initProjectFilters() {
    const filterBtns = document.querySelectorAll('.proj-filter-btn');
    const projectCards = document.querySelectorAll('.project-card, .proj-small-card');
    if (!filterBtns.length || !projectCards.length) return;

    let currentFilter = 'all';

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        // Jika mengklik kategori yang sudah aktif, kembali ke All Projects
        currentFilter = (currentFilter === filter && filter !== 'all') ? 'all' : filter;
        filterBtns.forEach((b) => b.classList.toggle('active', b.dataset.filter === currentFilter));

        projectCards.forEach((card, idx) => {
          const categories = (card.dataset.category || '').split(',');
          const match = currentFilter === 'all' || categories.includes(currentFilter);
          if (match) {
            card.classList.remove('is-hidden');
            if (!reducedMotion && card.animate) {
              card.animate(
                [
                  { opacity: 0, transform: 'scale(0.96) translateY(12px)' },
                  { opacity: 1, transform: 'none' }
                ],
                { duration: 380, delay: idx * 40, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' }
              );
            }
          } else {
            card.classList.add('is-hidden');
          }
        });
      });
    });
  }
  initProjectFilters();

  /* ---------- Interactive Skill Pills to Project Link ---------- */
  function initSkillPillLinking() {
    const skillPills = document.querySelectorAll('.skill-pill');
    const projectCards = document.querySelectorAll('.project-card, .proj-small-card');
    let highlightTimer = null;

    skillPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const tech = pill.dataset.tech;
        if (!tech) return;

        skillPills.forEach((p) => p.classList.toggle('active-pill', p === pill));

        // Find matching project cards
        let firstMatch = null;
        projectCards.forEach((card) => {
          const cardTechs = (card.dataset.tech || '').split(',');
          const isMatch = cardTechs.some((t) => t.trim().toLowerCase() === tech.toLowerCase());
          card.classList.toggle('highlight-target', isMatch);
          if (isMatch && !firstMatch && !card.classList.contains('is-hidden')) {
            firstMatch = card;
          }
        });

        // Smooth scroll to first matching project if clicked
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => {
          projectCards.forEach((c) => c.classList.remove('highlight-target'));
          skillPills.forEach((p) => p.classList.remove('active-pill'));
        }, 3200);
      });
    });
  }
  initSkillPillLinking();

  /* =========================================================
     TIMELINE ROLLER
     Terinspirasi dari timeline "roller" 3D: tumpukan kartu pada
     perspektif, digerakkan satu nilai `pos` (float) oleh spring.
     Bisa di-drag/swipe, scroll wheel, tombol, dan keyboard.
     ========================================================= */
  (function initTimeline() {
    const host = document.getElementById('timeline');
    const source = document.getElementById('timeline-source');
    if (!host || !source) return;

    const TYPES = {
      education: { label: 'Education', icon: 'graduation-cap' },
      work: { label: 'Experience', icon: 'briefcase' },
    };
    const items = [...source.querySelectorAll('li')].map((li) => ({
      type: TYPES[li.dataset.type] ? li.dataset.type : 'work',
      current: li.dataset.current === 'true',
      year: li.querySelector('.tl-year').textContent.trim(),
      role: li.querySelector('.tl-role').textContent.trim(),
      org: li.querySelector('.tl-org').textContent.trim(),
      desc: li.querySelector('.tl-desc').innerHTML,
    }));
    if (!items.length) return;
    const LAST = items.length - 1;

    host.insertAdjacentHTML('beforeend', `
      <div class="tl-layout">
        <div class="tl-detail">
          <div class="tl-count" aria-hidden="true"><span><b data-tl-cur>01</b> / ${String(items.length).padStart(2, '0')}</span></div>
          <div class="tl-detail-inner" data-tl-detail aria-live="polite"></div>
          <p class="tl-hint"><i data-lucide="mouse-pointer-click" aria-hidden="true"></i><span data-tl-hint></span></p>
        </div>
        <div class="tl-stage">
          <button type="button" class="tl-nav-btn" data-tl-prev aria-label="Item sebelumnya"><i data-lucide="chevron-up" aria-hidden="true"></i></button>
          <div class="tl-roller" data-tl-roller tabindex="0" role="group" aria-label="Pilih item timeline dengan tombol panah, drag, atau scroll"></div>
          <button type="button" class="tl-nav-btn" data-tl-next aria-label="Item berikutnya"><i data-lucide="chevron-down" aria-hidden="true"></i></button>
        </div>
      </div>`);

    const $ = (sel) => host.querySelector(sel);
    const roller = $('[data-tl-roller]');
    const stage = $('.tl-stage');
    const detail = $('[data-tl-detail]');
    const curEl = $('[data-tl-cur]');
    const hintEl = $('[data-tl-hint]');
    const prevBtn = $('[data-tl-prev]');
    const nextBtn = $('[data-tl-next]');

    const cards = items.map((it, i) => {
      const t = TYPES[it.type];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tl-card';
      b.dataset.index = i;
      b.tabIndex = -1;
      b.setAttribute('aria-label', `${it.role}, ${it.org}, ${it.year}`);
      b.innerHTML = `
        <span class="tl-card-icon"><i data-lucide="${t.icon}" aria-hidden="true"></i></span>
        <span class="tl-card-text">
          <span class="tl-card-year">${esc(it.year)}</span>
          <span class="tl-card-role">${esc(it.role)}</span>
          <span class="tl-card-org">${esc(it.org)}</span>
        </span>`;
      // Klik dari AT/keyboard (detail === 0). Klik mouse/touch ditangani via pointerup.
      b.addEventListener('click', (e) => { if (e.detail === 0) select(i); });
      roller.appendChild(b);
      return b;
    });

    /* --- State --- */
    const mq = window.matchMedia('(max-width: 900px)');
    let horizontal = mq.matches;
    let selected = 0;
    let pos = reducedMotion ? 0 : -1.1; // posisi awal untuk animasi intro
    let vel = 0;
    let target = 0;
    let raf = 0;
    let last = 0;

    /* --- Render: rumus transform tiap kartu dari jarak ke `pos` --- */
    function render() {
      for (let i = 0; i < cards.length; i++) {
        const d = i - pos;
        const a = Math.abs(d);
        let x = 0, y = 0, rx = 0, ry = 0, scale, opacity;
        if (horizontal) {
          x = d * 230;
          scale = Math.max(0.68, 1 - a * 0.1);
          opacity = a <= 1 ? Math.max(0, 1 - a * 0.3) : Math.max(0, 0.7 - (a - 1) * 0.3);
          ry = clamp(d * -12, -18, 18);
        } else {
          y = d * 118;
          scale = Math.max(0.68, 1 - a * 0.14);
          opacity = a <= 1 ? Math.max(0, 1 - a * 0.45) : Math.max(0, 0.55 - (a - 1) * 0.3);
          rx = clamp(d * -9, -25, 25);
        }
        const c = cards[i];
        c.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        c.style.opacity = opacity.toFixed(3);
        c.style.zIndex = Math.round(30 - Math.min(25, a * 10));
        c.style.visibility = opacity < 0.01 ? 'hidden' : 'visible';
      }
    }

    /* --- Spring (stiffness 130, damping 24, mass 1.25) --- */
    function tick(now) {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      const k = 130, c = 24, m = 1.25, h = 1 / 240;
      let t = dt;
      while (t > 0) {
        const s = Math.min(h, t);
        vel += ((-k * (pos - target) - c * vel) / m) * s;
        pos += vel * s;
        t -= s;
      }
      if (Math.abs(vel) < 0.0008 && Math.abs(pos - target) < 0.0008) {
        pos = target; vel = 0; raf = 0; render();
        return;
      }
      render();
      raf = requestAnimationFrame(tick);
    }
    function animateTo(t) {
      target = t;
      if (reducedMotion) { pos = t; vel = 0; render(); return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }

    /* --- UI sync --- */
    function updateActive() {
      cards.forEach((c, i) => {
        const on = i === selected;
        c.classList.toggle('is-active', on);
        if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
        c.style.pointerEvents = Math.abs(i - selected) <= 2 ? 'auto' : 'none';
      });
      prevBtn.disabled = selected === 0;
      nextBtn.disabled = selected === LAST;
      curEl.textContent = String(selected + 1).padStart(2, '0');
    }
    function updateDetail(animate = true) {
      const it = items[selected];
      const t = TYPES[it.type];
      detail.innerHTML = `
        <span class="tl-type${it.current ? ' is-current' : ''}"><i data-lucide="${t.icon}" aria-hidden="true"></i>${t.label}${it.current ? ' · Sekarang' : ''}</span>
        <h3 class="tl-detail-role">${esc(it.role)}</h3>
        <div class="tl-meta">
          <span><i data-lucide="building-2" aria-hidden="true"></i>${esc(it.org)}</span>
          <span class="tl-sep" aria-hidden="true"></span>
          <span><i data-lucide="calendar" aria-hidden="true"></i>${esc(it.year)}</span>
        </div>
        <p class="tl-detail-desc">${it.desc}</p>`;
      icons();
      if (animate && !reducedMotion && detail.animate) {
        detail.animate(
          [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
          { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      }
    }
    function setSelected(i) {
      if (i === selected) return;
      selected = i;
      updateActive();
      updateDetail();
    }
    function select(i) {
      const n = clamp(i, 0, LAST);
      setSelected(n);
      animateTo(n);
    }
    function setHint() {
      hintEl.textContent = horizontal ? 'Geser kartu untuk menjelajah' : 'Drag, scroll, atau gunakan tombol panah';
    }

    /* --- Drag / swipe --- */
    let dragging = false, moved = false, startCoord = 0, startPos = 0;

    roller.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true; moved = false;
      startCoord = horizontal ? e.clientX : e.clientY;
      startPos = pos;
      vel = 0;
    });
    roller.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const delta = (horizontal ? e.clientX : e.clientY) - startCoord;
      if (!moved && Math.abs(delta) > 4) {
        moved = true;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        roller.classList.add('dragging');
        try { roller.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      }
      if (!moved) return;
      const v = startPos - delta / (horizontal ? 230 : 118);
      // efek karet di ujung (rubber band)
      pos = v < 0 ? v * 0.25 : v > LAST ? LAST + (v - LAST) * 0.25 : v;
      render();
      setSelected(clamp(Math.round(pos), 0, LAST));
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      roller.classList.remove('dragging');
      try { roller.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
      if (moved) {
        select(clamp(Math.round(pos), 0, LAST));
      } else if (e.type === 'pointerup') {
        // tap/klik tanpa drag → pilih kartu yang diklik
        const card = e.target.closest && e.target.closest('.tl-card');
        if (card) select(parseInt(card.dataset.index, 10));
      }
    }
    roller.addEventListener('pointerup', endDrag);
    roller.addEventListener('pointercancel', endDrag);

    /* --- Wheel (desktop). Hanya "menahan" scroll halaman bila masih ada item untuk dipindah. --- */
    let lastWheel = 0;
    stage.addEventListener('wheel', (e) => {
      if (horizontal || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const next = selected + (e.deltaY > 0 ? 1 : -1);
      if (next < 0 || next > LAST) return; // di ujung → biarkan halaman scroll
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel < 220 || Math.abs(e.deltaY) < 10) return;
      lastWheel = now;
      select(next);
    }, { passive: false });

    /* --- Tombol & keyboard --- */
    prevBtn.addEventListener('click', () => select(selected - 1));
    nextBtn.addEventListener('click', () => select(selected + 1));
    roller.addEventListener('keydown', (e) => {
      const map = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
      if (e.key in map) { e.preventDefault(); select(selected + map[e.key]); }
      else if (e.key === 'Home') { e.preventDefault(); select(0); }
      else if (e.key === 'End') { e.preventDefault(); select(LAST); }
    });

    /* --- Responsif: vertikal (desktop) ↔ horizontal (mobile) --- */
    mq.addEventListener('change', () => { horizontal = mq.matches; setHint(); render(); });

    /* --- Init --- */
    setHint();
    updateActive();
    updateDetail(false);
    render();
    icons();

    // Animasi intro: roller "berputar" masuk saat section terlihat.
    if (reducedMotion) {
      pos = 0; render();
    } else {
      const introObserver = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        introObserver.disconnect();
        animateTo(0);
      }, { threshold: 0.35 });
      introObserver.observe(host);
    }
  })();

  /* ---------- Contact form ---------- */
  // Tanpa backend: form membuka aplikasi email pengguna dengan pesan yang sudah terisi (mailto).
  // Ingin kirim langsung dari website? Daftar di formspree.io, lalu ganti bagian "mailto" di bawah dengan:
  //   fetch('https://formspree.io/f/XXXXXXXX', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
  const CONTACT_EMAIL = 'yudhaanantha@gmail.com';
  const form = document.getElementById('contact-form');
  const statusEl = document.getElementById('form-status');

  if (form) {
    const fields = [...form.querySelectorAll('input, textarea')];
    fields.forEach((f) => f.addEventListener('input', () => f.classList.remove('invalid')));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstInvalid = null;
      fields.forEach((f) => {
        const bad = !f.value.trim() || !f.checkValidity();
        f.classList.toggle('invalid', bad);
        if (bad && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        statusEl.textContent = 'Mohon lengkapi semua kolom dengan benar.';
        statusEl.className = 'form-note error';
        firstInvalid.focus();
        return;
      }
      const v = (id) => form.querySelector('#' + id).value.trim();
      const body = `${v('cf-message')}\n\n— ${v('cf-name')}\n${v('cf-email')}`;
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(v('cf-subject'))}&body=${encodeURIComponent(body)}`;
      statusEl.textContent = `Membuka aplikasi email Anda… Jika tidak terbuka, kirim langsung ke ${CONTACT_EMAIL}.`;
      statusEl.className = 'form-note success';
    });
  }

  /* ---------- Custom cursor (hanya perangkat dengan mouse) ---------- */
  if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-outline';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(dot, ring);

    let mx = 0, my = 0, rx = 0, ry = 0, cursorRaf = 0;
    function loop() {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      // berhenti saat sudah menempel → tidak membakar CPU saat idle
      cursorRaf = Math.hypot(mx - rx, my - ry) > 0.3 ? requestAnimationFrame(loop) : 0;
    }
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!dot.classList.contains('ready')) { rx = mx; ry = my; dot.classList.add('ready'); ring.classList.add('ready'); }
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      if (!cursorRaf) cursorRaf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('mouseleave', () => { dot.classList.remove('ready'); ring.classList.remove('ready'); });

    // Event delegation → elemen dinamis (kartu roller) ikut kena.
    const HOVER_SEL = 'a, button, input, textarea, .card, .tl-card';
    document.addEventListener('mouseover', (e) => { if (e.target.closest(HOVER_SEL)) ring.classList.add('hover'); });
    document.addEventListener('mouseout', (e) => { if (e.target.closest(HOVER_SEL)) ring.classList.remove('hover'); });
  }
})();
