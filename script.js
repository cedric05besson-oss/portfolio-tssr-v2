/* ============================================================
   PORTFOLIO — Cédric BESSON · script.js
   ------------------------------------------------------------
   Chaque module est une fonction autonome (IIFE) : on peut en
   supprimer un sans casser les autres.
     1. Thème clair / sombre (mémorisé dans le navigateur)
     2. Texte tournant du Hero (postes visés)
     3. Compteurs animés
     4. Apparition des blocs au défilement
     5. Barre de progression + lien du menu actif
     6. Fermeture du menu mobile au clic
     7. Filtre de la timeline Parcours
     8. Formulaire de contact (ouvre la messagerie)
     9. Année automatique du pied de page
    10. Effet « spotlight » sur les cartes
    11. Bandeau défilant des technologies
    12. Flèche de retour en haut (anneau de progression)
    13. Photo du bandeau en grand
    14. Menus du bandeau (Formspree, Traduire)
    15. Traduction (Google Traduction, chargée à la demande)
    16. Scène animée du hero (SVG isométrique : sites, serveurs, flux réseau)
    17. Outils .exe : captures, visionneuse plein écran, ajout de captures en mode Éditer
    18. Étiquettes du hero cliquables → labo correspondant
   ============================================================ */
'use strict';

/* ---------- 1. THÈME CLAIR / SOMBRE ---------- */
(function () {
  const root  = document.documentElement;
  const btn   = document.getElementById('themeToggle');
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (!btn) return;

  // localStorage peut être bloqué (navigation privée) : on protège chaque accès
  function load() { try { return localStorage.getItem('theme'); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem('theme', v); } catch (e) { /* ignoré */ } }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    const dark = theme === 'dark';
    icon.className    = dark ? 'fas fa-sun' : 'fas fa-moon';
    label.textContent = dark ? 'Mode clair' : 'Mode sombre';
  }

  // Mode sombre par défaut ; le choix du visiteur (bouton) est mémorisé ensuite
  apply(load() || 'dark');

  btn.addEventListener('click', function () {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    save(next);
  });
})();

/* ---------- 2. TEXTE TOURNANT DU HERO ----------
   Modifier la liste ROLES pour changer les postes affichés. */
(function () {
  const ROLES = [
    'Administrateur Systèmes & Réseaux',
    'Technicien Support N2',
    'Exploitation & Supervision',
    'Assistant RSSI'
  ];
  const el = document.getElementById('typed-role');
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let role = 0, char = ROLES[0].length, deleting = true;

  function tick() {
    const word = ROLES[role];
    char += deleting ? -1 : 1;
    el.textContent = word.slice(0, char);

    let delay = deleting ? 35 : 70;
    if (!deleting && char === word.length) { delay = 2200; deleting = true; }   // pause, mot complet
    else if (deleting && char === 0) {                                          // mot effacé → suivant
      deleting = false;
      role = (role + 1) % ROLES.length;
      delay = 400;
    }
    setTimeout(tick, delay);
  }
  setTimeout(tick, 2500); // le premier poste reste affiché quelques secondes
})();

/* ---------- 3. COMPTEURS ANIMÉS ----------
   Tout élément .counter avec data-target="N" compte de 0 à N. */
(function () {
  const counters = document.querySelectorAll('.counter');
  if (!('IntersectionObserver' in window)) return; // valeur finale déjà écrite dans le HTML

  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const start = performance.now();
      const duration = 1400;

      (function step(now) {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); // easing « ease-out »
        if (p < 1) requestAnimationFrame(step);
      })(start);

      obs.unobserve(el);
    });
  }, { threshold: 0.6 });

  counters.forEach(function (c) { obs.observe(c); });
})();

/* ---------- 4. APPARITION AU DÉFILEMENT ---------- */
(function () {
  const elems = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    elems.forEach(function (el) { el.classList.add('visible'); });
    return;
  }
  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  elems.forEach(function (el) { obs.observe(el); });
})();

