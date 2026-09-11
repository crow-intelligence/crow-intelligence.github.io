import Graph from "./vendor/graphology.esm.js";
import forceAtlas2 from "./vendor/forceatlas2.esm.js";

/* Parlamonitor dashboard.
 *
 * Forms follow the data's job, not habit:
 *  - "where does this MP sit" is a comparison against a population, so it is a
 *    percentile strip with the population visible (emphasis), NOT a radar. A
 *    radar encodes magnitude as radius, so area grows as the square and a 2x
 *    score reads as 4x; its axis order is arbitrary and changes the silhouette;
 *    and it cannot show 88 comparators at once.
 *  - an ordered sentiment scale is a diverging stacked bar centred on neutral.
 *  - topic x metric is a heatmap, on per-column z-scores so one diverging ramp
 *    serves every column and 0 always means "the ciklus average".
 *  - the network is a force layout.
 *
 * Colour follows the entity: a faction keeps its slot whatever is filtered.
 */
const T = {
  metrics: {
    readability_lix:      { hu: "Olvashatóság (LIX)",        hint: "hosszú szavak hosszú mondatokban" },
    syntax_mdd:           { hu: "Függőségi távolság (MDD)",  hint: "milyen messze van egy szó a fejétől — memóriaterhelés" },
    syntax_mhd:           { hu: "Hierarchikus mélység (MHD)", hint: "milyen mély az elemzési fa" },
    diversity_mattr:      { hu: "Szókincs (MATTR)",          hint: "magasabb = változatosabb" },
    loanword_ratio:       { hu: "Idegen szavak aránya",      hint: "ritka idegen eredetű lemmák, tulajdonnevek nélkül" },
    words_per_sentence:   { hu: "Szó / mondat",              hint: "" },
    sentiment_polarity:   { hu: "Hangulat",                  hint: "a talált érzelmi szavak egyensúlya, −1 … +1" },
    emotion_anger:        { hu: "Düh",                       hint: "találat / 1000 szó" },
    emotion_disgust:      { hu: "Undor",                     hint: "találat / 1000 szó" },
    emotion_fear:         { hu: "Félelem",                   hint: "találat / 1000 szó" },
    emotion_joy:          { hu: "Öröm",                      hint: "találat / 1000 szó" },
    emotion_sadness:      { hu: "Szomorúság",                hint: "találat / 1000 szó" },
    emotion_surprise:     { hu: "Meglepődés",                hint: "találat / 1000 szó" },
    laughter_per_minute:  { hu: "Derültség / perc",          hint: "amit kiváltott" },
    applause_per_minute:  { hu: "Taps / perc",               hint: "amit kiváltott" },
    virtue_prudence:      { hu: "Okosság, megfontoltság",    hint: "említés / 1000 szó" },
    virtue_justice:       { hu: "Igazságosság",              hint: "említés / 1000 szó" },
    virtue_courage:       { hu: "Bátorság",                  hint: "említés / 1000 szó" },
    virtue_temperance:    { hu: "Mértékletesség",            hint: "említés / 1000 szó" },
    virtue_truthfulness:  { hu: "Igazmondás",                hint: "említés / 1000 szó" },
    virtue_magnanimity:   { hu: "Nagylelkűség",              hint: "hála, alázat, közösségi elköteleződés" },
    heckles_received:     { hu: "Kapott közbeszólás",        hint: "amit kapott, míg beszélt" },
    heckles_given:        { hu: "Adott közbeszólás",         hint: "amivel másokat szakított félbe" }
  },
  sentiment: ["nagyon negatív", "negatív", "semleges", "pozitív", "nagyon pozitív"],
  emotions:  { anger: "düh", joy: "öröm", sadness: "szomorúság", fear: "félelem" },
  heat: {
    sentiment_polarity: "Hangulat", emotion_anger: "Düh", emotion_joy: "Öröm",
    lix: "LIX", mdd: "MDD", loanword_ratio: "Idegen sz.", mattr: "Szókincs",
    reaction_applause_per_hour: "Taps/ó", reaction_laughter_per_hour: "Derültség/ó",
    reaction_heckling_per_hour: "Közbeszólás/ó", reaction_bell_per_hour: "Csengő/ó"
  }
};

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];
const tip = document.getElementById("tip");
/* d3's colour interpolators cannot parse a CSS `var(...)` string -- a scale
 * given one silently produces black. Anywhere a scale interpolates (as opposed
 * to assigning a colour straight to an attribute), resolve the variable to its
 * computed value first. */
const cssVar = name =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v))
  ? "—" : Number(v).toLocaleString("hu-HU", { maximumFractionDigits: d });

let DATA, factionColour, state = { mp: null, party: "—" };

