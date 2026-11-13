/* ============================================================
   PORTFOLIO v2 — Cédric BESSON · edition.js
   ------------------------------------------------------------
   Utilisé par index.html ET cv.html.
     1. Taille des textes (boutons A− / A+, mémorisée dans le navigateur)
     2. Mode édition : modifier les textes directement sur la page
        • Ouvrir  : bouton « Éditer » du bandeau, Ctrl + Alt + M
                    ou ?edition à la fin de l'adresse
        • Les modifications sont gardées dans CE navigateur (localStorage).
        • « Exporter la page » télécharge le fichier HTML à jour :
          il suffit de remplacer l'ancien fichier dans le dossier puis
          de publier (voir PROCEDURE-GITHUB.md).
     3. Lieu de la carte Google Maps (champ du mode édition)
     4. Outils CV du bandeau en mode édition : CV PDF, PDF A4, CV 1 page
   Un visiteur qui clique sur « Éditer » ne modifie que SON navigateur :
   le site publié ne change que si le fichier exporté est republié.
   ============================================================ */
'use strict';

/* ---------- Petits utilitaires ---------- */
const Store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } },
  del(key) { try { localStorage.removeItem(key); } catch (e) { /* ignoré */ } }
};

/* ---------- PROPRIÉTAIRE ----------
   Le mode « Éditer » et les outils CV ne sont proposés que sur l'ordinateur
   de Cédric : page ouverte depuis le dossier (file://) ou via un serveur local
   (localhost / 127.0.0.1). Sur le site publié (GitHub Pages), les visiteurs
   ne voient ni le bouton ni les outils, le raccourci est désactivé et
   d'éventuelles anciennes modifications locales ne sont plus appliquées.
   Rappel : un site statique ne peut de toute façon jamais être modifié par
   un visiteur ; seul un nouveau « git push » change le site en ligne. */
const IS_OWNER = location.protocol === 'file:' ||
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
if (!IS_OWNER) {
  document.documentElement.classList.add('public-view');
  document.querySelectorAll('[data-ed-open], .ed-only, [data-owner-only]').forEach(function (el) { el.remove(); });
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'ed-toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2800);
}

/* ---------- 1. TAILLE DES TEXTES ---------- */
(function () {
  const STEPS = [0.9, 1, 1.1, 1.2, 1.3];   // 100 % = taille normale
  let idx = STEPS.indexOf(Store.get('fontScale'));
  if (idx === -1) idx = 1;

  function apply() {
    document.documentElement.style.fontSize = STEPS[idx] === 1 ? '' : (STEPS[idx] * 100) + '%';
    // Indicateur « 100 % » entre A− et A+ ; boutons grisés aux limites
    document.querySelectorAll('.fs-val').forEach(function (v) { v.textContent = Math.round(STEPS[idx] * 100) + ' %'; });
    document.querySelectorAll('[data-fs]').forEach(function (b) {
      const d = parseInt(b.dataset.fs, 10);
      b.disabled = (d < 0 && idx === 0) || (d > 0 && idx === STEPS.length - 1);
    });
  }
  apply();

  document.querySelectorAll('[data-fs]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      idx = Math.min(STEPS.length - 1, Math.max(0, idx + parseInt(btn.dataset.fs, 10)));
      apply();
      Store.set('fontScale', STEPS[idx]);
    });
  });
})();