/* ---------- 5. PROGRESSION DE LECTURE + LIEN ACTIF ---------- */
(function () {
  const bar      = document.getElementById('read-progress');
  const sections = document.querySelectorAll('main section[id]');
  const links    = document.querySelectorAll('#navContent .nav-link');

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';

    let current = '';
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= 140) current = s.id; }); // 140 px : hauteur du bandeau
    links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + current); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---------- 6. FERMETURE DU MENU MOBILE ---------- */
(function () {
  const collapse = document.getElementById('navContent');
  if (!collapse || typeof bootstrap === 'undefined') return;
  collapse.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      const bs = bootstrap.Collapse.getInstance(collapse);
      if (bs) bs.hide();
    });
  });
})();

/* ---------- 7. FILTRE DE LA TIMELINE ----------
   Un élément peut appartenir à plusieurs catégories : data-cat="formation it" */
(function () {
  const buttons = document.querySelectorAll('.filter-btn');
  const items   = document.querySelectorAll('.timeline-item');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const filter = btn.dataset.filter;

      buttons.forEach(function (b) {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      items.forEach(function (item) {
        const cats = (item.dataset.cat || '').split(' ');
        const show = filter === 'all' || cats.indexOf(filter) !== -1;
        item.classList.toggle('is-hidden', !show);
        if (show) item.classList.add('visible'); // évite qu'un élément réaffiché reste invisible
      });
    });
  });
})();

/* ---------- 8. FORMULAIRE DE CONTACT ----------
   Envoi via Formspree (adresse dans l'attribut action du <form>).
   En cas d'échec (hors ligne, quota atteint…), on propose la messagerie du visiteur. */
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const EMAIL    = 'cedric05.besson@gmail.com';
  const feedback = document.getElementById('cf-feedback');
  const button   = form.querySelector('button[type="submit"]');

  function say(msg, color) {
    feedback.style.color = color;
    feedback.textContent = msg;
  }

  function mailtoFallback() {
    const name    = form.elements.name.value.trim();
    const company = form.elements.company.value.trim();
    const body    = form.elements.message.value.trim() +
                    '\n\n— ' + name + (company ? ' (' + company + ')' : '');
    return 'mailto:' + EMAIL +
      '?subject=' + encodeURIComponent(form.elements.subject.value.trim()) +
      '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Validation simple des champs obligatoires (+ format de l'e-mail)
    let ok = true;
    form.querySelectorAll('[required]').forEach(function (field) {
      const bad = !field.value.trim() || (field.type === 'email' && !field.checkValidity());
      field.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) {
      say('⚠ Merci de remplir correctement les champs obligatoires (*).', 'var(--clr-danger)');
      return;
    }

    button.disabled = true;
    say('Envoi en cours…', 'var(--clr-text-soft)');

    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        say('✓ Merci, votre message a bien été envoyé. Je vous réponds rapidement.', 'var(--clr-success)');
      })
      .catch(function () {
        feedback.style.color = 'var(--clr-danger)';
        feedback.innerHTML = '⚠ L\'envoi n\'a pas abouti. <a href="' + mailtoFallback() + '">Écrire depuis votre messagerie</a>.';
      })
      .finally(function () { button.disabled = false; });
  });

  // Retire l'état d'erreur dès que l'utilisateur corrige un champ
  form.addEventListener('input', function (e) { e.target.classList.remove('is-invalid'); });
})();