function showTip(html, event) {
  tip.innerHTML = html;
  tip.style.opacity = 1;
  const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = event.clientX + pad, y = event.clientY + pad;
  if (x + w > innerWidth - 8) x = event.clientX - w - pad;
  if (y + h > innerHeight - 8) y = event.clientY - h - pad;
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
const hideTip = () => { tip.style.opacity = 0; };

/* ------------------------------------------------------------------ boot */
d3.json("data/dashboard.json").then(data => {
  DATA = data;
  const factions = data.parties.map(p => p.faction);
  // Fixed order, assigned once: filtering must never repaint the survivors.
  factionColour = f => {
    const i = factions.indexOf(f);
    return i >= 0 ? SERIES[i % SERIES.length] : "var(--neutral)";
  };
  buildControls();
  buildTabs();
  renderProfile();
  renderTopics();
  renderTopicMp();
  renderNetwork();
});

function selectView(view) {
  const buttons = [...document.querySelectorAll(".tab[data-view]")];
  if (!buttons.some(b => b.dataset.view === view)) return;
  buttons.forEach(b => b.setAttribute("aria-selected", String(b.dataset.view === view)));
  document.querySelectorAll("[data-panel]").forEach(p =>
    p.classList.toggle("hidden", p.dataset.panel !== view));
}

function buildTabs() {
  // Hash routing, so the header nav and a pasted link both land on the right
  // panel instead of scrolling to a hidden one.
  document.querySelectorAll(".tab[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      history.replaceState(null, "", "#" + btn.dataset.view);
      selectView(btn.dataset.view);
    });
  });
  addEventListener("hashchange", () => selectView(location.hash.slice(1)));
  if (location.hash) selectView(location.hash.slice(1));
  const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
  document.getElementById("theme").addEventListener("click", () => {
    const set = document.documentElement.getAttribute("data-theme");
    const dark = set ? set === "dark" : prefersDark();
    document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
    // The heatmap resolves CSS variables to real colours for interpolation, so
    // it has to be rebuilt when the theme changes; the network reads them too.
    renderTopics(); renderNetwork();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!document.documentElement.getAttribute("data-theme")) {
      renderTopics(); renderNetwork();
    }
  });
}

function buildControls() {
  const eligible = DATA.people
    .filter(p => !p.below_min_speeches && p.speaker)
    .sort((a, b) => d3.descending(a.speeches, b.speeches));
  state.mp = eligible[0].speaker_id;

  const mpSel = document.getElementById("pick-mp");
  mpSel.innerHTML = eligible.map(p =>
    `<option value="${p.speaker_id}">${p.speaker} — ${p.faction ?? "nincs frakció"} (${p.speeches})</option>`
  ).join("");
  mpSel.addEventListener("change", e => { state.mp = e.target.value; renderProfile(); });

  const partySel = document.getElementById("pick-party");
  partySel.innerHTML = `<option>—</option>` +
    DATA.parties.map(p => `<option>${p.faction}</option>`).join("");
  partySel.addEventListener("change", e => { state.party = e.target.value; renderProfile(); });
}

