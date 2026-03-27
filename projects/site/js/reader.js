/* ============================================================
   READER — Load data, render text with layers, wire up toggles
   ============================================================ */

const BOOK_NAMES = {
  1: 'Book I', 2: 'Book II', 3: 'Book III', 4: 'Book IV', 5: 'Book V'
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX',
  'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

// Global data (accessible to search.js)
window.readerData = {
  sentences: null,
  chunks: null,
  topics: null,
  entities: null,
  metaphors: null,
};

(async function () {
  const main = document.getElementById('reader-main');
  const loading = document.getElementById('loading');

  // Load data
  const [sentences, chunks, topics, entityOccs, entitiesData] = await Promise.all([
    fetch('data/sentences.json').then(r => r.json()),
    fetch('data/chunks.json').then(r => r.json()),
    fetch('data/topics.json').then(r => r.json()),
    fetch('data/entity_occurrences.json').then(r => r.json()),
    fetch('data/entities.json').then(r => r.json()),
  ]);

  window.readerData.sentences = sentences;
  window.readerData.chunks = chunks;
  window.readerData.topics = topics;

  // Build topic color map + keyword map
  const topicColor = {};
  const topicKeywords = {};
  topics.forEach(t => {
    topicColor[t.id] = t.color;
    topicKeywords[t.id] = t.keywords || [];
  });

  // Build entity lookup by name -> {type, url}
  const entityByName = {};
  entityOccs.forEach(eo => {
    if (!entityByName[eo.e]) entityByName[eo.e] = eo.l;
  });

  // Build entity wiki info lookup
  const entityWiki = {};
  entitiesData.forEach(e => {
    entityWiki[e.name] = { url: e.url || '', type: e.type };
  });

  // Build chunk map: sorted by char_start
  const chunkList = chunks.sort((a, b) => a.cs - b.cs);

  // Build PageRank range for scaling
  let prMin = Infinity, prMax = -Infinity;
  sentences.forEach(s => {
    if (s.p < prMin) prMin = s.p;
    if (s.p > prMax) prMax = s.p;
  });
  const prRange = prMax - prMin || 1;

  // Group sentences by book and chapter
  const structure = {};
  sentences.forEach(s => {
    const bk = s.b || 0;
    const ch = s.c || 0;
    if (bk < 1) return; // skip TOC/preamble
    const key = `${bk}-${ch}`;
    if (!structure[key]) structure[key] = { book: bk, chapter: ch, sentences: [], topicId: s.ti };
    structure[key].sentences.push(s);
  });

  // Sort keys
  const sortedKeys = Object.keys(structure).sort((a, b) => {
    const [ab, ac] = a.split('-').map(Number);
    const [bb, bc] = b.split('-').map(Number);
    return ab !== bb ? ab - bb : ac - bc;
  });

  // Render
  loading.style.display = 'none';
  const frag = document.createDocumentFragment();
  let lastBook = -1;
  const tocNav = document.getElementById('toc-nav');

  // Find top entities by count for entity matching
  const entityNames = Object.keys(entityByName).sort((a, b) => b.length - a.length);

  sortedKeys.forEach(key => {
    const group = structure[key];
    const bk = group.book;
    const ch = group.chapter;

    if (!bk || bk < 1) return;

    // Book heading
    if (bk !== lastBook && bk > 0) {
      const h2 = document.createElement('h2');
      h2.className = 'book-heading';
      h2.id = `book-${bk}`;
      h2.textContent = BOOK_NAMES[bk] || `Book ${bk}`;
      frag.appendChild(h2);

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#book-${bk}`;
      a.className = 'toc-book';
      a.textContent = BOOK_NAMES[bk];
      li.appendChild(a);
      tocNav.appendChild(li);

      lastBook = bk;
    }

    // Chapter heading
    if (ch > 0 && bk > 0) {
      const h3 = document.createElement('h3');
      h3.className = 'chapter-heading';
      h3.id = `book-${bk}-ch-${ch}`;
      h3.textContent = `Chapter ${ROMAN[ch] || ch}`;
      frag.appendChild(h3);

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#book-${bk}-ch-${ch}`;
      a.textContent = `Ch. ${ROMAN[ch] || ch}`;
      li.appendChild(a);
      tocNav.appendChild(li);
    }

    // Chunk wrapper
    const chunkDiv = document.createElement('div');
    chunkDiv.className = 'chunk';
    const tid = group.sentences[0]?.ti ?? -1;
    const color = topicColor[tid] || '#666666';
    chunkDiv.dataset.topicColor = color;
    chunkDiv.style.setProperty('--chunk-bg', hexToRgba(color, 0.07));
    chunkDiv.style.borderLeftColor = color;

    // Topic badge
    const kw = topicKeywords[tid];
    if (kw && kw.length > 0) {
      const badge = document.createElement('div');
      badge.className = 'topic-badge';
      badge.innerHTML = `<div class="topic-dot" style="background:${color}"></div><span class="topic-kw">${kw[0]}</span>`;
      chunkDiv.appendChild(badge);
    }

    // Sentences
    group.sentences.forEach(s => {
      const span = createSentenceSpan(s, prMin, prRange, entityNames, entityByName, entityWiki);
      chunkDiv.appendChild(span);
      chunkDiv.appendChild(document.createTextNode(' '));
    });

    frag.appendChild(chunkDiv);
  });

  main.appendChild(frag);

  // Populate topics legend
  const legendTopics = document.getElementById('legend-topics');
  if (legendTopics) {
    topics.forEach(t => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<div class="legend-dot" style="background:${t.color}"></div><span>${t.keywords.slice(0, 2).join(', ')}</span>`;
      legendTopics.appendChild(item);
    });
  }

  // Layer toggles
  document.querySelectorAll('.layer-toggle input').forEach(cb => {
    cb.addEventListener('change', () => {
      const layer = cb.dataset.layer;
      document.body.classList.toggle(`layer-${layer}`, cb.checked);
    });
  });

  // Entity tooltip delegation
  document.addEventListener('mouseover', e => {
    const ent = e.target.closest('.ent');
    if (!ent) return;
    showTooltip(ent);
  });
  document.addEventListener('mouseout', e => {
    const ent = e.target.closest('.ent');
    if (!ent) return;
    hideTooltip();
  });
})();

function createSentenceSpan(s, prMin, prRange, entityNames, entityByName, entityWiki) {
  const span = document.createElement('span');
  span.className = 'sent';
  span.id = `s-${s.i}`;
  span.dataset.idx = s.i;

  // PageRank as CSS custom property for font scaling
  const prNorm = (s.p - prMin) / prRange;
  span.style.setProperty('--pr', prNorm.toFixed(4));

  // If sentence has metaphor tokens, wrap them
  if (s.m && s.mt && s.mt.length > 0) {
    span.innerHTML = highlightMetaphors(s.t, s.mt, s.mc);
  } else {
    span.textContent = s.t;
  }

  // Mark entities within the sentence text
  markEntities(span, s.t, entityNames, entityByName, entityWiki);

  return span;
}

function highlightMetaphors(text, tokens, metClass) {
  const cls = metClass || 'orientational';
  let result = text;
  const sorted = [...tokens].sort((a, b) => b.length - a.length);
  sorted.forEach(tok => {
    const re = new RegExp(`\\b(${escapeRegex(tok)})\\b`, 'gi');
    result = result.replace(re, `<span class="met-token ${cls}">$1</span>`);
  });
  return result;
}

function markEntities(span, text, entityNames, entityByName, entityWiki) {
  const html = span.innerHTML;
  const candidates = entityNames.filter(e => e.length >= 5 && text.includes(e));
  if (candidates.length === 0) return;

  let modified = html;
  const toMark = candidates.slice(0, 3);
  toMark.forEach(ent => {
    const type = entityByName[ent] || 'OTHER';
    const wiki = entityWiki[ent] || {};
    const wikiUrl = wiki.url || '';
    const safeEnt = escapeRegex(ent);
    const re = new RegExp(`(?<!<[^>]*)\\b(${safeEnt})\\b(?![^<]*>)`, 'g');
    modified = modified.replace(re,
      `<span class="ent" data-type="${type}" data-label="${type}" data-wiki-url="${wikiUrl}">$1</span>`
    );
  });

  if (modified !== html) {
    span.innerHTML = modified;
  }
}

function showTooltip(el) {
  hideTooltip();
  const tip = document.createElement('div');
  tip.className = 'entity-tooltip';
  tip.id = 'active-tooltip';
  const label = el.dataset.label || '';
  const name = el.textContent;
  const url = el.dataset.wikiUrl || '';
  tip.innerHTML = `
    <div class="tooltip-type">${label}</div>
    <div class="tooltip-name">${name}</div>
    ${url ? `<a class="tooltip-link" href="${url}" target="_blank">Wikipedia &rarr;</a>` : ''}
  `;
  el.appendChild(tip);
}

function hideTooltip() {
  const tip = document.getElementById('active-tooltip');
  if (tip) tip.remove();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Scroll to sentence helper (used by search)
window.scrollToSentence = function (idx) {
  const el = document.getElementById(`s-${idx}`);
  if (!el) return;
  document.querySelectorAll('.sent.highlight').forEach(s => s.classList.remove('highlight'));
  el.classList.add('highlight');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