/* ---------- 9. ANNÉE DU PIED DE PAGE ---------- */
(function () {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/* ---------- 10. EFFET « SPOTLIGHT » ----------
   Un halo suit la souris sur les cartes (style : .spot::after dans style.css). */
(function () {
  const cards = document.querySelectorAll('.glass-card, .skill-block, .project-card');
  cards.forEach(function (card) {
    card.classList.add('spot');
    card.addEventListener('pointermove', function (e) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
})();

/* ---------- 11. BANDEAU DÉFILANT ----------
   On double la liste pour que l'animation CSS (translateX -50 %) boucle sans à-coup. */
(function () {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  Array.prototype.slice.call(track.children).forEach(function (li) {
    const clone = li.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true'); // les lecteurs d'écran ne lisent la liste qu'une fois
    track.appendChild(clone);
  });
})();

/* ---------- 12. FLÈCHE DE RETOUR EN HAUT ----------
   Apparaît après 400 px de défilement ; l'anneau se remplit
   au fil de la lecture (0 % en haut → 100 % en bas de page). */
(function () {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  const ring = btn.querySelector('.btt-ring');
  const LEN  = 2 * Math.PI * 24;                 // périmètre du cercle (r = 24)
  ring.style.strokeDasharray = LEN;

  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    ring.style.strokeDashoffset = LEN * (1 - pct);
    btn.classList.toggle('show', window.scrollY > 400);
  }
  btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ---------- 13. PHOTO DU BANDEAU EN GRAND ----------
   Survol : aperçu agrandi (CSS). Clic : photo plein écran. */
(function () {
  const btn = document.getElementById('photoZoomBtn');
  const box = document.getElementById('photoLightbox');
  if (!btn || !box) return;

  function open()  { box.hidden = false; document.body.classList.add('no-scroll'); box.querySelector('.photo-lightbox-close').focus(); }
  function close() { box.hidden = true;  document.body.classList.remove('no-scroll'); btn.focus(); }

  btn.addEventListener('click', open);
  box.addEventListener('click', function (e) { if (e.target !== box.querySelector('img')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
})();

/* ---------- 14. MENUS DU BANDEAU (Formspree, Traduire) ----------
   Un seul menu ouvert à la fois ; fermeture au clic extérieur ou Échap. */
const ToolMenus = (function () {
  const pairs = [];
  function closeAll(except) {
    pairs.forEach(function (p) {
      if (p.btn === except) return;
      p.menu.hidden = true;
      p.btn.setAttribute('aria-expanded', 'false');
    });
  }
  function register(btnId, menuId) {
    const btn = document.getElementById(btnId), menu = document.getElementById(menuId);
    if (!btn || !menu) return null;
    pairs.push({ btn: btn, menu: menu });
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const opening = menu.hidden;
      closeAll(btn);
      menu.hidden = !opening;
      btn.setAttribute('aria-expanded', String(opening));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-menu]')) closeAll();
    });
    return { btn: btn, menu: menu };
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.tool-menu-wrap')) closeAll();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  register('fsBtn', 'fsMenu');
  return { register: register, closeAll: closeAll };
})();

/* ---------- 15. TRADUCTION (Google Traduction) ----------
   Le script Google n'est chargé QUE si un visiteur choisit une langue
   (rien n'est envoyé à Google tant que la page reste en français).
   Le choix est gardé dans le cookie « googtrans » ; revenir au français
   efface ce cookie et recharge la page. Connexion Internet requise. */
(function () {
  const PAGE_LANG = 'fr';
  const LANGS = [
    { code: 'fr', name: 'Français' },  { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },   { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },  { code: 'pt', name: 'Português' },
    { code: 'nl', name: 'Nederlands' }
  ];
  const ui = ToolMenus.register('trBtn', 'trMenu');
  if (!ui) return;
  const codeEl = document.getElementById('trCode');

  // Nom propre : jamais traduit
  document.querySelectorAll('.brand-name, #hero-title').forEach(function (el) {
    el.classList.add('notranslate'); el.setAttribute('translate', 'no');
  });

  function cookieDomains() {
    const h = location.hostname;
    return ['', '; domain=' + h, '; domain=.' + h];
  }
  function setCookie(lang) {
    cookieDomains().forEach(function (d) { document.cookie = 'googtrans=/' + PAGE_LANG + '/' + lang + '; path=/' + d; });
  }
  function clearCookie() {
    cookieDomains().forEach(function (d) { document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d; });
  }
  function currentLang() {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/]*\/([^;]+)/);
    const l = m ? decodeURIComponent(m[1]) : PAGE_LANG;
    return LANGS.some(function (x) { return x.code === l; }) ? l : PAGE_LANG;
  }

  // Construction du menu des langues
  ui.menu.innerHTML = LANGS.map(function (l) {
    return '<li role="none"><button type="button" class="tool-menu-item" role="menuitemradio" data-lang="' + l.code +
      '" lang="' + l.code + '"><span class="tr-item-code">' + l.code.toUpperCase() + '</span>' + l.name +
      '<i class="fas fa-check tr-check" aria-hidden="true"></i></button></li>';
  }).join('');

  function refreshUi(lang) {
    codeEl.textContent = lang.toUpperCase();
    ui.menu.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-checked', b.dataset.lang === lang ? 'true' : 'false');
    });
  }

  function warn(msg) {
    const t = document.createElement('div');
    t.className = 'ed-toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  let loaded = false;
  function loadGoogle() {
    if (loaded) return;
    loaded = true;
    const holder = document.createElement('div');
    holder.id = 'gt-holder';
    holder.setAttribute('aria-hidden', 'true');
    document.body.appendChild(holder);
    window.gtInit = function () {
      // Google lit le cookie « googtrans » et traduit la page automatiquement
      new google.translate.TranslateElement({ pageLanguage: PAGE_LANG, autoDisplay: false }, 'gt-holder');
    };
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=gtInit';
    s.async = true;
    s.onerror = function () {
      loaded = false;
      clearCookie(); refreshUi(PAGE_LANG);
      warn('⚠ Traduction indisponible (connexion Internet requise)');
    };
    document.head.appendChild(s);
  }

  function choose(lang) {
    ToolMenus.closeAll();
    if (lang === currentLang()) return;
    if (lang === PAGE_LANG) { clearCookie(); location.reload(); return; }
    setCookie(lang);
    refreshUi(lang);
    const combo = document.querySelector('select.goog-te-combo');
    if (combo) { combo.value = lang; combo.dispatchEvent(new Event('change')); }
    else loadGoogle();
  }

  ui.menu.addEventListener('click', function (e) {
    const b = e.target.closest('[data-lang]');
    if (b) choose(b.dataset.lang);
  });

  // « Télécharger le CV (PDF) » : le fichier PDF est en français. Page traduite :
  // on ouvre le CV en ligne dans la même langue et on lance « Enregistrer en PDF ».
  document.querySelectorAll('[data-cv-download]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (currentLang() === PAGE_LANG) return;
      e.preventDefault();
      window.open('cv.html?print', '_blank');
    });
  });

  const start = currentLang();
  refreshUi(start);
  if (start !== PAGE_LANG) loadGoogle();
})();


/* ---------- 16. SCÈNE ANIMÉE DU HERO ----------
   Dessin original en SVG (vue isométrique) : trois sites reliés à un cœur de réseau,
   serveurs Windows protégés, paquets qui circulent sur les liens, écrans de supervision
   et radar. Couleurs = variables du thème (pétrole / bordeaux). */
(function () {
  const svg = document.getElementById('heroScene');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Projection isométrique : coordonnées « sol » (x, y) → pixels de l'écran */
  function iso(x, y, h) { return [300 + (x - y) * 28, 150 + (x + y) * 14 - (h || 0)]; }
  function pts(list) { return list.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (parent || svg).appendChild(n);
    return n;
  }

  /* Dégradés et halo */
  const defs = el('defs', {});
  defs.innerHTML =
    '<radialGradient id="hsBg" cx="50%" cy="45%" r="75%">' +
      '<stop offset="0" style="stop-color:#0f3640"/><stop offset="1" style="stop-color:#050f13"/></radialGradient>' +
    '<radialGradient id="hsHub" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0" style="stop-color:var(--clr-accent2);stop-opacity:.9"/>' +
      '<stop offset="1" style="stop-color:var(--clr-accent2);stop-opacity:0"/></radialGradient>' +
    '<filter id="hsGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

  el('rect', { x: 0, y: 0, width: 600, height: 600, fill: 'url(#hsBg)' });

  /* Quadrillage du sol */
  const grid = el('g', { class: 'hs-grid' });
  for (let i = -2; i <= 13; i++) {
    el('line', { x1: iso(i, -3)[0], y1: iso(i, -3)[1], x2: iso(i, 14)[0], y2: iso(i, 14)[1] }, grid);
    el('line', { x1: iso(-3, i)[0], y1: iso(-3, i)[1], x2: iso(14, i)[0], y2: iso(14, i)[1] }, grid);
  }

  /* Les trois sites (dalles au sol) */
  const SITES = [
    { x0: 0.4, x1: 4.0, y0: 0.4, y1: 4.0, cls: 'hs-site' },          // siège (haut)
    { x0: 6.2, x1: 9.8, y0: 0.8, y1: 4.2, cls: 'hs-site' },          // site droit
    { x0: 0.8, x1: 4.2, y0: 6.2, y1: 9.8, cls: 'hs-site hs-site-wine' } // site gauche
  ];
  SITES.forEach(function (s) {
    el('polygon', { class: s.cls, points: pts([iso(s.x0, s.y0), iso(s.x1, s.y0), iso(s.x1, s.y1), iso(s.x0, s.y1)]) });
  });

  /* Liens réseau : du serveur principal de chaque site vers le cœur (5,5) */
  const HUB = [5.2, 5.2];
  const LINKS = [
    { from: [2.2, 2.2], cls: 'hs-link',      dot: 'hs-dot-a', dur: 3.2 },
    { from: [8.0, 2.5], cls: 'hs-link',      dot: 'hs-dot-b', dur: 2.6 },
    { from: [2.5, 8.0], cls: 'hs-link hs-link-wine', dot: 'hs-dot-w', dur: 3.8 },
    { from: [2.2, 2.2], to: [8.0, 2.5], cls: 'hs-link hs-link-soft', dot: 'hs-dot-a', dur: 4.6, bend: -46 }
  ];
  const linkLayer = el('g', {});
  LINKS.forEach(function (l, i) {
    const a = iso(l.from[0], l.from[1]);
    const b = iso((l.to || HUB)[0], (l.to || HUB)[1]);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + (l.bend || 0);
    const d = 'M' + a[0] + ' ' + a[1] + ' Q' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1];
    el('path', { id: 'hsPath' + i, class: l.cls, d: d }, linkLayer);
    /* Petit tracé de « pouls » au milieu du lien */
    const px = (a[0] + 2 * mx + b[0]) / 4, py = (a[1] + 2 * my + b[1]) / 4;
    el('polyline', { class: 'hs-pulse ' + l.dot, points: pts([[px - 14, py], [px - 6, py], [px - 3, py - 8], [px + 1, py + 6], [px + 4, py - 3], [px + 6, py], [px + 14, py]]),
                     style: 'animation-delay:' + (-i * 0.7) + 's' }, linkLayer);
    /* Paquets qui circulent sur le lien */
    if (!calm) {
      [0, 0.5].forEach(function (offset) {
        const c = el('circle', { r: 3, class: 'hs-packet ' + l.dot, filter: 'url(#hsGlow)' }, linkLayer);
        const m = el('animateMotion', { dur: l.dur + 's', repeatCount: 'indefinite', begin: (-l.dur * offset) + 's',
                                        keyPoints: i % 2 ? '1;0' : '0;1', keyTimes: '0;1', calcMode: 'linear' }, c);
        el('mpath', { href: '#hsPath' + i }, m);
      });
    }
  });

  /* Cœur du réseau : halo + anneaux qui pulsent */
  const hub = iso(HUB[0], HUB[1]);
  el('ellipse', { cx: hub[0], cy: hub[1], rx: 34, ry: 17, fill: 'url(#hsHub)', opacity: .35 });
  [0, 1, 2].forEach(function (k) {
    el('ellipse', { class: 'hs-ring', cx: hub[0], cy: hub[1], rx: 22, ry: 11, style: 'animation-delay:' + (-k) + 's' });
  });
  el('circle', { cx: hub[0], cy: hub[1], r: 4.5, class: 'hs-hub', filter: 'url(#hsGlow)' });

  /* Boîtes 3D : baies (basses) et serveurs (hauts) */
  function box(x0, x1, y0, y1, h, opts) {
    opts = opts || {};
    const g = el('g', { class: 'hs-box' + (opts.cls ? ' ' + opts.cls : '') });
    const L = iso(x0, y1), B = iso(x1, y1), R = iso(x1, y0), T = iso(x0, y0);
    const up = function (p) { return [p[0], p[1] - h]; };
    el('polygon', { class: 'hs-face-l', points: pts([L, B, up(B), up(L)]) }, g);
    el('polygon', { class: 'hs-face-r', points: pts([B, R, up(R), up(B)]) }, g);
    el('polygon', { class: 'hs-face-t', points: pts([up(L), up(B), up(R), up(T)]) }, g);
    return { g: g, L: L, B: B, R: R, T: T, h: h };
  }

  function server(x, y, main) {
    const s = 0.46, h = main ? 50 : 38;
    const base = iso(x, y);
    /* Anneau au sol */
    el('ellipse', { class: 'hs-ring hs-ring-srv', cx: base[0], cy: base[1], rx: 34, ry: 17,
                    style: 'animation-delay:' + (-(x + y) % 3) + 's' });
    const b = box(x - s, x + s, y - s, y + s, h, { cls: 'hs-server' });
    /* Logo à 4 carreaux sur la face avant gauche */
    const ux = (b.B[0] - b.L[0]) / 22, uy = (b.B[1] - b.L[1]) / 22;
    const ox = b.L[0] + (b.B[0] - b.L[0]) * 0.3, oy = b.L[1] + (b.B[1] - b.L[1]) * 0.3 - h * 0.62;
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (q) {
      const x0 = ox + q[0] * 4.4 * ux, y0 = oy + q[0] * 4.4 * uy + q[1] * 4.6;
      el('polygon', { class: 'hs-logo', points: pts([[x0, y0], [x0 + 4 * ux, y0 + 4 * uy], [x0 + 4 * ux, y0 + 4 * uy + 4], [x0, y0 + 4]]) }, b.g);
    });
    /* Diodes sur la face droite */
    for (let k = 0; k < 3; k++) {
      const t = 0.25 + k * 0.22;
      const p = [b.B[0] + (b.R[0] - b.B[0]) * t, b.B[1] + (b.R[1] - b.B[1]) * t - 8];
      el('circle', { class: 'hs-led', cx: p[0], cy: p[1], r: 1.4, style: 'animation-delay:' + (-k * 0.6 - x) + 's' }, b.g);
    }
    /* Bouclier « vérifié » */
    if (main) {
      const top = iso(x, y, h + 18);
      const sh = el('g', { class: 'hs-shield' }, el('g', { transform: 'translate(' + top[0] + ' ' + top[1] + ')' }));
      el('path', { d: 'M0 -9 L8 -6 V0 C8 5 4 8 0 10 C-4 8 -8 5 -8 0 V-6 Z' }, sh);
      el('path', { class: 'hs-check', d: 'M-3.5 0.5 L-1 3 L4 -2.5' }, sh);
    }
  }

  /* Ordre de dessin : de l'arrière vers l'avant (x + y croissant) */
  const ITEMS = [
    { t: 'rack', x0: 0.6, x1: 3.8, y0: 0.6, y1: 1.0, h: 16 },
    { t: 'srv', x: 2.2, y: 2.2, main: true },
    { t: 'srv', x: 3.3, y: 2.0 },
    { t: 'rack', x0: 6.4, x1: 9.6, y0: 1.0, y1: 1.4, h: 16 },
    { t: 'srv', x: 1.6, y: 3.3 },
    { t: 'srv', x: 8.0, y: 2.5, main: true },
    { t: 'srv', x: 9.0, y: 3.4 },
    { t: 'rack', x0: 1.0, x1: 1.4, y0: 6.4, y1: 9.6, h: 16 },
    { t: 'srv', x: 2.5, y: 8.0, main: true },
    { t: 'srv', x: 3.5, y: 8.9 }
  ];
  ITEMS.sort(function (a, b) {
    const ka = a.t === 'srv' ? a.x + a.y : a.x1 + a.y1, kb = b.t === 'srv' ? b.x + b.y : b.x1 + b.y1;
    return ka - kb;
  }).forEach(function (it) {
    if (it.t === 'srv') server(it.x, it.y, it.main);
    else box(it.x0, it.x1, it.y0, it.y1, it.h, { cls: 'hs-rack' });
  });

  /* Écrans de supervision (bas gauche) : trois tracés de pouls + jauges */
  const COLORS = ['hs-dot-a', 'hs-dot-b', 'hs-dot-w'];
  COLORS.forEach(function (c, k) {
    const x = 165 + k * 62, y = 378;
    const g = el('g', { class: 'hs-panel' });
    el('rect', { x: x, y: y, width: 56, height: 62, rx: 6 }, g);
    el('polyline', { class: 'hs-ecg ' + c, style: 'animation-delay:' + (-k * 0.8) + 's',
                     points: pts([[x + 5, y + 22], [x + 18, y + 22], [x + 22, y + 10], [x + 27, y + 34], [x + 31, y + 16], [x + 35, y + 22], [x + 51, y + 22]]) }, g);
    el('rect', { class: 'hs-gauge-bg', x: x + 8, y: y + 46, width: 40, height: 4, rx: 2 }, g);
    el('rect', { class: 'hs-gauge ' + c, x: x + 8, y: y + 46, width: 40, height: 4, rx: 2, style: 'animation-delay:' + (-k * 1.3) + 's' }, g);
  });

  /* Radar (bas droit) */
  const rx = 440, ry = 412;
  const radar = el('g', { class: 'hs-radar' });
  [34, 22, 10].forEach(function (r) { el('circle', { cx: rx, cy: ry, r: r }, radar); });
  el('line', { x1: rx - 34, y1: ry, x2: rx + 34, y2: ry }, radar);
  el('line', { x1: rx, y1: ry - 34, x2: rx, y2: ry + 34 }, radar);
  const sweep = el('g', { class: 'hs-sweep', style: 'transform-origin:' + rx + 'px ' + ry + 'px' }, radar);
  el('path', { d: 'M' + rx + ' ' + ry + ' L' + (rx + 34) + ' ' + ry + ' A34 34 0 0 0 ' + (rx + 24) + ' ' + (ry - 24) + ' Z' }, sweep);
  el('circle', { class: 'hs-blip', cx: rx - 14, cy: ry - 12, r: 2.2 }, radar);
  el('circle', { class: 'hs-blip', cx: rx + 18, cy: ry + 10, r: 2.2, style: 'animation-delay:-1.2s' }, radar);

  /* Pause de l'animation quand le hero n'est plus visible (économie de batterie) */
  if ('IntersectionObserver' in window && svg.pauseAnimations) {
    new IntersectionObserver(function (entries) {
      const on = entries[0].isIntersecting;
      svg.classList.toggle('is-paused', !on);
      if (on) svg.unpauseAnimations(); else svg.pauseAnimations();
    }).observe(svg);
  }
})();

