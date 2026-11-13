/* ============================================================
   CV EN LIGNE — traduction (Google Traduction)
   ------------------------------------------------------------
   • Reprend automatiquement la langue choisie sur le portfolio
     (cookie « googtrans », partagé par les deux pages).
   • Sélecteur de langue dans les boutons en bas à droite.
   • Page traduite : le bouton PDF imprime le CV dans la langue affichée
     (le fichier PDF téléchargeable, lui, est en français).
   Rien n'est envoyé à Google tant que le CV reste en français.
   ============================================================ */
(function () {
  'use strict';
  const PAGE_LANG = 'fr';
  const LANGS = [['fr', 'Français'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'],
                 ['it', 'Italiano'], ['pt', 'Português'], ['nl', 'Nederlands']];

  function domains() { const h = location.hostname; return ['', '; domain=' + h, '; domain=.' + h]; }
  function setCookie(lang) { domains().forEach(function (d) { document.cookie = 'googtrans=/' + PAGE_LANG + '/' + lang + '; path=/' + d; }); }
  function clearCookie() { domains().forEach(function (d) { document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d; }); }
  function current() {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/]*\/([^;]+)/);
    const l = m ? decodeURIComponent(m[1]) : PAGE_LANG;
    return LANGS.some(function (x) { return x[0] === l; }) ? l : PAGE_LANG;
  }

  // Le nom ne se traduit jamais
  document.querySelectorAll('.cv-name').forEach(function (el) { el.classList.add('notranslate'); el.setAttribute('translate', 'no'); });

  // Sélecteur de langue
  const bar = document.querySelector('.cv-actions');
  const lang = current();
  if (bar) {
    const wrap = document.createElement('label');
    wrap.className = 'cv-btn cv-lang notranslate';
    wrap.setAttribute('translate', 'no');
    wrap.innerHTML = '<i class="fas fa-language" aria-hidden="true"></i><span class="visually-hidden">Langue du CV</span>' +
      '<select aria-label="Langue du CV">' + LANGS.map(function (l) {
        return '<option value="' + l[0] + '"' + (l[0] === lang ? ' selected' : '') + '>' + l[0].toUpperCase() + ' · ' + l[1] + '</option>';
      }).join('') + '</select>';
    bar.insertBefore(wrap, bar.querySelector('.cv-btn--main'));
    wrap.querySelector('select').addEventListener('change', function (e) {
      if (e.target.value === PAGE_LANG) clearCookie(); else setCookie(e.target.value);
      location.reload();
    });

    // Page traduite : « PDF » = impression du CV traduit
    const pdf = bar.querySelector('.cv-btn--main');
    if (pdf && lang !== PAGE_LANG) {
      pdf.removeAttribute('download');
      pdf.setAttribute('title', 'Enregistrer le CV traduit en PDF (Imprimer → Enregistrer au format PDF)');
      pdf.addEventListener('click', function (e) { e.preventDefault(); window.print(); });
    }
  }

  if (lang === PAGE_LANG) return;

  // Chargement de Google Traduction (lit le cookie et traduit la page)
  const holder = document.createElement('div');
  holder.id = 'gt-holder';
  holder.setAttribute('aria-hidden', 'true');
  document.body.appendChild(holder);
  window.gtInit = function () {
    new google.translate.TranslateElement({ pageLanguage: PAGE_LANG, autoDisplay: false }, 'gt-holder');
  };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=gtInit';
  s.async = true;
  document.head.appendChild(s);

  // cv.html?print (bouton « Télécharger le CV » d'une page traduite) :
  // on attend la fin de la traduction avant d'ouvrir l'impression / PDF.
  if (/[?&]print\b/.test(location.search)) {
    const probe = document.querySelector('.cv-main h2, h2');
    const before = probe ? probe.textContent : '';
    const t0 = Date.now();
    (function wait() {
      const done = /translated-/.test(document.documentElement.className) && probe && probe.textContent !== before;
      if (done || Date.now() - t0 > 10000) setTimeout(function () { window.print(); }, done ? 1200 : 0);
      else setTimeout(wait, 300);
    })();
  }
})();