/* -------------------------------------------------------------- profile */
function renderProfile() {
  const person = DATA.people.find(p => p.speaker_id === state.mp);
  if (!person) return;
  const party = state.party !== "—" ? state.party : person.faction;

  document.getElementById("kpis").innerHTML = [
    ["Felszólalás", fmt(person.speeches, 0), `${fmt(person.minutes, 0)} perc`],
    ["Olvashatóság", fmt(person.lix_word_weighted, 1), "LIX, szóval súlyozva"],
    ["Hangulat", fmt(person.sentiment_polarity, 3), "szótári egyensúly, −1 … +1"],
    ["Derültség", fmt(person.laughter, 0), `${fmt(person.laughter_per_minute, 3)} / perc`],
    ["Taps", fmt(person.applause, 0), `${fmt(person.applause_per_minute, 3)} / perc`],
    ["Kapott közbeszólás", fmt(person.heckles_received, 0), `${fmt(person.hecklers, 0)} különböző embertől`],
    ["Adott közbeszólás", fmt(person.heckles_given, 0), `${fmt(person.targets, 0)} különböző célpontra`]
  ].map(([k, v, s]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join("");

  drawStrips(person, party);
  renderVirtues();
  drawTopicMix(person);
}

function drawStrips(person, party) {
  const host = d3.select("#strips").html("");
  const keys = Object.keys(DATA.distributions);
  const W = Math.min(880, host.node().clientWidth || 880), LABEL = 190, R = 16;

  keys.forEach(key => {
    const dist = DATA.distributions[key];
    const meta = T.metrics[key] || { hu: key, hint: "" };
    const values = dist.values;
    const x = d3.scaleLinear()
      .domain(d3.extent(values, d => d.v)).nice()
      .range([LABEL + 10, W - 74]);

    const mine = values.find(d => d.id === person.speaker_id);
    const peers = party
      ? values.filter(d => (DATA.people.find(p => p.speaker_id === d.id) || {}).faction === party)
      : [];
    const median = peers.length ? d3.median(peers, d => d.v) : null;
    const pct = mine
      ? Math.round(100 * values.filter(d => d.v <= mine.v).length / values.length)
      : null;

    const svg = host.append("svg").attr("width", W).attr("height", R * 2 + 6)
      .attr("role", "img")
      .attr("aria-label", `${meta.hu}: ${mine ? fmt(mine.v, 3) : "nincs adat"}`);

    svg.append("text").attr("x", 0).attr("y", R + 4)
      .attr("fill", "var(--text-primary)").style("font-size", "12.5px")
      .text(meta.hu);
    svg.append("text").attr("x", 0).attr("y", R + 17)
      .attr("fill", "var(--text-muted)").style("font-size", "10.5px")
      .text(meta.hint);

    // axis rule, hairline and recessive
    svg.append("line").attr("x1", x.range()[0]).attr("x2", x.range()[1])
      .attr("y1", R).attr("y2", R).attr("stroke", "var(--grid)").attr("stroke-width", 1);

    svg.selectAll("circle.pop").data(values).join("circle").attr("class", "pop")
      .attr("cx", d => x(d.v)).attr("cy", R).attr("r", 3.5)
      .attr("fill", "var(--dot-population)").attr("opacity", .55);

    if (median !== null) {
      svg.append("line").attr("x1", x(median)).attr("x2", x(median))
        .attr("y1", R - 9).attr("y2", R + 9)
        .attr("stroke", factionColour(party)).attr("stroke-width", 2);
    }
    if (mine) {
      svg.append("circle").attr("cx", x(mine.v)).attr("cy", R).attr("r", 6.5)
        .attr("fill", factionColour(person.faction))
        .attr("stroke", "var(--surface-1)").attr("stroke-width", 2);
      // Direct label: the contrast check obligates a visible value.
      svg.append("text").attr("x", W - 68).attr("y", R + 4)
        .attr("fill", "var(--text-primary)").style("font-size", "12px")
        .style("font-variant-numeric", "tabular-nums")
        .text(`${fmt(mine.v, key === "sentiment_valence" ? 3 : 2)}`);
      svg.append("text").attr("x", W - 68).attr("y", R + 16)
        .attr("fill", "var(--text-muted)").style("font-size", "10px")
        .text(`${pct}. percentilis`);
    }
    const stancePct = key.startsWith("virtue_")
      ? person[key + "_stance"] : null;
    const stanceLine = (stancePct === null || stancePct === undefined
        || Number.isNaN(stancePct))
      ? ""
      : `<br><span style="color:var(--text-muted)">ebből ` +
        `${fmt(stancePct * 100, 0)}% helyeslő, ` +
        `${fmt((1 - stancePct) * 100, 0)}% vádló</span>`;
    svg.on("mousemove", e => showTip(
      `<strong>${meta.hu}</strong><br>${person.speaker}: ${mine ? fmt(mine.v, 3) : "—"}` +
      stanceLine +
      (pct !== null ? ` (${pct}. percentilis)` : "") +
      (median !== null ? `<br>${party} mediánja: ${fmt(median, 3)}` : "") +
      `<br><span style="color:var(--text-muted)">n = ${values.length} képviselő</span>`, e))
      .on("mouseleave", hideTip);
  });

  document.getElementById("strip-note").innerHTML =
    `A pontok a legalább ${DATA.min_speeches} felszólalással rendelkező képviselők ` +
    `(n = ${DATA.distributions.readability_lix.n}). Aki ennél kevesebbszer szólalt fel, ` +
    `nem szerepel: az arányszámai néhány mondaton alapulnának.`;
}

function drawTopicMix(person) {
  // What this MP talks about, as a share of their own speeches. Replaces the
  // sentiment/emotion panel that used to sit here -- every number in it is now
  // a percentile strip above, where it can be read against the population.
  const host = d3.select("#topic-mix").html("");
  const mine = (DATA.topic_mp || [])
    .filter(r => r.speaker_id === person.speaker_id)
    .sort((a, b) => d3.descending(a.speeches, b.speeches))
    .slice(0, 8);
  if (!mine.length) {
    host.append("p").attr("class", "note")
      .text("Ehhez a képviselőhöz nincs olyan téma, amelyben legalább két alkalommal felszólalt volna.");
    return;
  }
  const name = t => (DATA.topics.find(x => x.topic === t) || {}).name_hu || `#${t}`;
  const W = Math.min(760, host.node().clientWidth || 760), RH = 26;
  const x = d3.scaleLinear().domain([0, d3.max(mine, d => d.share_of_speaker)])
    .range([320, W - 66]);
  const svg = host.append("svg").attr("width", "100%").attr("height", mine.length * RH + 8)
    .attr("viewBox", [0, 0, W, mine.length * RH + 8]);
  mine.forEach((row, i) => {
    const y = i * RH + 6;
    svg.append("text").attr("x", 0).attr("y", y + 13).attr("fill", "var(--text-primary)")
      .style("font-size", "12.5px").text(name(row.topic).slice(0, 46))
      .append("title").text(name(row.topic));
    svg.append("rect").attr("x", x(0)).attr("y", y + 2).attr("height", 15)
      .attr("width", Math.max(1, x(row.share_of_speaker) - x(0)))
      .attr("rx", 4).attr("fill", factionColour(person.faction))
      .on("mousemove", e => showTip(
        `<strong>${name(row.topic)}</strong><br>${row.speeches} felszólalás` +
        `<br>a képviselő felszólalásainak ${fmt(row.share_of_speaker * 100, 1)}%-a` +
        `<br>a téma felszólalásainak ${fmt(row.share_of_topic * 100, 1)}%-a`, e))
      .on("mouseleave", hideTip);
    svg.append("text").attr("x", W - 60).attr("y", y + 14)
      .attr("fill", "var(--text-primary)").style("font-size", "12px")
      .style("font-variant-numeric", "tabular-nums")
      .text(`${fmt(row.share_of_speaker * 100, 0)}%`);
  });
}


/* ---------------------------------------------------------------- virtues */
/* A polar chart, and the one place in this dashboard where it is the right
 * form. The percentile strips refuse radar because their metrics are
 * incommensurable — LIX runs 20-85, MATTR 0-1, valence -1..+1 — so a radar
 * could only show them normalised, which hides the values. The six virtues are
 * all one unit: mentions per 1,000 words. A single shared radial scale is
 * therefore honest, six axes is a readable count, and the order is the
 * classical one (four cardinals, then the two MacIntyrean).
 *
 * Two polygons, not one. A single "virtue score" would hide the stance, and
 * the stance is the finding: 41% of truthfulness vocabulary in this chamber is
 * accusation. Affirming and accusing are drawn separately and the chamber
 * average sits behind both as a reference ring.
 *
 * Radar's real defect survives — area grows as the square of the radius, so a
 * doubled value looks quadrupled — so every axis carries its value as text and
 * the gridlines are labelled. Read the numbers, use the shape for orientation. */
const VIRTUE_ORDER = [
  "prudence", "justice", "courage", "temperance", "truthfulness", "magnanimity",
];
const VIRTUE_LABEL = {
  prudence: "Okosság", justice: "Igazságosság", courage: "Bátorság",
  temperance: "Mértékletesség", truthfulness: "Igazmondás",
  magnanimity: "Nagylelkűség",
};

function virtuePeak(subjects) {
  const total = (d, v) =>
    (+(d?.[`virtue_${v}_affirming_rate`] ?? 0) || 0) +
    (+(d?.[`virtue_${v}_accusing_rate`] ?? 0) || 0);
  return d3.max(subjects.filter(Boolean).flatMap(d => VIRTUE_ORDER.map(v => total(d, v)))) || 1;
}

function drawVirtueRadar(host, subject, subjectName, reference, referenceName, sharedPeak) {
  const W = 430, H = 380, cx = W / 2, cy = H / 2 + 6, R = 116;
  const axes = VIRTUE_ORDER;
  const value = (d, v, pole) =>
    +(d?.[`virtue_${v}_${pole}_rate`] ?? 0) || 0;

  // One scale for all six axes AND for both panels, because they share a unit.
  // Rescaling per panel would make the MP and the faction look alike whatever
  // their values — the whole point of putting them side by side is that the
  // two shapes are measured against the same ruler.
  const peak = sharedPeak || virtuePeak([subject, reference]);
  const r = d3.scaleLinear().domain([0, peak]).range([0, R]).nice();
  const angle = i => (i / axes.length) * 2 * Math.PI - Math.PI / 2;
  const point = (i, val) => [cx + r(val) * Math.cos(angle(i)),
                             cy + r(val) * Math.sin(angle(i))];

  const svg = d3.select(host).html("").append("svg")
    .attr("width", "100%").attr("height", H).attr("viewBox", [0, 0, W, H])
    .attr("role", "img")
    .attr("aria-label", `${subjectName} erényszókincse, említés per 1000 szó`);

  const ticks = r.ticks(4).filter(t => t > 0);
  ticks.forEach(t => {
    svg.append("polygon")
      .attr("points", axes.map((_, i) => point(i, t).join(",")).join(" "))
      .attr("fill", "none").attr("stroke", "var(--grid)").attr("stroke-width", 1);
    svg.append("text").attr("x", cx + 3).attr("y", cy - r(t) - 2)
      .attr("fill", "var(--text-muted)").style("font-size", "9px").text(t);
  });
  axes.forEach((_, i) => {
    const [x, y] = point(i, r.domain()[1]);
    svg.append("line").attr("x1", cx).attr("y1", cy).attr("x2", x).attr("y2", y)
      .attr("stroke", "var(--grid)").attr("stroke-width", 1);
  });

  // Chamber reference first, so the subject sits on top of it.
  if (reference) {
    svg.append("polygon")
      .attr("points", axes.map((v, i) =>
        point(i, value(reference, v, "affirming") + value(reference, v, "accusing"))
          .join(",")).join(" "))
      .attr("fill", "none").attr("stroke", "var(--text-muted)")
      .attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
  }

  const series = [
    { pole: "accusing", colour: "var(--series-2)", label: "vádló" },
    { pole: "affirming", colour: "var(--series-1)", label: "helyeslő" },
  ];
  series.forEach(({ pole, colour }) => {
    svg.append("polygon")
      .attr("points", axes.map((v, i) => point(i, value(subject, v, pole)).join(",")).join(" "))
      .attr("fill", colour).attr("fill-opacity", .18)
      .attr("stroke", colour).attr("stroke-width", 2).attr("stroke-linejoin", "round");
    svg.selectAll(null).data(axes).join("circle")
      .attr("cx", (v, i) => point(i, value(subject, v, pole))[0])
      .attr("cy", (v, i) => point(i, value(subject, v, pole))[1])
      .attr("r", 3.5).attr("fill", colour)
      .attr("stroke", "var(--surface-1)").attr("stroke-width", 1.5);
  });

  // Axis names and values. Radar distorts magnitude, so the number is text.
  axes.forEach((v, i) => {
    const [lx, ly] = point(i, r.domain()[1] * 1.22);
    const anchor = Math.abs(lx - cx) < 12 ? "middle" : lx > cx ? "start" : "end";
    const total = value(subject, v, "affirming") + value(subject, v, "accusing");
    const group = svg.append("g").style("cursor", "default")
      .on("mousemove", e => showTip(
        `<strong>${VIRTUE_LABEL[v]}</strong><br>` +
        `${subjectName}: ${fmt(total, 2)} / 1000 szó<br>` +
        `<span style="color:var(--series-1)">helyeslő ${fmt(value(subject, v, "affirming"), 2)}</span> · ` +
        `<span style="color:var(--series-2)">vádló ${fmt(value(subject, v, "accusing"), 2)}</span>` +
        (reference
          ? `<br><span style="color:var(--text-muted)">${referenceName}: ` +
            `${fmt(value(reference, v, "affirming") + value(reference, v, "accusing"), 2)}</span>`
          : ""), e))
      .on("mouseleave", hideTip);
    group.append("text").attr("x", lx).attr("y", ly).attr("text-anchor", anchor)
      .attr("fill", "var(--text-primary)").style("font-size", "11.5px")
      .style("font-weight", "600").text(VIRTUE_LABEL[v]);
    group.append("text").attr("x", lx).attr("y", ly + 12).attr("text-anchor", anchor)
      .attr("fill", "var(--text-muted)").style("font-size", "10.5px")
      .style("font-variant-numeric", "tabular-nums").text(fmt(total, 2));
  });
  return { peak };
}

function renderVirtues() {
  const person = DATA.people.find(p => p.speaker_id === state.mp);
  const party = DATA.parties.find(p => p.faction === (person || {}).faction);
  const peak = virtuePeak([person, party, DATA.chamber]);
  drawVirtueRadar("#virtue-radar-mp", person, (person || {}).speaker || "—",
                  DATA.chamber, "a Ház átlaga", peak);
  drawVirtueRadar("#virtue-radar-party", party, (party || {}).faction || "—",
                  DATA.chamber, "a Ház átlaga", peak);

  document.getElementById("virtue-legend").innerHTML =
    `<span><i class="swatch" style="background:var(--series-1)"></i>helyeslő</span>` +
    `<span><i class="swatch" style="background:var(--series-2)"></i>vádló</span>` +
    `<span style="color:var(--text-muted)">szaggatott vonal: a Ház átlaga</span>` +
    `<span style="color:var(--text-muted)">említés / 1000 szó</span>`;

  const sparse = person && person.virtue_sparse;
  document.getElementById("virtue-note").innerHTML = sparse
    ? `<span class="warn">Ehhez a képviselőhöz kevés erényszó tartozik</span> ` +
      `(${fmt(person.virtue_mentions, 0)} említés), így az alakzat keveset mond.`
    : `A tengelyek ugyanazon a skálán állnak, mert azonos mértékegységűek: ` +
      `említés 1000 szóra. A poláris ábra a sugárral arányosan növeli a ` +
      `területet, ezért minden tengelyen ott a szám is — az alakzat tájékozódásra ` +
      `való, az összehasonlítás a számokon múlik.`;
}

/* --------------------------------------------------------------- topics */
function renderTopics() {
  const cols = Object.keys(T.heat);
  const topics = DATA.topics.filter(t => t.topic >= 0 && t.n_speeches >= 8);
  // Per-column z-scores: one diverging ramp then serves every column, and 0
  // always means "the ciklus average" rather than something column-specific.
  const stats = {};
  cols.forEach(c => {
    const vals = topics.map(t => t[c]).filter(v => v !== null && v !== undefined);
    stats[c] = { mean: d3.mean(vals), sd: d3.deviation(vals) || 1 };
  });
  const z = (t, c) => (t[c] === null || t[c] === undefined)
    ? null : (t[c] - stats[c].mean) / stats[c].sd;

  const LABEL = 290, CELL = 64, RH = 26, W = LABEL + cols.length * CELL + 10;
  const H = topics.length * RH + 54;
  const colour = d3.scaleLinear()
    .domain([-2, -1, 0, 1, 2])
    .range([cssVar("--div-neg-2"), cssVar("--div-neg-1"), cssVar("--div-mid"),
      cssVar("--div-pos-1"), cssVar("--div-pos-2")])
    .interpolate(d3.interpolateLab)
    .clamp(true);

  const svg = d3.select("#heatmap").html("").append("svg")
    .attr("width", W).attr("height", H).attr("role", "img")
    .attr("aria-label", "Témák és mércék hőtérképe, szórásegységben");

  cols.forEach((c, j) => {
    svg.append("text").attr("x", LABEL + j * CELL + CELL / 2).attr("y", 30)
      .attr("text-anchor", "middle").attr("fill", "var(--text-secondary)")
      .style("font-size", "11px").text(T.heat[c]);
  });

  topics.forEach((t, i) => {
    const y = 44 + i * RH;
    svg.append("text").attr("x", 0).attr("y", y + 15)
      .attr("fill", "var(--text-primary)").style("font-size", "12px")
      .text((t.name_hu || `#${t.topic}`).slice(0, 44))
      .append("title").text(t.name_hu || "");
    svg.append("text").attr("x", LABEL - 34).attr("y", y + 15)
      .attr("fill", "var(--text-muted)").style("font-size", "10.5px")
      .style("font-variant-numeric", "tabular-nums").text(t.n_speeches);

    cols.forEach((c, j) => {
      const zv = z(t, c);
      svg.append("rect").attr("x", LABEL + j * CELL).attr("y", y)
        .attr("width", CELL - 2).attr("height", RH - 2).attr("rx", 3)
        .attr("fill", zv === null ? "var(--surface-2)" : colour(zv))
        .on("mousemove", e => showTip(
          `<strong>${t.name_hu}</strong><br>${T.heat[c]}: ${fmt(t[c], 3)}` +
          `<br><span style="color:var(--text-muted)">${zv === null ? "" :
            (zv >= 0 ? "+" : "") + fmt(zv, 2) + " szórás a ciklusátlagtól"}` +
          `<br>${t.n_speeches} felszólalás · ${fmt(t.minutes, 0)} perc</span>`, e))
        .on("mouseleave", hideTip);
    });
  });

  document.getElementById("heat-legend").innerHTML =
    `<span><i class="swatch" style="background:var(--div-neg-2)"></i>−2 szórás</span>` +
    `<span><i class="swatch" style="background:var(--div-mid)"></i>ciklusátlag</span>` +
    `<span><i class="swatch" style="background:var(--div-pos-2)"></i>+2 szórás</span>` +
    `<span style="color:var(--text-muted)">a név melletti szám: hány felszólalás</span>`;

  document.getElementById("topic-keywords").innerHTML = topics.map(t =>
    `<div style="margin-bottom:10px"><strong style="font-size:13px">${t.name_hu}</strong>
     <span style="color:var(--text-muted);font-size:12px"> · ${t.n_speeches} felszólalás</span><br>
     ${(t.keywords || []).map(k => `<span class="chip">${k}</span>`).join("")}</div>`).join("");
}

function renderTopicMp() {
  const select = document.getElementById("pick-topic");
  const sortSel = document.getElementById("topic-sort");
  const withSpeakers = DATA.topics
    .filter(t => t.topic >= 0 && (DATA.topic_mp || []).some(r => r.topic === t.topic))
    .sort((a, b) => d3.descending(a.n_speeches, b.n_speeches));
  select.innerHTML = withSpeakers
    .map(t => `<option value="${t.topic}">${t.name_hu} (${t.n_speeches})</option>`)
    .join("");

  function draw() {
    const topic = +select.value, key = sortSel.value;
    const rows = (DATA.topic_mp || [])
      .filter(r => r.topic === topic)
      .sort((a, b) => d3.descending(a[key], b[key]))
      .slice(0, 14);
    const host = d3.select("#topic-mp").html("");
    if (!rows.length) {
      host.append("p").attr("class", "note").text("Nincs adat ehhez a témához.");
      return;
    }
    const table = host.append("table");
    table.append("thead").append("tr").html(
      `<th>Képviselő</th><th>Frakció</th><th class="num">Felszólalás</th>` +
      `<th class="num">A képviselő arányában</th><th class="num">A téma arányában</th>`);
    const body = table.append("tbody");
    const maxBar = d3.max(rows, r => r[key]);
    rows.forEach(r => {
      const tr = body.append("tr");
      tr.append("td").html(
        `<span class="swatch" style="background:${factionColour(r.faction)};margin-right:7px"></span>${r.speaker}`);
      tr.append("td").text(r.faction ?? "—");
      tr.append("td").attr("class", "num").text(r.speeches);
      // A bar behind the sorted column, so the ranking is visible as well as
      // readable; the other two stay plain numbers.
      [["share_of_speaker", r.share_of_speaker], ["share_of_topic", r.share_of_topic]]
        .forEach(([col, value]) => {
          const td = tr.append("td").attr("class", "num");
          if (col === key) {
            td.style("background",
              `linear-gradient(to left, color-mix(in srgb, ${factionColour(r.faction)} 22%, transparent) ` +
              `${(100 * value / maxBar).toFixed(1)}%, transparent 0)`);
          }
          td.append("span").text(fmt(value * 100, 1) + "%");
        });
    });
    const t = DATA.topics.find(x => x.topic === topic) || {};
    document.getElementById("topic-mp-note").textContent =
      `${rows.length} képviselő, akik legalább kétszer szólaltak fel ebben a témában ` +
      `(a téma összesen ${t.n_speeches} felszólalás). Az egy felszólalású ` +
      `kötődéseket kihagytuk: ott a „képviselő arányában” oszlop 0 vagy 100% lenne.`;
  }
  select.onchange = draw;
  sortSel.onchange = draw;
  draw();
}

/* -------------------------------------------------------------- network */
/* Layout is real ForceAtlas2 -- the algorithm Gephi runs -- not a d3-force
 * approximation. Three of its settings do the visible work:
 *   outboundAttractionDistribution ("Dissuade Hubs") divides a node's
 *     attraction by its degree, which pushes hubs to the rim instead of
 *     burying them in the middle. Without it Magyar Péter sits on top of
 *     everything and the graph reads as one blob.
 *   linLogMode tightens clusters and opens the space between them.
 *   gravity is kept low so the rim can breathe.
 * Positions are computed once, then rendered with d3.
 *
 * Edges are quadratic beziers rather than straight lines: parallel edges
 * separate instead of overprinting, and a curve is far easier to follow across
 * a dense middle. Arrowheads inherit stroke width, so a heavy edge gets a
 * heavy head and direction reads at a glance.
 *
 * Two sizings share one radius scale and one layout, so switching shows a real
 * difference rather than a rescaled picture. */
const SIZE_MODES = {
  in:  { key: "heckles_received", label: "Kapott közbeszólás (in-degree)" },
  out: { key: "heckles_given", label: "Adott közbeszólás (out-degree)" }
};
const FA2_ITERATIONS = 600;

function layoutForceAtlas2(nodes, links, W, H) {
  const graph = new Graph({ type: "directed", multi: false });
  nodes.forEach(n => graph.addNode(n.id, {
    x: Math.random() * 100 - 50, y: Math.random() * 100 - 50,
    size: 1, mass: 1 + n.heckles_received + n.heckles_given
  }));
  links.forEach(l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    if (s !== t && !graph.hasEdge(s, t)) graph.addDirectedEdge(s, t, { weight: l.weight });
  });

  forceAtlas2.assign(graph, {
    iterations: FA2_ITERATIONS,
    settings: {
      barnesHutOptimize: true,
      outboundAttractionDistribution: true,  // Gephi's "Dissuade Hubs"
      linLogMode: true,
      adjustSizes: false,
      edgeWeightInfluence: 1,
      scalingRatio: 22,
      gravity: 0.55,
      slowDown: 2
    }
  });

  // Fit the result to the viewport, preserving aspect so the layout is not
  // stretched into a shape ForceAtlas2 never produced.
  const pos = nodes.map(n => graph.getNodeAttributes(n.id));
  const [x0, x1] = d3.extent(pos, p => p.x), [y0, y1] = d3.extent(pos, p => p.y);
  const pad = 62;
  const k = Math.min((W - 2 * pad) / (x1 - x0 || 1), (H - 2 * pad) / (y1 - y0 || 1));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  nodes.forEach((n, i) => {
    n.x = W / 2 + (pos[i].x - cx) * k;
    n.y = H / 2 + (pos[i].y - cy) * k;
  });
}

function renderNetwork() {
  const W = Math.min(1140, document.querySelector(".wrap").clientWidth - 30), H = 760;
  const filterSel = document.getElementById("net-filter");
  const minSel = document.getElementById("net-min");
  const sizeSel = document.getElementById("net-size");

  const wanted = new URLSearchParams(location.search).get("size");
  if (wanted && SIZE_MODES[wanted]) sizeSel.value = wanted;

  const maxDegree = d3.max(DATA.network.nodes,
    n => Math.max(n.heckles_received, n.heckles_given)) || 1;
  const r = d3.scaleSqrt().domain([0, maxDegree]).range([5, 44]);
  const maxWeight = d3.max(DATA.network.links, l => l.weight) || 1;
  const width = d3.scaleSqrt().domain([1, maxWeight]).range([1.2, 14]);
  // Label size follows node size, which is what gives the Gephi renders their
  // reading order: the eye lands on the biggest name first.
  const labelSize = radius => Math.max(9, Math.min(30, 8 + radius * 0.62));

  let nodes = [], node = null, label = null, halo = null;

  function applySize() {
    const key = SIZE_MODES[sizeSel.value].key;
    node.transition().duration(450).attr("r", d => r(d[key]));
    halo.transition().duration(450).attr("r", d => r(d[key]) + 2);
    label.transition().duration(450)
      .style("font-size", d => labelSize(r(d[key])) + "px")
      .attr("x", d => d.x)
      .attr("y", d => d.y - r(d[key]) - 6);

    // Greedy collision avoidance: walk the nodes biggest-first and keep a
    // label only if its box clears every label already placed. Without this
    // the middle of the graph is a pile of overlapping names, and the fix is
    // not "fewer labels" -- it is "no label where there is no room".
    // Seed the occupied boxes with the larger circles: a label must clear the
    // marks as well as the other labels, or it lands on top of a hub.
    const placed = nodes
      .filter(n => r(n[key]) >= 12)
      .map(n => ({
        id: n.id,
        x0: n.x - r(n[key]), x1: n.x + r(n[key]),
        y0: n.y - r(n[key]), y1: n.y + r(n[key])
      }));
    const show = new Set();
    nodes.slice()
      .sort((a, b) => d3.descending(a[key], b[key]))
      .forEach(n => {
        if (n[key] <= 0) return;
        const size = labelSize(r(n[key]));
        const w = n.label.length * size * 0.52, h = size * 1.15;
        const box = {
          x0: n.x - w / 2, x1: n.x + w / 2,
          y0: n.y - r(n[key]) - 6 - h, y1: n.y - r(n[key]) - 4
        };
        // A node's own circle must not block its own label.
        const clashes = placed.some(b =>
          b.id !== n.id &&
          box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
        // The single biggest node is always labelled: if the graph has one
        // subject, dropping its name is the one failure that is not tolerable.
        if (!clashes || show.size === 0) {
          placed.push({ ...box, id: n.id });
          show.add(n.id);
        }
      });
    label.attr("display", d => show.has(d.id) ? null : "none");
    document.getElementById("net-caption").textContent =
      sizeSel.value === "in"
        ? "A pont és a név mérete: hányszor szakították félbe az illetőt."
        : "A pont és a név mérete: hányszor szakított félbe másokat. Ugyanaz a skála és ugyanaz az elrendezés, mint a másik nézetben.";
  }

  function draw() {
    const key = SIZE_MODES[sizeSel.value].key;
    const mode = filterSel.value, minW = +minSel.value;
    const links = DATA.network.links
      .filter(l => l.weight >= minW)
      .filter(l => mode === "all" || l.crossing === mode)
      .map(l => ({ ...l }));
    const byId = new Map(DATA.network.nodes.map(n => [n.id, n]));
    const keep = new Set(links.flatMap(l => [l.source, l.target]));
    nodes = [...keep].map(id => ({ ...byId.get(id) }));

    layoutForceAtlas2(nodes, links, W, H);
    const at = new Map(nodes.map(n => [n.id, n]));
    links.forEach(l => { l.s = at.get(l.source); l.t = at.get(l.target); });

    const svg = d3.select("#graph").html("").append("svg")
      .attr("width", "100%").attr("height", H)
      .attr("viewBox", [0, 0, W, H])
      .attr("role", "img")
      .attr("aria-label", "Ki kit szakított félbe: irányított hálózat");

    // markerUnits defaults to strokeWidth, so a heavy edge gets a heavy head.
    const defs = svg.append("defs");
    DATA.parties.concat([{ faction: null }]).forEach((p, i) => {
      defs.append("marker")
        .attr("id", `arrow${i}`).attr("viewBox", "0 -5 10 10")
        .attr("refX", 9).attr("refY", 0)
        .attr("markerWidth", 4).attr("markerHeight", 4).attr("orient", "auto")
        .append("path").attr("d", "M0,-4.5L9,0L0,4.5")
        .attr("fill", factionColour(p.faction)).attr("opacity", .75);
    });
    const arrowFor = f => {
      const i = DATA.parties.findIndex(p => p.faction === f);
      return `url(#arrow${i >= 0 ? i : DATA.parties.length})`;
    };

    // Curved: control point offset perpendicular to the chord.
    const arc = d => {
      const dx = d.t.x - d.s.x, dy = d.t.y - d.s.y;
      const mx = (d.s.x + d.t.x) / 2, my = (d.s.y + d.t.y) / 2;
      const len = Math.hypot(dx, dy) || 1;
      const bend = 0.18;
      return `M${d.s.x},${d.s.y}Q${mx - dy * bend},${my + dx * bend} ${d.t.x},${d.t.y}`
        .replace("NaN", "0") + (len ? "" : "");
    };

    svg.append("g").attr("fill", "none").selectAll("path").data(links).join("path")
      .attr("d", arc)
      // Edge takes the interrupter's colour: it reads as flow out of a person,
      // and it is the same information the arrowhead carries.
      .attr("stroke", d => factionColour(d.s.faction === "unknown" ? null : d.s.faction))
      .attr("stroke-opacity", d => d.crossing === "cross-bench" ? .42 : .22)
      .attr("stroke-width", d => width(d.weight))
      .attr("stroke-linecap", "round")
      .attr("marker-end", d => arrowFor(d.s.faction === "unknown" ? null : d.s.faction))
      .on("mousemove", (e, d) => showTip(
        `<strong>${d.s.label}</strong> → <strong>${d.t.label}</strong><br>` +
        `${d.weight} félbeszakítás<br><span style="color:var(--text-muted)">` +
        `${d.crossing === "cross-bench" ? "a két oldal között" : "azonos oldalon belül"}</span>`, e))
      .on("mouseleave", hideTip);

    // A surface-coloured ring separates overlapping nodes without a border.
    halo = svg.append("g").selectAll("circle").data(nodes).join("circle")
      .attr("cx", d => d.x).attr("cy", d => d.y)
      .attr("r", d => r(d[key]) + 2).attr("fill", "var(--surface-1)");

    node = svg.append("g").selectAll("circle").data(nodes).join("circle")
      .attr("cx", d => d.x).attr("cy", d => d.y)
      .attr("r", d => r(d[key]))
      .attr("fill", d => factionColour(d.faction === "unknown" ? null : d.faction))
      .attr("fill-opacity", .92)
      .style("cursor", "pointer")
      .on("mousemove", (e, d) => showTip(
        `<strong>${d.label}</strong> — ${d.faction ?? "nincs frakció"}<br>` +
        `kapott: ${d.heckles_received} (${d.hecklers} embertől)<br>` +
        `adott: ${d.heckles_given} (${d.targets} célpontra)`, e))
      .on("mouseleave", hideTip)
      .on("click", (e, d) => {
        const sel = document.getElementById("pick-mp");
        if ([...sel.options].some(o => o.value === d.id)) {
          sel.value = d.id; state.mp = d.id; renderProfile();
          document.querySelector('.tab[data-view="profile"]').click();
          document.getElementById("profile").scrollIntoView({ behavior: "smooth" });
        }
      });

    label = svg.append("g").selectAll("text").data(nodes).join("text")
      .attr("x", d => d.x).attr("y", d => d.y - r(d[key]) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-primary)")
      .style("font-weight", "650").style("paint-order", "stroke")
      .style("stroke", "var(--surface-1)").style("stroke-width", "4px")
      .style("stroke-linejoin", "round").style("pointer-events", "none")
      .text(d => d.label);

    applySize();

    document.getElementById("net-legend").innerHTML =
      DATA.parties.map(p =>
        `<span><i class="swatch" style="background:${factionColour(p.faction)}"></i>${p.faction}</span>`).join("") +
      `<span style="color:var(--text-muted)">a nyíl színe a bekiabáló frakciója · ` +
      `vastagsága hány félbeszakítás (1–${maxWeight}) · ` +
      `a halványabb élek azonos oldalon belül futnak</span>` +
      `<span style="color:var(--text-muted)">${nodes.length} képviselő · ${links.length} él · ForceAtlas2</span>`;
  }

  filterSel.onchange = draw;
  minSel.onchange = draw;
  sizeSel.onchange = () => {
    const url = new URL(location.href);
    url.searchParams.set("size", sizeSel.value);
    history.replaceState(null, "", url);
    applySize();
  };
  draw();
}
