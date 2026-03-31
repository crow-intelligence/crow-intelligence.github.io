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

  // ── Load data ──
  async function loadData() {
    const promises = LEADERS.map(async (leader) => {
      const resp = await fetch(`data/${leader}.json`);
      DATA[leader] = await resp.json();
    });
    await Promise.all(promises);
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
        scales: {
          r: {
            min: scaleMin,
            max: scaleMax,
            ticks: { display: false, stepSize: 0.01 },
            grid: { color: "rgba(255,255,255,0.08)" },
            angleLines: { color: "rgba(255,255,255,0.08)" },
            pointLabels: {
              color: "#888880",
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

      opts.gaps.forEach((gap, i) => {
        const angle = scale.getIndexAngle(i) - Math.PI / 2;
        const r = scale.getDistanceFromCenterForValue(
          (gap.publicVal + gap.privateVal) / 2
        );
        const x = scale.xCenter + Math.cos(angle) * (r + 28);
        const y = scale.yCenter + Math.sin(angle) * (r + 28);

        ctx.save();
        ctx.font = '11px "Courier Prime", monospace';
        ctx.fillStyle = gap.significant ? COLORS.coral : COLORS.gray;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = `d=${Math.abs(gap.d).toFixed(2)}`;
        ctx.fillText(label, x, y);
        if (gap.significant) {
          ctx.fillText(gap.p < 0.001 ? "***" : gap.p < 0.01 ? "**" : "*", x, y + 13);
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

    // Leader radar progressive reveal
    if (step === "lincoln-1") showPublic("lincoln");
    if (step === "lincoln-2") showPrivate("lincoln");
    if (step === "lincoln-3") showGaps("lincoln");
    if (step === "lincoln-4") showWord("lincoln");

    if (step === "nixon-1") showPublic("nixon");
    if (step === "nixon-2") showPrivate("nixon");
    if (step === "nixon-3") showGaps("nixon");
    if (step === "nixon-4") showWord("nixon");

    if (step === "kissinger-1") showPublic("kissinger");
    if (step === "kissinger-2") showPrivate("kissinger");
    if (step === "kissinger-3") showGaps("kissinger");
    if (step === "kissinger-4") showWord("kissinger");

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

  // ── Radar lazy init ──
  function initRadarObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.dataset.leader;
            if (id && !charts[id]) {
              createRadar(`radar-${id}`, id);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".leader-radar-wrap").forEach((wrap) => {
      observer.observe(wrap);
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
  function initNavDots() {
    const sections = [
      "act-opening",
      "act-philosophy",
      "act-lincoln",
      "act-nixon",
      "act-kissinger",
      "act-conclusion",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            document.querySelectorAll(".nav-dot").forEach((dot) => {
              dot.classList.toggle("is-active", dot.dataset.section === id);
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // Click to scroll
    document.querySelectorAll(".nav-dot").forEach((dot) => {
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
    initRadarObserver();
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
