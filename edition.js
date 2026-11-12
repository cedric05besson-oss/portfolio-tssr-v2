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
  const PAGE = (location.pathname.split('/').pop() || 'index.html');
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
  function exportPage() {
    fetch(location.href.split('#')[0], { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (!applySaved(doc, zones(doc))) throw new Error('structure');

        // Sérialisation en gardant le doctype et les commentaires d'en-tête
        let out = '';
        doc.childNodes.forEach(function (n) {
          if (n.nodeType === 10) out += '<!DOCTYPE html>\n';
          else if (n.nodeType === 8) out += '<!--' + n.data + '-->\n';
          else if (n.nodeType === 1) out += n.outerHTML + '\n';
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([out], { type: 'text/html' }));
        a.download = PAGE;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast('✓ ' + PAGE + ' téléchargé : remplacez le fichier dans le dossier du site');
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

  // Impression automatique (cv.html?print)
  if (/[?&]print\b/.test(location.search)) {
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