/* ---------- 2 & 3. MODE ÉDITION + CARTE ---------- */
(function () {
  if (!IS_OWNER) return;   // site publié : pas de mode édition pour les visiteurs
  const PAGE = (location.pathname.split('/').pop() || 'index.html');
  if (PAGE === 'cv.html') return;   // le CV a son propre éditeur (module 2 bis)
  const KEY  = 'edits:' + PAGE;

  // Textes modifiables, et zones exclues (menu, formulaire, bandeau défilant, texte animé…)
  const EDITABLE = 'h1, h2, h3, p, li, dt, dd, .stat-lbl, .timeline-year, .tags span';
  const EXCLUDE  = 'nav, form, script, style, .marquee, .ed-toolbar, .hero-subtitle, .term-bar, [data-no-edit]';

  /* Liste des zones modifiables d'un document, toujours dans le même ordre.
     On garde seulement l'élément le plus « haut » (pas de zone dans une zone). */
  function zones(doc) {
    const all = Array.prototype.filter.call(doc.querySelectorAll(EDITABLE), function (el) {
      return !el.closest(EXCLUDE);
    });
    return all.filter(function (el) {
      return !all.some(function (other) { return other !== el && other.contains(el); });
    });
  }

  /* Carte : met à jour l'iframe et le libellé à partir d'un lieu (ex. "Toulon, France") */
  function setMap(doc, query) {
    const wrap = doc.querySelector('.map-wrap');
    if (!wrap || !query) return;
    wrap.setAttribute('data-map-query', query);
    const iframe = wrap.querySelector('iframe');
    if (iframe) {
      iframe.setAttribute('src', 'https://www.google.com/maps?q=' + encodeURIComponent(query) + '&z=12&hl=fr&output=embed');
      iframe.setAttribute('title', 'Carte Google Maps – ' + query);
    }
    const label = wrap.querySelector('.map-label');
    if (label) label.textContent = query.replace(/,\s*\d{5}/, '');  // retire le code postal du libellé
  }

  const list     = zones(document);
  const original = list.map(function (el) { return el.innerHTML; });
  let saved      = Store.get(KEY) || { count: list.length, items: {}, map: '' };

  /* Applique les modifications enregistrées (si la page n'a pas changé de structure) */
  function applySaved(doc, zonesList) {
    if (saved.count !== zonesList.length) return false;
    Object.keys(saved.items).forEach(function (i) {
      if (zonesList[i]) zonesList[i].innerHTML = saved.items[i];
    });
    if (saved.map) setMap(doc, saved.map);
    return true;
  }
  const structureOk = applySaved(document, list);

  /* ----- Barre d'outils du mode édition ----- */
  let bar = null;
  let editing = false;

  function buildBar() {
    bar = document.createElement('div');
    bar.className = 'ed-toolbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Mode édition');
    const hasMap = !!document.querySelector('.map-wrap');
    bar.innerHTML =
      '<span class="ed-title"><i class="fas fa-pen" aria-hidden="true"></i> Mode édition</span>' +
      (hasMap ? '<label>Lieu de la carte <input type="text" id="ed-map" placeholder="Ville, code postal, pays"></label>' : '') +
      '<button type="button" data-act="export" class="ed-primary"><i class="fas fa-download" aria-hidden="true"></i> Exporter la page</button>' +
      '<button type="button" data-act="reset"><i class="fas fa-rotate-left" aria-hidden="true"></i> Annuler mes modifs</button>' +
      '<button type="button" data-act="close"><i class="fas fa-check" aria-hidden="true"></i> Terminer</button>';
    document.body.appendChild(bar);

    const mapInput = bar.querySelector('#ed-map');
    if (mapInput) {
      mapInput.value = document.querySelector('.map-wrap').getAttribute('data-map-query') || '';
      mapInput.addEventListener('change', function () {
        const q = mapInput.value.trim();
        if (!q) return;
        setMap(document, q);
        saved.map = q;
        save();
      });
    }

    bar.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.act === 'close')  toggle(false);
      if (btn.dataset.act === 'export') exportPage();
      if (btn.dataset.act === 'reset' && confirm('Supprimer toutes les modifications non exportées de cette page ?')) {
        Store.del(KEY);
        location.reload();
      }
    });
  }

  function save() {
    saved.count = list.length;
    if (!Store.set(KEY, saved)) toast('⚠ Impossible d\'enregistrer dans ce navigateur (navigation privée ?)');
  }

  function onInput(e) {
    const i = list.indexOf(e.target.closest('[data-ed-key]'));
    if (i === -1) return;
    if (list[i].innerHTML === original[i]) delete saved.items[i];
    else saved.items[i] = list[i].innerHTML;
    save();
  }

  function toggle(on) {
    editing = on;
    if (!bar) buildBar();
    bar.hidden = !on;
    document.body.classList.toggle('ed-mode', on);
    list.forEach(function (el, i) {
      if (on) {
        el.setAttribute('data-ed-key', i);
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'true');
      } else {
        el.removeAttribute('data-ed-key');
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
      }
    });
    if (on) {
      document.addEventListener('input', onInput);
      toast(structureOk ? '✏️ Cliquez sur un texte pour le modifier' : '⚠ La page a changé : anciennes modifications ignorées');
    } else {
      document.removeEventListener('input', onInput);
      toast('✓ Modifications gardées dans ce navigateur. Pensez à « Exporter la page ».');
    }
  }

  /* ----- Export : on repart du fichier d'origine et on y applique les modifications ----- */
  // Sérialisation en gardant le doctype et les commentaires d'en-tête
  function serialize(doc, root) {
    let out = '';
    doc.childNodes.forEach(function (n) {
      if (n.nodeType === 10) out += '<!DOCTYPE html>\n';
      else if (n.nodeType === 8) out += '<!--' + n.data + '-->\n';
      else if (n.nodeType === 1) out += (root || n).outerHTML + '\n';
    });
    return out;
  }

  function download(out) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/html' }));
    a.download = PAGE;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('✓ ' + PAGE + ' téléchargé : remplacez le fichier dans le dossier du site');
  }

  function exportPage() {
    fetch(location.href.split('#')[0].split('?')[0], { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (!applySaved(doc, zones(doc))) throw new Error('structure');
        download(serialize(doc));
      })
      .catch(function (err) {
        toast(err && err.message === 'structure'
          ? '⚠ Le fichier a changé depuis vos modifications : export impossible'
          : '⚠ Export impossible : ouvrez la page via un serveur (Live Server) ou en ligne');
      });
  }

  /* ----- Activation : raccourci clavier ou ?edition dans l'adresse ----- */
  document.addEventListener('keydown', function (e) {
    // Ctrl + Alt + M (on ignore AltGr, utilisé pour taper des caractères sur clavier AZERTY)
    if (e.ctrlKey && e.altKey && !e.getModifierState('AltGraph') && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      tryToggle(!editing);
    }
  });
  // Bouton « Éditer » du bandeau
  document.querySelectorAll('[data-ed-open]').forEach(function (b) {
    b.addEventListener('click', function () { tryToggle(!editing); });
  });
  if (/[?&]edition\b/.test(location.search)) tryToggle(true);

  // Pas d'édition sur une page traduite : on enregistrerait le texte traduit
  function tryToggle(on) {
    if (on && /translated-(ltr|rtl)/.test(document.documentElement.className)) {
      toast('⚠ Repassez la page en français (Traduire → FR) avant d\'éditer');
      return;
    }
    toggle(on);
  }
})();

