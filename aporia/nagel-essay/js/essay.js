/* ── Nagel Index Scrollytelling Essay ── */

(function () {
  "use strict";

  // ── Data ──
  let DATA = {};
  const LEADERS = ["lincoln", "nixon", "kissinger"];
  const TRAITS = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"];
  const COLORS = {
    public: "#3B8BD4",
    publicBg: "rgba(59, 139, 212, 0.12)",
    private: "#BA7517",
    privateBg: "rgba(186, 117, 23, 0.12)",
    coral: "#D85A30",
    gray: "#888880",
  };

  // ── Charts ──
  const charts = {};
  const virtueCharts = {};
  let virtueMaxAcross = 1;
  const VIRTUE_DELTA_THRESHOLD = 0.3; // hits/1000w; |Δ| at or above this reads as a real shift

  // ── Load data ──
  let VIRTUE_CORR = null;
  async function loadData() {
    const promises = LEADERS.map(async (leader) => {
      const resp = await fetch(`data/${leader}.json`);
      DATA[leader] = await resp.json();
    });
    const corrPromise = fetch("data/virtue_correlation.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (VIRTUE_CORR = j))
      .catch(() => (VIRTUE_CORR = null));
    await Promise.all([...promises, corrPromise]);
  }

  // ── Create radar chart ──
  function createRadar(canvasId, leader) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const d = DATA[leader];
    const publicVals = TRAITS.map((t) => d.traits[t].public);
    const privateVals = TRAITS.map((t) => d.traits[t].private);

    // Compute nice scale bounds
    const allVals = [...publicVals, ...privateVals];
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const padding = 0.03;
    const scaleMin = Math.max(0, Math.floor((minVal - padding) * 20) / 20);
    const scaleMax = Math.min(1, Math.ceil((maxVal + padding) * 20) / 20);

    const chart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: TRAITS,
        datasets: [
          {
            label: "Public voice",
            data: publicVals,
            borderColor: COLORS.public,
            backgroundColor: COLORS.publicBg,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: COLORS.public,
            hidden: true,
          },
          {
            label: "Private voice",
            data: privateVals,
            borderColor: COLORS.private,
            backgroundColor: COLORS.privateBg,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: COLORS.private,
            hidden: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800, easing: "easeInOutQuart" },
        // Minimal padding — let Big Five take all the canvas it can, since
        // its long axis labels (Conscientiousness, Neuroticism, etc.) shrink
        // the polygon disproportionately. We compensate on the virtue side
        // with much larger padding so the two polygons match visually.
        layout: { padding: { left: 18, right: 18, top: 0, bottom: 0 } },
        scales: {
          r: {
            min: scaleMin,
            max: scaleMax,
            ticks: { display: false, stepSize: 0.01 },
            grid: { color: "rgba(255,255,255,0.08)" },
            angleLines: { color: "rgba(255,255,255,0.08)" },
            pointLabels: {
              color: "#888880",
              padding: 8,
              font: { family: "'Courier Prime', monospace", size: 11 },
            },
          },
        },
        plugins: {
          legend: { display: false },
          gapAnnotation: { show: false, gaps: [] },
        },
      },
      plugins: [gapAnnotationPlugin],
    });

    charts[leader] = chart;
    return chart;
  }

  // ── Gap annotation plugin ──
  const gapAnnotationPlugin = {
    id: "gapAnnotation",
    afterDraw(chart) {
      const opts = chart.options.plugins.gapAnnotation;
      if (!opts || !opts.show) return;

      const ctx = chart.ctx;
      const scale = chart.scales.r;

      const outerR = scale.getDistanceFromCenterForValue(scale.max);

      opts.gaps.forEach((gap, i) => {
        const angle = scale.getIndexAngle(i) - Math.PI / 2;
        // Place inside the polygon at the midpoint between center and the
        // data-pair midpoint, so we never collide with axis labels outside.
        const r = scale.getDistanceFromCenterForValue(
          (gap.publicVal + gap.privateVal) / 2
        );
        const innerR = outerR * 0.5;
        const x = scale.xCenter + Math.cos(angle) * innerR;
        const y = scale.yCenter + Math.sin(angle) * innerR;

        ctx.save();
        ctx.font = '10px "Courier Prime", monospace';
        ctx.fillStyle = gap.significant ? COLORS.coral : COLORS.gray;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = `d=${Math.abs(gap.d).toFixed(2)}`;
        ctx.fillText(label, x, y);
        if (gap.significant) {
          ctx.fillText(gap.p < 0.001 ? "***" : gap.p < 0.01 ? "**" : "*", x, y + 11);
        }
        ctx.restore();
      });
    },
  };

  // ── Show/hide datasets ──
  function showPublic(leader) {
    const chart = charts[leader];
    if (!chart) return;
    chart.data.datasets[0].hidden = false;
    chart.update();
  }

  function showPrivate(leader) {
    const chart = charts[leader];
    if (!chart) return;
    chart.data.datasets[1].hidden = false;
    chart.update();
  }

  function showGaps(leader) {
    const chart = charts[leader];
    if (!chart) return;
    const d = DATA[leader];
    const gaps = TRAITS.map((t) => ({
      d: d.traits[t].cohens_d,
      p: d.traits[t].p_value,
      significant: d.traits[t].significant,
      publicVal: d.traits[t].public,
      privateVal: d.traits[t].private,
    }));
    chart.options.plugins.gapAnnotation = { show: true, gaps };
    chart.update();

    // Show badge
    const badge = document.querySelector(`#${leader}-badge`);
    if (badge) badge.classList.add("is-visible");
  }

  function showWord(leader) {
    const word = document.querySelector(`#${leader}-word`);
    if (word) word.classList.add("is-visible");

    // Dim the chart
    const chart = charts[leader];
    if (chart) {
      chart.data.datasets[0].borderColor = "rgba(59, 139, 212, 0.35)";
      chart.data.datasets[0].backgroundColor = "rgba(59, 139, 212, 0.05)";
      chart.data.datasets[1].borderColor = "rgba(186, 117, 23, 0.35)";
      chart.data.datasets[1].backgroundColor = "rgba(186, 117, 23, 0.05)";
      chart.update();
    }
  }

  // ── Virtue chart progressive reveal (mirrors Big Five) ──
  function showVirtuePublic(leader) {
    const chart = virtueCharts[leader];
    if (!chart) return;
    chart.data.datasets[0].hidden = false;
    chart.update();
  }

  function showVirtuePrivate(leader) {
    const chart = virtueCharts[leader];
    if (!chart) return;
    chart.data.datasets[1].hidden = false;
    chart.update();
  }

  function showVirtueGaps(leader) {
    const chart = virtueCharts[leader];
    if (!chart) return;
    const data = DATA[leader] && DATA[leader].virtues;
    if (!data) return;
    const gaps = data.virtues.map((v) => {
      const pub = data.public[v] || 0;
      const prv = data.private[v] || 0;
      const delta = prv - pub;
      return {
        delta,
        significant: Math.abs(delta) >= VIRTUE_DELTA_THRESHOLD,
        publicVal: pub,
        privateVal: prv,
      };
    });
    chart.options.plugins.virtueGapAnnotation = { show: true, gaps };
    chart.update();

    // Aggregate virtue-gap badge: mean of |Δ| across the six virtues, in the
    // same spirit as the Big Five Nagel Gap Score (mean of |d|).
    const meanAbsDelta =
      gaps.reduce((s, g) => s + Math.abs(g.delta), 0) / Math.max(1, gaps.length);
    const badge = document.querySelector(`#${leader}-virtue-badge`);
    if (badge) {
      const scoreEl = badge.querySelector("[data-virtue-aggregate]");
      if (scoreEl) scoreEl.textContent = meanAbsDelta.toFixed(2);
      badge.classList.add("is-visible");
    }
  }

  function dimVirtues(leader) {
    const chart = virtueCharts[leader];
    if (!chart) return;
    chart.data.datasets[0].borderColor = "rgba(59, 139, 212, 0.35)";
    chart.data.datasets[0].backgroundColor = "rgba(59, 139, 212, 0.05)";
    chart.data.datasets[1].borderColor = "rgba(186, 117, 23, 0.35)";
    chart.data.datasets[1].backgroundColor = "rgba(186, 117, 23, 0.05)";
    chart.update();
  }

  // ── Act VI: Virtues ──────────────────────────────────────────────────
  const VIRTUE_LABELS = {
    prudence: "Prudence",
    justice: "Justice",
    courage: "Courage",
    temperance: "Temperance",
    truthfulness: "Truthfulness",
    magnanimity: "Magnanimity",
  };

  // ── Virtue gap annotation plugin (Δ labels per axis) ──
  const virtueGapAnnotationPlugin = {
    id: "virtueGapAnnotation",
    afterDraw(chart) {
      const opts = chart.options.plugins.virtueGapAnnotation;
      if (!opts || !opts.show) return;
      const ctx = chart.ctx;
      const scale = chart.scales.r;

      const outerR = scale.getDistanceFromCenterForValue(scale.max);

      opts.gaps.forEach((gap, i) => {
        const angle = scale.getIndexAngle(i) - Math.PI / 2;
        const r = scale.getDistanceFromCenterForValue(
          (gap.publicVal + gap.privateVal) / 2
        );
        const innerR = outerR * 0.5;
        const x = scale.xCenter + Math.cos(angle) * innerR;
        const y = scale.yCenter + Math.sin(angle) * innerR;

        ctx.save();
        ctx.font = '10px "Courier Prime", monospace';
        ctx.fillStyle = gap.significant ? COLORS.coral : COLORS.gray;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const sign = gap.delta >= 0 ? "+" : "−";
        const label = `Δ ${sign}${Math.abs(gap.delta).toFixed(2)}`;
        ctx.fillText(label, x, y);
        ctx.restore();
      });
    },
  };

  function buildVirtueRadars() {
    // Shared scale across the three featured figures so the polar charts are
    // directly comparable when read in sequence.
    virtueMaxAcross = (() => {
      let m = 0;
      LEADERS.forEach((l) => {
        const v = DATA[l] && DATA[l].virtues;
        if (!v) return;
        Object.values(v.public).forEach((x) => (m = Math.max(m, x)));
        Object.values(v.private).forEach((x) => (m = Math.max(m, x)));
      });
      return Math.max(1, Math.ceil(m * 10) / 10 + 0.5);
    })();

    LEADERS.forEach((leader) => {
      const data = DATA[leader] && DATA[leader].virtues;
      if (!data) return;
      const ctx = document.getElementById(`virtue-radar-${leader}`);
      if (!ctx) return;

      const virtues = data.virtues;
      const labels = virtues.map((v) => VIRTUE_LABELS[v] || v);
      const publicRates = virtues.map((v) => data.public[v] || 0);
      const privateRates = virtues.map((v) => data.private[v] || 0);

      const chart = new Chart(ctx, {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Public voice",
              data: publicRates,
              borderColor: COLORS.public,
              backgroundColor: COLORS.publicBg,
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: COLORS.public,
              hidden: true,
            },
            {
              label: "Private voice",
              data: privateRates,
              borderColor: COLORS.private,
              backgroundColor: COLORS.privateBg,
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: COLORS.private,
              hidden: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: { duration: 800, easing: "easeInOutQuart" },
          // Shrink the virtue polygon to match the Big Five polygon. Big
          // Five has long axis labels (Conscientiousness, Neuroticism) that
          // automatically shrink its polygon; virtues have shorter labels
          // and would otherwise render visibly larger. The asymmetric extra
          // padding here compensates.
          layout: { padding: { left: 30, right: 30, top: 22, bottom: 22 } },
          scales: {
            r: {
              min: 0,
              max: virtueMaxAcross,
              ticks: { display: false, stepSize: 1 },
              grid: { color: "rgba(255,255,255,0.08)" },
              angleLines: { color: "rgba(255,255,255,0.08)" },
              pointLabels: {
                color: "#888880",
                padding: 8,
                font: { family: "'Courier Prime', monospace", size: 11 },
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => ` ${c.dataset.label}: ${c.parsed.r.toFixed(2)} / 1000w`,
              },
            },
            virtueGapAnnotation: { show: false, gaps: [] },
          },
        },
        plugins: [virtueGapAnnotationPlugin],
      });

      virtueCharts[leader] = chart;
    });

    // Commentary sprinkles: pull n and top-|rho| from the pooled correlation
    if (VIRTUE_CORR && VIRTUE_CORR.pooled) {
      const pooled = VIRTUE_CORR.pooled;
      const nEl = document.getElementById("virtue-corr-n");
      if (nEl) nEl.textContent = `n = ${pooled.n_chunks.toLocaleString()}`;

      const rows = pooled.correlations || {};
      let strongest = { rho: 0, p: 1 };
      for (const v of Object.keys(rows)) {
        const c = (rows[v] || {}).Conscientiousness;
        if (c && Math.abs(c.rho) > Math.abs(strongest.rho)) strongest = c;
      }
      const topEl = document.getElementById("virtue-corr-top");
      if (topEl && strongest.rho) {
        topEl.textContent = `\u03C1 = +${strongest.rho.toFixed(2)}`;
      }
    }
  }

  // ── Scrollama step handlers ──
  function handleStepEnter(el) {
    el.classList.add("is-active");
    const step = el.dataset.step;
    if (!step) return;

    // Philosophy diagram states
    const diagram = document.querySelector(".circle-diagram");
    if (step === "phil-1" && diagram) diagram.dataset.state = "default";
    if (step === "phil-2" && diagram) diagram.dataset.state = "surface";
    if (step === "phil-3" && diagram) diagram.dataset.state = "surface";
    if (step === "phil-4" && diagram) diagram.dataset.state = "pulse";
    if (step === "phil-5" && diagram) diagram.dataset.state = "gap";

    // Leader radar progressive reveal — Big Five (left) and Virtues (right) in lockstep
    const m = /^(lincoln|nixon|kissinger)-(\d)$/.exec(step);
    if (m) {
      const leader = m[1];
      const n = m[2];
      if (n === "1") { showPublic(leader);  showVirtuePublic(leader); }
      if (n === "2") { showPrivate(leader); showVirtuePrivate(leader); }
      if (n === "3") { showGaps(leader);    showVirtueGaps(leader); }
      if (n === "4") { showWord(leader);    dimVirtues(leader); }
    }

    // Act VI cards stagger
    if (step === "spectrum") {
      const cards = document.querySelectorAll(".spectrum-card");
      cards.forEach((card, i) => {
        setTimeout(() => card.classList.add("is-visible"), i * 250);
      });
    }
  }

  function handleStepExit(el) {
    // Keep active state — don't remove on scroll back for cleaner UX
  }

  // ── Portrait lazy visibility ──
  function initPortraitObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll(".portrait-hero img").forEach((img) => {
      observer.observe(img);
    });
  }

  // ── Radar eager init ──
  // Build all radars up front so the per-step transitions (showPublic,
  // showPrivate, showGaps, showWord) always have a chart to animate, even if
  // scrollama fires the first step before an IntersectionObserver would.
  function initRadarsEager() {
    LEADERS.forEach((id) => {
      if (!charts[id]) createRadar(`radar-${id}`, id);
    });
  }

  // ── Opening animation ──
  function initOpeningObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-active");
          }
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll(".opening-question, .opening-frame").forEach((el) => {
      observer.observe(el);
    });
  }

  // ── Navigation dots ──
  // IntersectionObserver with a threshold ratio stalls on tall sections
  // (each leader section is 3–4k px, so the 30% crossing point only fires
  // near the middle). Instead, track scroll position continuously and mark
  // whichever section's top has passed the viewport's upper third as active.
  function initNavDots() {
    const sectionIds = [
      "act-opening",
      "act-philosophy",
      "act-lincoln",
      "act-nixon",
      "act-kissinger",
      "act-virtues",
      "act-conclusion",
      "act-limitations",
      "act-methods",
    ];

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const dots = Array.from(document.querySelectorAll(".nav-dot"));

    function setActive(id) {
      dots.forEach((dot) => {
        dot.classList.toggle("is-active", dot.dataset.section === id);
      });
    }

    function update() {
      const anchor = window.innerHeight * 0.33; // upper-third line
      let currentId = sections[0].id;
      for (const sec of sections) {
        const top = sec.getBoundingClientRect().top;
        if (top - anchor <= 0) currentId = sec.id;
        else break;
      }
      setActive(currentId);
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();

    // Click to scroll
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const target = document.getElementById(dot.dataset.section);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  // ── Accessible data tables ──
  function buildAccessibleTables() {
    LEADERS.forEach((leader) => {
      const container = document.getElementById(`sr-table-${leader}`);
      if (!container) return;
      const d = DATA[leader];
      let html = `<table><caption>${d.name} Big Five Personality Scores</caption>`;
      html += "<thead><tr><th>Trait</th><th>Public</th><th>Private</th><th>Cohen's d</th><th>p-value</th></tr></thead><tbody>";
      TRAITS.forEach((t) => {
        const tr = d.traits[t];
        html += `<tr><td>${t}</td><td>${tr.public.toFixed(3)}</td><td>${tr.private.toFixed(3)}</td><td>${tr.cohens_d.toFixed(2)}</td><td>${tr.p_value.toFixed(3)}</td></tr>`;
      });
      html += "</tbody></table>";
      container.innerHTML = html;
    });
  }

  // ── Init ──
  async function init() {
    await loadData();

    // Scrollama
    const scroller = scrollama();
    scroller
      .setup({
        step: ".scroll-step",
        offset: 0.5,
        debug: false,
      })
      .onStepEnter((response) => handleStepEnter(response.element))
      .onStepExit((response) => handleStepExit(response.element));

    window.addEventListener("resize", scroller.resize);

    initOpeningObserver();
    initPortraitObserver();
    initRadarsEager();
    buildVirtueRadars();
    initNavDots();
    buildAccessibleTables();
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
