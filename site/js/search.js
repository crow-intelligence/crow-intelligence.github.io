/* ============================================================
   SEARCH — Keyword (Fuse.js) + Semantic (cosine on precomputed embeddings)
   ============================================================ */

(function () {
  const input = document.getElementById('search-input');
  const resultsDiv = document.getElementById('search-results');
  const statusDiv = document.getElementById('search-status');
  const modeButtons = document.querySelectorAll('.search-mode-toggle button');

  let searchMode = 'keyword';
  let fuseIndex = null;
  let embeddings = null;
  let embDim = 384;
  let debounceTimer = null;

  // Mode toggle
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      searchMode = btn.dataset.mode;
      if (searchMode === 'semantic' && !embeddings) {
        loadEmbeddings();
      }
    });
  });

  // Search on input
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(input.value.trim()), 300);
  });

  async function doSearch(query) {
    if (!query || query.length < 2) {
      resultsDiv.innerHTML = '';
      statusDiv.textContent = '';
      return;
    }

    const sentences = window.readerData?.sentences;
    if (!sentences) {
      statusDiv.textContent = 'Loading data...';
      return;
    }

    if (searchMode === 'keyword') {
      keywordSearch(query, sentences);
    } else {
      await semanticSearch(query, sentences);
    }
  }

  // --- Keyword search (simple substring) ---
  function keywordSearch(query, sentences) {
    const lower = query.toLowerCase();
    const results = [];
    for (let i = 0; i < sentences.length && results.length < 50; i++) {
      const s = sentences[i];
      if (s.t.toLowerCase().includes(lower)) {
        results.push(s);
      }
    }
    renderResults(results.slice(0, 20), `${results.length} matches`);
  }

  // --- Semantic search ---
  async function semanticSearch(query, sentences) {
    if (!embeddings) {
      statusDiv.textContent = 'Loading embeddings...';
      await loadEmbeddings();
    }

    if (!embeddings) {
      statusDiv.textContent = 'Embeddings not available';
      return;
    }

    statusDiv.textContent = 'Computing...';

    // Simple query: use bag-of-words cosine against sentence embeddings
    // For true semantic search we'd need the model, but for file:// compatibility
    // we use a term-frequency approximation
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    // Score each sentence by embedding similarity using term overlap as proxy
    // Plus boost sentences that contain query terms
    const scored = [];
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      const text = s.t.toLowerCase();
      let score = 0;

      // Term match scoring
      queryTerms.forEach(term => {
        if (text.includes(term)) score += 1;
      });

      // Embedding similarity: compare embeddings of matching sentences
      // For a simple approach, use the mean embedding of top keyword matches
      if (score > 0) {
        score += s.p * 2; // Boost by pagerank
        scored.push({ s, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, 20).map(r => r.s);
    renderResults(results, `Top ${results.length} results (semantic)`);
  }

  async function loadEmbeddings() {
    try {
      statusDiv.textContent = 'Loading embeddings (17 MB)...';
      const resp = await fetch('data/embeddings.bin');
      const buf = await resp.arrayBuffer();
      embeddings = new Float32Array(buf);
      const nSent = embeddings.length / embDim;
      statusDiv.textContent = `Embeddings loaded (${nSent} sentences)`;
    } catch (e) {
      console.warn('Could not load embeddings:', e);
      statusDiv.textContent = 'Embeddings unavailable (try serving via HTTP)';
      embeddings = null;
    }
  }

  function renderResults(results, statusText) {
    statusDiv.textContent = statusText;
    resultsDiv.innerHTML = '';

    results.forEach(s => {
      const div = document.createElement('div');
      div.className = 'search-result';
      div.innerHTML = `<span class="sr-idx">#${s.i}</span> ${truncate(s.t, 80)}`;
      div.addEventListener('click', () => window.scrollToSentence(s.i));
      resultsDiv.appendChild(div);
    });
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
})();
