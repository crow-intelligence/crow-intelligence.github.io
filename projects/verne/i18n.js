/* Every user-facing string comes from data/strings.json, never from the markup.
 *
 * The table is built in Python (src/verne80/strings.py) so that a test can assert the
 * things that break a page silently: markup smuggled into a value, a blank, a
 * placeholder whose brace never closes. tests/test_web_page.py adds the other half —
 * that every key defined is a key used, and every key used is a key defined.
 *
 * The page is English and there is no second language. What was here before was a
 * language ladder (?lang=, localStorage, navigator.language) and a per-key fallback with
 * one warning each, all of it serving an empty Hungarian catalogue. It is gone. If a
 * translation is ever wanted, this is the file that grows it back.
 */

let strings = {};

/** Take the table the page just fetched. */
export function useStrings(payload) {
  strings = payload.strings || {};
  document.documentElement.lang = payload.language || "en";
}

/**
 * One string, with its {placeholders} filled.
 *
 * Placeholders are named rather than positional, which is what lets a sentence be
 * rewritten without touching the call site.
 */
export function t(key, values = {}) {
  const text = strings[key];
  if (text === undefined) {
    console.warn(`strings: no entry for ${key}`);
    return key;
  }
  return text.replace(/\{(\w+)\}/g, (whole, name) =>
    name in values ? String(values[name]) : whole,
  );
}

/**
 * Fill every [data-i18n] node in the document.
 *
 * Sets textContent, never innerHTML — which is why no string is allowed to carry markup,
 * and why a sentence needing an emphasis is either split in two or written without one.
 * `data-i18n-attr` handles the places where the text is an attribute instead: a meta
 * description, an aria-label.
 */
export function localise(root = document) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-label]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nLabel));
  }
  for (const node of root.querySelectorAll("[data-i18n-content]")) {
    node.setAttribute("content", t(node.dataset.i18nContent));
  }
}
