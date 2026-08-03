/*!
 * Crow Intelligence — cookie consent + Google Analytics loader.
 *
 * Self-contained: no dependencies, no build step. Served from /consent.js and
 * pulled in by both the Pelican theme and the hand-authored microsites, so a
 * single file governs consent across the whole site.
 *
 * Google Analytics is never loaded unless the visitor explicitly opts in.
 */
(function (window, document) {
  'use strict';

  var GA_MEASUREMENT_ID = 'G-3S8BY8VY3G';
  var STORAGE_KEY = 'ci-consent';
  var STORAGE_VERSION = 1;
  var PRIVACY_URL = '/privacy.html';

  /* ---------------------------------------------------------------- state */

  // localStorage throws in some privacy modes; never let that break the page.
  function readState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== STORAGE_VERSION) return null;
      if (typeof parsed.analytics !== 'boolean') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeState(analytics) {
    var state = {
      v: STORAGE_VERSION,
      analytics: !!analytics,
      ts: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* consent simply won't persist; the banner will ask again next visit */
    }
    return state;
  }

  /* ------------------------------------------------------------- analytics */

  function gtag() {
    window.dataLayer.push(arguments);
  }

  // Seed the dataLayer and default every storage type to denied. This sets no
  // cookies and makes no network request — it only records the default stance
  // for Google Consent Mode, in case the tag is loaded later.
  function seedConsentDefaults() {
    window.dataLayer = window.dataLayer || [];
    if (window.__ciConsentSeeded) return;
    window.__ciConsentSeeded = true;
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
  }

  function loadAnalytics() {
    if (window.__ciAnalyticsLoaded) return;
    window.__ciAnalyticsLoaded = true;

    gtag('consent', 'update', { analytics_storage: 'granted' });

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    script.setAttribute('data-ci-analytics', '');
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function revokeAnalytics() {
    if (!window.__ciConsentSeeded) return;
    gtag('consent', 'update', { analytics_storage: 'denied' });
  }

  /* ------------------------------------------------------------------ view */

  var STYLE_ID = 'ci-consent-style';
  var ROOT_ID = 'ci-consent-root';

  var CSS = [
    '#' + ROOT_ID + '{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;',
    'display:flex;justify-content:center;padding:16px;',
    'padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));pointer-events:none;}',
    '.ci-consent{pointer-events:auto;box-sizing:border-box;width:100%;max-width:720px;',
    'background:#24242b;color:#e8e6e1;border:1px solid #3a3a44;border-radius:8px;',
    'padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.45);',
    "font-family:'Courier Prime','Courier New',monospace;font-size:14px;line-height:1.6;text-align:left;}",
    '.ci-consent h2{font-size:15px;font-weight:700;margin:0 0 6px;color:#fff;',
    "font-family:'Courier Prime','Courier New',monospace;letter-spacing:.02em;}",
    '.ci-consent p{margin:0 0 14px;color:#c9c7c0;font-size:13px;}',
    '.ci-consent a{color:#e8c97e;text-decoration:underline;}',
    '.ci-consent a:hover{color:#d4b56a;}',
    '.ci-consent-actions{display:flex;gap:10px;flex-wrap:wrap;}',
    '.ci-consent button{font:inherit;font-size:13px;cursor:pointer;border-radius:4px;',
    'padding:9px 16px;border:1px solid #3a3a44;background:transparent;color:#e8e6e1;}',
    '.ci-consent button:hover{border-color:#e8c97e;color:#fff;}',
    '.ci-consent button:focus-visible{outline:2px solid #e8c97e;outline-offset:2px;}',
    '.ci-consent .ci-accept{background:#e8c97e;border-color:#e8c97e;color:#1a1a1f;font-weight:700;}',
    '.ci-consent .ci-accept:hover{background:#d4b56a;border-color:#d4b56a;color:#1a1a1f;}',
    '.ci-consent-prefs{margin:0 0 14px;border-top:1px solid #3a3a44;padding-top:14px;}',
    '.ci-consent-row{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px;}',
    '.ci-consent-row:last-child{margin-bottom:0;}',
    '.ci-consent-row strong{display:block;color:#e8e6e1;font-size:13px;font-weight:700;}',
    '.ci-consent-row span{display:block;color:#9a988f;font-size:12px;line-height:1.5;}',
    '.ci-consent-row input{margin:4px 0 0;flex:0 0 auto;width:16px;height:16px;accent-color:#e8c97e;}',
    '@media(max-width:480px){.ci-consent-actions{flex-direction:column;}',
    '.ci-consent button{width:100%;}#' + ROOT_ID + '{padding:10px;}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.appendChild(document.createTextNode(CSS));
    document.head.appendChild(style);
  }

  function remove() {
    var existing = document.getElementById(ROOT_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  // showPrefs: open straight into the per-category panel.
  function render(showPrefs) {
    injectStyle();
    remove();

    var state = readState();
    var analyticsChecked = state ? state.analytics : false;

    var root = document.createElement('div');
    root.id = ROOT_ID;

    var box = document.createElement('div');
    box.className = 'ci-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'ci-consent-title');
    box.setAttribute('aria-describedby', 'ci-consent-desc');
    box.setAttribute('tabindex', '-1');

    var title = document.createElement('h2');
    title.id = 'ci-consent-title';
    title.appendChild(document.createTextNode('Cookies on this site'));

    var desc = document.createElement('p');
    desc.id = 'ci-consent-desc';
    desc.appendChild(document.createTextNode(
      'We would like to set optional analytics cookies to understand how this site is used. ' +
      'We set none of them unless you agree. See our '
    ));
    var link = document.createElement('a');
    link.href = PRIVACY_URL;
    link.appendChild(document.createTextNode('privacy policy'));
    desc.appendChild(link);
    desc.appendChild(document.createTextNode('.'));

    box.appendChild(title);
    box.appendChild(desc);

    if (showPrefs) {
      var prefs = document.createElement('div');
      prefs.className = 'ci-consent-prefs';
      prefs.appendChild(buildRow(
        'ci-consent-necessary', 'Strictly necessary',
        'Needed for the site to work. Always on; these set no tracking cookies.',
        true, true
      ));
      prefs.appendChild(buildRow(
        'ci-consent-analytics', 'Analytics',
        'Google Analytics, to count visits and see which pages are read. Off unless you turn it on.',
        analyticsChecked, false
      ));
      box.appendChild(prefs);
    }

    var actions = document.createElement('div');
    actions.className = 'ci-consent-actions';

    if (showPrefs) {
      actions.appendChild(button('Save preferences', 'ci-accept', 'save', function () {
        var input = document.getElementById('ci-consent-analytics');
        apply(!!(input && input.checked));
      }));
      actions.appendChild(button('Reject all', '', 'reject', function () { apply(false); }));
    } else {
      actions.appendChild(button('Accept all', 'ci-accept', 'accept', function () { apply(true); }));
      actions.appendChild(button('Reject all', '', 'reject', function () { apply(false); }));
      actions.appendChild(button('Preferences', '', 'prefs', function () { render(true); focusBox(); }));
    }

    box.appendChild(actions);
    root.appendChild(box);
    (document.body || document.documentElement).appendChild(root);

    return box;
  }

  function buildRow(id, label, help, checked, disabled) {
    var row = document.createElement('div');
    row.className = 'ci-consent-row';

    var text = document.createElement('label');
    text.setAttribute('for', id);
    var strong = document.createElement('strong');
    strong.appendChild(document.createTextNode(label));
    var span = document.createElement('span');
    span.appendChild(document.createTextNode(help));
    text.appendChild(strong);
    text.appendChild(span);

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = !!checked;
    if (disabled) input.disabled = true;

    row.appendChild(text);
    row.appendChild(input);
    return row;
  }

  function button(label, className, action, onClick) {
    var el = document.createElement('button');
    el.type = 'button';
    if (className) el.className = className;
    el.setAttribute('data-ci-action', action);
    el.appendChild(document.createTextNode(label));
    el.addEventListener('click', onClick);
    return el;
  }

  function focusBox() {
    var box = document.querySelector('#' + ROOT_ID + ' .ci-consent');
    if (box && typeof box.focus === 'function') box.focus();
  }

  /* ----------------------------------------------------------------- logic */

  function apply(analytics) {
    writeState(analytics);
    if (analytics) {
      loadAnalytics();
    } else {
      revokeAnalytics();
    }
    remove();
  }

  function onKeydown(event) {
    if (event.key !== 'Escape') return;
    // Esc backs out of the preferences panel without deciding anything.
    if (document.getElementById('ci-consent-analytics') && !readState()) render(false);
  }

  function init() {
    seedConsentDefaults();

    var state = readState();
    if (state && state.analytics) loadAnalytics();
    if (!state) render(false);

    document.addEventListener('keydown', onKeydown);
  }

  window.CrowConsent = {
    // Re-open the banner so consent can be changed or withdrawn at any time.
    open: function () {
      render(true);
      focusBox();
    },
    accept: function () { apply(true); },
    reject: function () { apply(false); },
    state: function () { return readState(); },
    measurementId: GA_MEASUREMENT_ID
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