/* ---------- 2 bis. ÉDITEUR DU CV (cv.html), façon traitement de texte ----------
   Bouton « Éditer » (ou Ctrl + Alt + M) : toute la page du CV devient modifiable.
     • Gras, italique, souligné, couleur, annuler / rétablir (Ctrl+Z / Ctrl+Y)
     • Lignes : ajouter, monter, descendre, supprimer (Alt + ↑ / ↓ pour déplacer)
     • Rubriques : ajouter une rubrique, la déplacer (curseur dans son titre)
     • Coller une liste (« * », « - », « • ») = une ligne par élément, sans mise en forme parasite
     • Correcteur d'orthographe du navigateur (clic droit sur un mot souligné)
   Les modifications sont gardées dans ce navigateur. « Exporter » télécharge le
   cv.html corrigé (à remettre dans le dossier) ; « PDF du CV » ouvre l'impression A4. */
(function () {
  if (!IS_OWNER) return;
  const PAGE = (location.pathname.split('/').pop() || 'index.html');
  if (PAGE !== 'cv.html') return;
  const root = document.querySelector('.cv-page');
  if (!root) return;

  const KEY = 'cvEditor';
  const OLD_KEY = 'edits:cv.html';                 // ancien format (texte par texte)
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function clean(html) { return html.replace(/\s*\bed-cur\b/g, '').replace(/ class=""/g, ''); }

  const base = hash(root.innerHTML);
  let saved = Store.get(KEY);
  let stale = false;

  // Reprise des corrections faites avec l'ancien mode édition (s'il y en a)
  const old = Store.get(OLD_KEY);
  if (!saved && old && old.items && Object.keys(old.items).length) {
    const EDITABLE = 'h1, h2, h3, p, li, dt, dd';
    const all = Array.prototype.filter.call(root.querySelectorAll(EDITABLE), function (el) {
      return !el.closest('nav, .cv-transfer') && !(el.tagName === 'H2' && el.parentElement.querySelector('.cv-transfer'));
    });
    const z = all.filter(function (el) { return !all.some(function (o) { return o !== el && o.contains(el); }); });
    if (old.count === z.length) {
      Object.keys(old.items).forEach(function (i) { if (z[i]) z[i].innerHTML = old.items[i]; });
      saved = { base: base, html: clean(root.innerHTML) };
      Store.set(KEY, saved);
      Store.del(OLD_KEY);
    }
  }

  if (saved && saved.html) {
    if (saved.base === base) root.innerHTML = saved.html;
    else if (saved.html === clean(root.innerHTML)) { Store.del(KEY); saved = null; }   // fichier exporté remis en place
    else stale = true;                                                                // cv.html modifié entre-temps
  }

  let bar = null, editing = false, cur = null, timer = null;

  function save() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      saved = { base: base, html: clean(root.innerHTML) };
      if (!Store.set(KEY, saved)) toast('⚠ Impossible d\'enregistrer dans ce navigateur (navigation privée ?)');
    }, 300);
  }

  /* Bloc où se trouve le curseur : ligne de liste, paragraphe, ou rubrique (curseur dans le titre) */
  function caretNode() {
    const s = window.getSelection();
    if (!s.rangeCount) return null;
    let n = s.getRangeAt(0).startContainer;
    if (n.nodeType === 3) n = n.parentNode;
    return root.contains(n) ? n : null;
  }
  function block() {
    const n = caretNode();
    if (!n) return null;
    const h = n.closest('h2');
    if (h && h.parentElement.tagName === 'SECTION') return h.parentElement;
    return n.closest('li, p, h1, h3');
  }
  function mark() {
    const b = editing ? block() : null;
    if (b === cur) return;
    if (cur) cur.classList.remove('ed-cur');
    cur = b;
    if (cur) cur.classList.add('ed-cur');
  }
  function placeCaret(el, atEnd) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(!atEnd);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    el.scrollIntoView({ block: 'nearest' });
  }

  function act(a) {
    const b = block();
    if (['bold', 'italic', 'underline', 'undo', 'redo', 'removeFormat'].indexOf(a) !== -1) {
      document.execCommand(a); save(); return;
    }
    if (a === 'add') {
      if (!b) return toast('Placez d\'abord le curseur dans une ligne');
      let n;
      if (b.tagName === 'SECTION') {          // curseur dans un titre → 1re ligne de la rubrique
        const first = b.querySelector('li, p');
        if (!first) return;
        n = first.cloneNode(false); n.textContent = 'Nouvelle ligne';
        first.parentNode.insertBefore(n, first);
      } else {
        n = b.cloneNode(false); n.classList.remove('ed-cur');
        n.textContent = 'Nouvelle ligne';
        b.after(n);
      }
      selectAll(n); save(); mark(); return;
    }
    if (a === 'section') {
      const sec = (b && b.closest('section')) || root.querySelector('.cv-side section:last-child');
      const n = document.createElement('section');
      n.innerHTML = '<h2>Nouvelle rubrique</h2><ul class="cv-list"><li>Première ligne</li></ul>';
      sec.after(n);
      selectAll(n.querySelector('h2')); save(); mark(); return;
    }
    if (!b) return toast('Placez d\'abord le curseur dans une ligne ou un titre de rubrique');
    if (a === 'up' || a === 'down') {
      const sib = a === 'up' ? b.previousElementSibling : b.nextElementSibling;
      if (!sib || sib.tagName !== b.tagName) return;
      if (a === 'up') sib.before(b); else sib.after(b);
      b.scrollIntoView({ block: 'nearest' }); save(); return;
    }
    if (a === 'del') {
      const what = b.tagName === 'SECTION' ? 'toute la rubrique « ' + b.querySelector('h2').textContent.trim() + ' »' : 'cette ligne';
      if (!confirm('Supprimer ' + what + ' ?')) return;
      b.remove(); cur = null;
      save(); return;
    }
  }
  function selectAll(el) {
    const r = document.createRange(); r.selectNodeContents(el);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    el.scrollIntoView({ block: 'nearest' });
  }

  /* Coller : texte brut ; une liste collée dans une ligne de liste = une ligne par élément */
  function onPaste(e) {
    const t = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (t == null) return;
    e.preventDefault();
    const lines = t.replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    const n = caretNode();
    const li = n && n.closest('li');
    if (li && lines.length > 1) {
      const items = lines.map(function (l) { return l.replace(/^([*\-•·–]|\d+[.)])\s*/, ''); });
      // Ligne vide (ou « Nouvelle ligne ») : le 1er élément la remplit ; sinon tout va en dessous
      if (!li.textContent.trim() || li.textContent.trim() === 'Nouvelle ligne') {
        selectAll(li);
        document.execCommand('insertText', false, items.shift());
      }
      let last = li;
      items.forEach(function (txt) { const x = li.cloneNode(false); x.classList.remove('ed-cur'); x.textContent = txt; last.after(x); last = x; });
      placeCaret(last, true);
    } else {
      document.execCommand('insertText', false, lines.join(' '));
    }
    save();
  }

  function onKey(e) {
    if (e.altKey && !e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault(); act(e.key === 'ArrowUp' ? 'up' : 'down');
    }
  }

  function cleanDoc() {
    const r = document.documentElement.cloneNode(true);
    r.querySelectorAll('.ed-toolbar, .ed-toast, #gt-holder, .cv-lang, .skiptranslate, ' +
      'script[src*="translate"], link[href*="translate"], style[id^="goog"]').forEach(function (el) { el.remove(); });
    r.querySelectorAll('[contenteditable], [spellcheck], .ed-cur').forEach(function (el) {
      el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); el.classList.remove('ed-cur');
      if (!el.getAttribute('class')) el.removeAttribute('class');
    });
    r.querySelectorAll('.cv-name').forEach(function (el) { el.classList.remove('notranslate'); el.removeAttribute('translate'); });
    r.removeAttribute('style'); r.classList.remove('public-view');
    if (!r.getAttribute('class')) r.removeAttribute('class');
    const b = r.querySelector('body');
    b.classList.remove('ed-mode'); b.removeAttribute('style');
    if (!b.getAttribute('class')) b.removeAttribute('class');
    let out = '';
    document.childNodes.forEach(function (n) {
      if (n.nodeType === 10) out += '<!DOCTYPE html>\n';
      else if (n.nodeType === 8) out += '<!--' + n.data + '-->\n';
      else if (n.nodeType === 1) out += r.outerHTML + '\n';
    });
    return out;
  }
  function exportPage() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([cleanDoc()], { type: 'text/html' }));
    a.download = 'cv.html';
    document.body.appendChild(a); a.click(); a.remove();
    toast('✓ cv.html téléchargé : remplacez le fichier dans le dossier du portfolio');
  }

  const B = function (act, icon, label, title) {
    return '<button type="button" data-act="' + act + '" title="' + (title || label) + '">' +
      (icon ? '<i class="fas ' + icon + '" aria-hidden="true"></i>' : '') + (label ? ' ' + label : '') + '</button>';
  };
  function buildBar() {
    bar = document.createElement('div');
    bar.className = 'ed-toolbar ed-toolbar--cv';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Édition du CV');
    bar.innerHTML =
      '<div class="ed-row">' +
        '<span class="ed-title"><i class="fas fa-pen" aria-hidden="true"></i> CV</span>' +
        B('bold', 'fa-bold', '', 'Gras (Ctrl+B)') + B('italic', 'fa-italic', '', 'Italique (Ctrl+I)') +
        B('underline', 'fa-underline', '', 'Souligné (Ctrl+U)') +
        '<select data-color title="Couleur du texte" aria-label="Couleur du texte">' +
          '<option value="">Couleur</option><option value="#0b1d22">Noir</option>' +
          '<option value="#0e6372">Pétrole</option><option value="#8a1538">Bordeaux</option><option value="#6b7f84">Gris</option></select>' +
        B('removeFormat', 'fa-text-slash', '', 'Effacer la mise en forme') +
        '<span class="ed-sep"></span>' +
        B('undo', 'fa-rotate-left', '', 'Annuler (Ctrl+Z)') + B('redo', 'fa-rotate-right', '', 'Rétablir (Ctrl+Y)') +
      '</div><div class="ed-row">' +
        B('add', 'fa-plus', 'Ligne', 'Ajouter une ligne sous celle du curseur') +
        B('up', 'fa-arrow-up', '', 'Monter (Alt+↑)') + B('down', 'fa-arrow-down', '', 'Descendre (Alt+↓)') +
        B('del', 'fa-trash', '', 'Supprimer la ligne (ou la rubrique si le curseur est dans son titre)') +
        B('section', 'fa-layer-group', 'Rubrique', 'Ajouter une rubrique sous celle du curseur') +
      '</div><div class="ed-row">' +
        '<button type="button" data-act="export" class="ed-primary"><i class="fas fa-download" aria-hidden="true"></i> Exporter cv.html</button>' +
        B('pdf', 'fa-file-pdf', 'PDF du CV', 'Enregistrer le CV en PDF (une page A4)') +
        B('reset', 'fa-eraser', 'Tout annuler', 'Revenir au CV du fichier') +
        B('close', 'fa-check', 'Terminer') +
      '</div>';
    document.body.appendChild(bar);
    // Les boutons ne doivent pas faire perdre le curseur dans le texte
    bar.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    bar.addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const a = btn.dataset.act;
      if (a === 'close') return toggle(false);
      if (a === 'export') return exportPage();
      if (a === 'pdf') {
        toggle(false);
        toast('Imprimante : « Enregistrer au format PDF » → ressources/CV_Cedric_BESSON_TSSR.pdf');
        return setTimeout(function () { window.print(); }, 400);
      }
      if (a === 'reset') {
        if (confirm('Effacer toutes les modifications non exportées du CV ?')) { Store.del(KEY); Store.del(OLD_KEY); location.reload(); }
        return;
      }
      act(a);
    });
    bar.querySelector('[data-color]').addEventListener('change', function (e) {
      if (e.target.value) { document.execCommand('foreColor', false, e.target.value); save(); }
      e.target.value = '';
    });
  }

  function toggle(on) {
    editing = on;
    if (!bar) buildBar();
    bar.hidden = !on;
    document.body.classList.toggle('ed-mode', on);
    if (on) {
      root.setAttribute('contenteditable', 'true');
      root.setAttribute('spellcheck', 'true');
      root.addEventListener('input', save);
      root.addEventListener('paste', onPaste);
      root.addEventListener('keydown', onKey);
      document.addEventListener('selectionchange', mark);
      try { document.execCommand('styleWithCSS', false, false); } catch (err) { /* ignoré */ }
      toast(stale ? '⚠ cv.html a changé : vos anciennes modifications ne sont pas appliquées (« Tout annuler » pour les effacer)'
                  : '✏️ Cliquez dans le CV pour écrire, comme dans Word');
    } else {
      root.removeAttribute('contenteditable');
      root.removeAttribute('spellcheck');
      root.removeEventListener('input', save);
      root.removeEventListener('paste', onPaste);
      root.removeEventListener('keydown', onKey);
      document.removeEventListener('selectionchange', mark);
      if (cur) { cur.classList.remove('ed-cur'); cur = null; }
      save();
      toast('✓ Modifications gardées dans ce navigateur. Pensez à « Exporter cv.html ».');
    }
  }

  function tryToggle(on) {
    if (on && /translated-(ltr|rtl)/.test(document.documentElement.className)) {
      toast('⚠ Repassez le CV en français (FR) avant de le modifier');
      return;
    }
    toggle(on);
  }
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.altKey && !e.getModifierState('AltGraph') && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault(); tryToggle(!editing);
    }
  });
  document.querySelectorAll('[data-ed-open]').forEach(function (b) {
    b.addEventListener('click', function () { tryToggle(!editing); });
  });
  if (/[?&]edition\b/.test(location.search)) tryToggle(true);
})();

