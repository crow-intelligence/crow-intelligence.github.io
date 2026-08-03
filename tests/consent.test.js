import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

// Resolved from the project root: under the jsdom environment `import.meta.url`
// is not a file:// URL, so it cannot be used here.
const SOURCE = readFileSync(resolve(process.cwd(), 'consent.js'), 'utf8');

const GA_ID = 'G-3S8BY8VY3G';
const STORAGE_KEY = 'ci-consent';

/** Execute consent.js against the current jsdom document, as a <script> would. */
function boot() {
  new Function(SOURCE)();
}

/** Simulate a fresh page load: new document, same localStorage. */
function reload() {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete window.CrowConsent;
  delete window.dataLayer;
  delete window.__ciAnalyticsLoaded;
  delete window.__ciConsentSeeded;
  boot();
}

const banner = () => document.getElementById('ci-consent-root');
const gaScripts = () =>
  Array.from(document.querySelectorAll('script')).filter((s) =>
    (s.src || '').includes('googletagmanager.com')
  );
const click = (action) =>
  document.querySelector(`[data-ci-action="${action}"]`).click();
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY));

beforeEach(() => {
  window.localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete window.CrowConsent;
  delete window.dataLayer;
  delete window.__ciAnalyticsLoaded;
  delete window.__ciConsentSeeded;
});

describe('first visit', () => {
  it('shows the banner when no choice has been stored', () => {
    boot();
    expect(banner()).not.toBeNull();
    expect(banner().textContent).toContain('Cookies on this site');
  });

  it('offers accept, reject and preferences', () => {
    boot();
    for (const action of ['accept', 'reject', 'prefs']) {
      expect(document.querySelector(`[data-ci-action="${action}"]`)).not.toBeNull();
    }
  });

  it('links to the privacy policy', () => {
    boot();
    expect(banner().querySelector('a').getAttribute('href')).toBe('/privacy.html');
  });

  it('does NOT load Google Analytics before a choice is made', () => {
    boot();
    expect(gaScripts()).toHaveLength(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('defaults Consent Mode to denied without contacting Google', () => {
    boot();
    const defaults = window.dataLayer.find((a) => a[0] === 'consent' && a[1] === 'default');
    expect(defaults).toBeDefined();
    expect(defaults[2].analytics_storage).toBe('denied');
    expect(gaScripts()).toHaveLength(0);
  });
});

describe('rejecting', () => {
  it('stores the refusal, injects no analytics, and dismisses the banner', () => {
    boot();
    click('reject');

    expect(stored().analytics).toBe(false);
    expect(gaScripts()).toHaveLength(0);
    expect(banner()).toBeNull();
  });

  it('keeps analytics blocked on subsequent visits, with no banner', () => {
    boot();
    click('reject');
    reload();

    expect(gaScripts()).toHaveLength(0);
    expect(banner()).toBeNull();
  });
});

describe('accepting', () => {
  it('stores consent, injects the GA4 tag, and dismisses the banner', () => {
    boot();
    click('accept');

    expect(stored().analytics).toBe(true);
    expect(banner()).toBeNull();

    const scripts = gaScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain(`id=${GA_ID}`);
    expect(scripts[0].async).toBe(true);
  });

  it('configures the measurement id and grants consent', () => {
    boot();
    click('accept');

    const calls = window.dataLayer.map((a) => Array.from(a));
    expect(calls.some((c) => c[0] === 'config' && c[1] === GA_ID)).toBe(true);
    const update = calls.find((c) => c[0] === 'consent' && c[1] === 'update');
    expect(update[2].analytics_storage).toBe('granted');
  });

  it('loads analytics automatically on the next visit, with no banner', () => {
    boot();
    click('accept');
    reload();

    expect(gaScripts()).toHaveLength(1);
    expect(banner()).toBeNull();
  });

  it('never injects the tag twice', () => {
    boot();
    click('accept');
    window.CrowConsent.accept();

    expect(gaScripts()).toHaveLength(1);
  });
});

describe('preferences panel', () => {
  it('saves an opt-in when analytics is ticked', () => {
    boot();
    click('prefs');

    const toggle = document.getElementById('ci-consent-analytics');
    expect(toggle.checked).toBe(false); // opt-in, not opt-out
    toggle.checked = true;
    click('save');

    expect(stored().analytics).toBe(true);
    expect(gaScripts()).toHaveLength(1);
  });

  it('saves an opt-out when analytics is left unticked', () => {
    boot();
    click('prefs');
    click('save');

    expect(stored().analytics).toBe(false);
    expect(gaScripts()).toHaveLength(0);
  });

  it('shows strictly-necessary cookies as always on and not editable', () => {
    boot();
    click('prefs');

    const necessary = document.getElementById('ci-consent-necessary');
    expect(necessary.checked).toBe(true);
    expect(necessary.disabled).toBe(true);
  });
});

describe('withdrawing consent', () => {
  it('can be reopened after a choice was made', () => {
    boot();
    click('accept');
    expect(banner()).toBeNull();

    window.CrowConsent.open();
    expect(banner()).not.toBeNull();
    expect(document.getElementById('ci-consent-analytics').checked).toBe(true);
  });

  it('flips stored consent to false and blocks analytics on the next visit', () => {
    boot();
    click('accept');

    window.CrowConsent.open();
    click('reject');
    expect(stored().analytics).toBe(false);

    reload();
    expect(gaScripts()).toHaveLength(0);
    expect(banner()).toBeNull();
  });
});

describe('robustness', () => {
  it('exposes the stored decision through the public API', () => {
    boot();
    expect(window.CrowConsent.state()).toBeNull();
    click('accept');
    expect(window.CrowConsent.state().analytics).toBe(true);
  });

  it('re-asks and stays blocked when stored consent is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-json');
    boot();

    expect(banner()).not.toBeNull();
    expect(gaScripts()).toHaveLength(0);
  });

  it('re-asks when the stored consent version is outdated', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 0, analytics: true })
    );
    boot();

    expect(banner()).not.toBeNull();
    expect(gaScripts()).toHaveLength(0);
  });

  it('does not throw when localStorage is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage is disabled');
      }
    });

    try {
      expect(() => boot()).not.toThrow();
      expect(gaScripts()).toHaveLength(0);
    } finally {
      Object.defineProperty(window, 'localStorage', original);
    }
  });
});
