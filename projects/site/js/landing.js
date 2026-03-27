/* ============================================================
   LANDING PAGE — Rhetorical metaphors + lightbox
   ============================================================ */

(async function () {
  // Load and render rhetorical metaphor cards
  try {
    const resp = await fetch('data/metaphors.json');
    const allMet = await resp.json();
    const rhetorical = allMet.filter(m => m.rh);

    // Sort by confidence, but ensure invisible hand is included
    rhetorical.sort((a, b) => b.dc - a.dc);
    const top = rhetorical.slice(0, 10);
    const hasInvisible = top.some(m => m.s.toLowerCase().includes('invisible hand'));
    if (!hasInvisible) {
      const inv = rhetorical.find(m => m.s.toLowerCase().includes('invisible hand'));
      if (inv) { top.pop(); top.push(inv); }
    }

    const container = document.getElementById('rhetorical-cards');
    if (container) {
      top.forEach(m => {
        const card = document.createElement('div');
        card.className = 'met-card';

        // Highlight tokens in sentence
        let html = escapeHtml(m.s);
        const sorted = [...m.mt].sort((a, b) => b.length - a.length);
        sorted.forEach(tok => {
          const re = new RegExp(`\\b(${escapeRegex(tok)})\\b`, 'gi');
          html = html.replace(re, '<mark class="met-token">$1</mark>');
        });

        // Location
        const loc = [m.bl, m.cl].filter(Boolean).join(', ')
          .replace('Book Ii', 'Book II').replace('Book Iii', 'Book III')
          .replace('Book Iv', 'Book IV');

        card.innerHTML = `
          <div class="met-card-sentence">${html}</div>
          <div class="met-card-badges">
            <span class="met-badge-class">${m.mc}</span>
            ${m.sd ? `<span class="met-badge-domain">${m.sd}</span>` : ''}
            <span class="met-badge-loc">${loc}</span>
            <span class="met-badge-conf">conf ${m.dc.toFixed(3)}</span>
          </div>
        `;
        container.appendChild(card);
      });
    }
  } catch (e) {
    console.warn('Could not load metaphors:', e);
  }

  // Lightbox for viz images
  document.querySelectorAll('.viz-card img').forEach(img => {
    img.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'lightbox';
      overlay.innerHTML = `<button class="lightbox-close">&times;</button><img src="${img.src}" alt="${img.alt}">`;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.addEventListener('click', close);
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
      });
    });
  });
})();

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