/* ---------- 4. OUTILS CV (boutons du bandeau, visibles en mode édition) ----------
   • CV PDF    : aperçu du CV PDF publié + choix d'un nouveau CV. Le nouveau fichier
                 est renommé « CV_Cedric_BESSON_TSSR.pdf » au téléchargement : il suffit
                 de le copier dans le dossier « ressources » puis de publier.
   • PDF A4    : imprime le portfolio au format A4 (choisir « Enregistrer au format PDF »).
   • CV 1 page : ouvre cv.html et lance l'impression du CV sur une page A4.
   Sur cv.html, l'adresse « cv.html?print » lance l'impression automatiquement. */
(function () {
  const CV_FILE = 'ressources/CV_Cedric_BESSON_TSSR.pdf';
  const CV_NAME = 'CV_Cedric_BESSON_TSSR.pdf';

  // Impression automatique (cv.html?print). Page traduite : c'est cv-traduction.js
  // qui imprime, une fois la traduction terminée.
  const translatedCv = /(?:^|;\s*)googtrans=\/[^\/]*\/(?!fr\b)[a-z]/.test(document.cookie);
  if (/[?&]print\b/.test(location.search) && !translatedCv) {
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 700); });
  }

  let panel = null, blobUrl = null;

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'cv-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'CV PDF');
    panel.innerHTML =
      '<div class="cv-panel-box">' +
        '<div class="cv-panel-head">' +
          '<h2><i class="fas fa-file-pdf" aria-hidden="true"></i> CV PDF</h2>' +
          '<label><i class="fas fa-file-arrow-up" aria-hidden="true"></i> Choisir un nouveau CV<input type="file" accept="application/pdf,.pdf"></label>' +
          '<a class="cv-primary" data-act="save" hidden download="' + CV_NAME + '"><i class="fas fa-download" aria-hidden="true"></i> Télécharger sous le bon nom</a>' +
          '<button type="button" data-act="current"><i class="fas fa-eye" aria-hidden="true"></i> CV actuel</button>' +
          '<button type="button" data-act="close" aria-label="Fermer"><i class="fas fa-xmark" aria-hidden="true"></i></button>' +
        '</div>' +
        '<p class="cv-panel-note">Aperçu : <strong data-role="name">CV publié (' + CV_FILE + ')</strong></p>' +
        '<iframe title="Aperçu du CV PDF"></iframe>' +
      '</div>';
    document.body.appendChild(panel);

    const frame = panel.querySelector('iframe');
    const name  = panel.querySelector('[data-role="name"]');
    const save  = panel.querySelector('[data-act="save"]');
    const input = panel.querySelector('input[type="file"]');
    const note  = panel.querySelector('.cv-panel-note');

    function showCurrent() {
      frame.src = CV_FILE;
      name.textContent = 'CV publié (' + CV_FILE + ')';
      save.hidden = true;
    }

    input.addEventListener('change', function () {
      const f = input.files && input.files[0];
      if (!f) return;
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { toast('⚠ Choisissez un fichier PDF'); return; }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(f);
      frame.src = blobUrl;
      save.href = blobUrl;
      save.hidden = false;
      name.textContent = 'nouveau CV « ' + f.name + ' » (pas encore publié)';
      note.title = 'Téléchargez-le, copiez-le dans le dossier « ressources » en remplaçant l\'ancien, puis publiez.';
      toast('✓ Aperçu chargé : « Télécharger sous le bon nom », puis remplacez le fichier dans « ressources »');
    });

    panel.addEventListener('click', function (e) {
      const b = e.target.closest('[data-act]');
      if (e.target === panel || (b && b.dataset.act === 'close')) close();
      else if (b && b.dataset.act === 'current') showCurrent();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel && !panel.hidden) close(); });
    panel.showCurrent = showCurrent;
  }

  function open() {
    if (!panel) buildPanel();
    if (!blobUrl) panel.showCurrent();
    panel.hidden = false;
  }
  function close() { panel.hidden = true; }

  function printA4() {
    // Impression en clair et sans le mode édition, puis retour à l'état d'avant
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme');
    const wasEditing = document.body.classList.contains('ed-mode');
    root.setAttribute('data-theme', 'light');
    document.body.classList.remove('ed-mode');
    window.addEventListener('afterprint', function restore() {
      root.setAttribute('data-theme', theme);
      if (wasEditing) document.body.classList.add('ed-mode');
      window.removeEventListener('afterprint', restore);
    });
    setTimeout(function () { window.print(); }, 50);
  }

  document.querySelectorAll('[data-cv]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.cv === 'pdf') open();
      if (b.dataset.cv === 'a4')  printA4();
      if (b.dataset.cv === 'one') window.open('cv.html?print', '_blank', 'noopener');
    });
  });
})();