/* ---------- 17. OUTILS .EXE : CAPTURES + VISIONNEUSE PLEIN ÉCRAN ----------
   • Les captures listées dans data-shots (dossier images/) s'affichent si elles existent.
   • En mode Éditer : « Ajouter une capture » (gardée dans CE navigateur) + téléchargement
     du fichier au bon nom, à déposer dans images/ pour que tous les visiteurs la voient.
   • Visionneuse : flèches ← →, compteur, loupe (clic sur l'image), Échap pour fermer. */
(function () {
  const cards = document.querySelectorAll('.exe-card[data-exe]');
  const viewer = document.getElementById('shotViewer');
  if (!cards.length || !viewer) return;

  const vImg = viewer.querySelector('.sv-img');
  const vCap = viewer.querySelector('.sv-caption');
  const vCount = viewer.querySelector('.sv-count');
  let list = [], idx = 0, lastFocus = null;

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key)) || [];
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) { return val === undefined ? [] : false; }
  }

  /* --- Visionneuse --- */
  function show(i) {
    idx = (i + list.length) % list.length;
    vImg.src = list[idx].src;
    vImg.alt = list[idx].alt;
    vCap.textContent = list[idx].alt;
    vCount.textContent = (idx + 1) + ' / ' + list.length;
    viewer.classList.remove('zoomed');
    viewer.classList.toggle('single', list.length < 2);
  }
  function open(shots, i) {
    list = shots; lastFocus = document.activeElement;
    viewer.hidden = false;
    document.body.classList.add('no-scroll');
    show(i || 0);
    viewer.querySelector('.sv-close').focus();
  }
  function close() {
    viewer.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }
  viewer.addEventListener('click', function (e) {
    if (e.target.closest('.sv-prev')) show(idx - 1);
    else if (e.target.closest('.sv-next')) show(idx + 1);
    else if (e.target.closest('.sv-close') || e.target === viewer) close();
    else if (e.target === vImg || e.target.closest('.sv-zoom')) viewer.classList.toggle('zoomed');
  });
  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  /* --- Cartes --- */
  cards.forEach(function (card) {
    const id = card.dataset.exe;
    const KEY = 'exeShots:' + id;
    const name = card.querySelector('.project-title').textContent.trim();
    const media = card.querySelector('.exe-media');
    const btn = card.querySelector('.exe-shot');
    const thumb = btn.querySelector('img');
    const count = card.querySelector('.exe-count');
    const files = (card.dataset.shots || '').split(/\s+/).filter(Boolean);
    let published = [];

    function all() {
      const local = store(KEY).map(function (src, k) {
        return { src: src, alt: name + ' — capture ajoutée ' + (k + 1), local: true };
      });
      return published.concat(local);
    }
    function refresh() {
      const shots = all();
      media.classList.toggle('has-shots', shots.length > 0);
      if (shots.length) { thumb.src = shots[0].src; thumb.alt = shots[0].alt; }
      count.textContent = shots.length > 1 ? shots.length + ' captures' : '';
      const clear = card.querySelector('[data-shot-clear]');
      if (clear) clear.hidden = !store(KEY).length;
    }

    /* On garde seulement les captures publiées qui existent vraiment */
    Promise.all(files.map(function (f, k) {
      return new Promise(function (ok) {
        const im = new Image();
        im.onload = function () { ok({ src: f, alt: name + ' — capture ' + (k + 1) }); };
        im.onerror = function () { ok(null); };
        im.src = f;
      });
    })).then(function (res) { published = res.filter(Boolean); refresh(); });

    btn.addEventListener('click', function () {
      const shots = all();
      if (shots.length) open(shots, 0);
    });

    /* --- Mode Éditer : ajouter / retirer des captures --- */
    const input = card.querySelector('[data-shot-input]');
    const dl = card.querySelector('[data-shot-dl]');
    if (input) input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file || !/^image\//.test(file.type)) return;
      const reader = new FileReader();
      reader.onload = function () {
        const im = new Image();
        im.onload = function () {
          /* Réduction à 1600 × 1000 px maximum, en JPEG, pour rester léger */
          const r = Math.min(1, 1600 / im.width, 1000 / im.height);
          const c = document.createElement('canvas');
          c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          const data = c.toDataURL('image/jpeg', 0.85);
          const saved = store(KEY);
          saved.push(data);
          if (!store(KEY, saved)) { alert('Capture trop lourde pour être gardée dans ce navigateur.'); return; }
          const n = published.length + saved.length;
          dl.href = data;
          dl.download = 'exe-' + id + '-' + n + '.jpg';
          dl.querySelector('span').textContent = 'Télécharger exe-' + id + '-' + n + '.jpg';
          dl.hidden = false;
          refresh();
        };
        im.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    const clear = card.querySelector('[data-shot-clear]');
    if (clear) clear.addEventListener('click', function () {
      store(KEY, null);
      if (dl) dl.hidden = true;
      refresh();
    });
  });
})();

/* ---------- 18. ÉTIQUETTES DU HERO → LABO CORRESPONDANT ----------
   Un clic sur une étiquette (Active Directory, pfSense…) descend jusqu'au labo
   lié et le fait briller quelques instants. */
(function () {
  document.querySelectorAll('a.emblem-chip[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () {
      const col = document.querySelector(a.getAttribute('href'));
      const card = col && col.querySelector('.project-card');
      if (!card) return;
      col.classList.add('visible');   // au cas où l'animation d'apparition n'a pas encore eu lieu
      card.classList.remove('is-flash');
      setTimeout(function () { card.classList.add('is-flash'); }, 650);
      setTimeout(function () { card.classList.remove('is-flash'); }, 3200);
    });
  });
})();
