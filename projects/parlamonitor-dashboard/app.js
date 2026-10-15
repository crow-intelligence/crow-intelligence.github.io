import { rtd } from "./rtd.js";
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
  allotax: {
    lede: "A rombusz két csoport bekiabálásainak szókincsét veti össze " +
      "(allotaxonográf). Minden szó oda kerül, ahol a két csoportbeli " +
      "gyakorisági rangja metszi egymást: a csúcs közelében azok, amelyeket " +
      "mindkét oldal sokat használ; balra azok, amelyek a bal oldali csoportra, " +
      "jobbra azok, amelyek a jobb oldalira jellemzőbbek. Mellette a " +
      "különbséghez leginkább hozzájáruló 25 szó. A töltelékszavakat " +
      "(névelők, segédigék, megszólítások) kiszűrtük.",
    groups: {
      tisza_gov_43:  { name: "TISZA, kormányon (43.)",          short: "TISZA 43." },
      fidesz_opp_43: { name: "Fidesz–KDNP, ellenzékben (43.)",  short: "Fidesz–KDNP 43." },
      fidesz_gov_42: { name: "Fidesz–KDNP, kormányon (42.)",    short: "Fidesz–KDNP 42." },
      opposition_42: { name: "az akkori ellenzék (42.)",        short: "ellenzék 42." }
    },
    buttons: {
      tisza_gov_43__fidesz_opp_43:  "TISZA ↔ Fidesz–KDNP (43.)",
      fidesz_opp_43__fidesz_gov_42: "Fidesz–KDNP: ellenzékben ↔ kormányon",
      fidesz_gov_42__opposition_42: "Fidesz–KDNP ↔ ellenzék (42.)"
    },
    intro: {
      tisza_gov_43__fidesz_opp_43:
        "Az új kormánypárt és az új ellenzék bekiabálásai ugyanabban a ciklusban.",
      fidesz_opp_43__fidesz_gov_42:
        "Ugyanaz a pártszövetség előbb kormányon (42.), aztán ellenzékben (43.): " +
        "mennyire vitte magával a szókincsét?",
      fidesz_gov_42__opposition_42:
        "A 42. ciklus két oldala: a kormányzó Fidesz–KDNP és az akkori ellenzék — " +
        "az a padsor, ahová a Fidesz–KDNP a 43. ciklusban átült."
    },
    switchLabel: "Összevetés",
    diamondTitle: "Rang a bal és a jobb oldali csoportban",
    shiftTitle: "A különbséget leginkább hordozó 25 szó",
    apex: "mindkét oldalon gyakori",
    towards: g => `jellemzőbb: ${g}`,
    legend: "szó a cellában",
    bins: ["1", "2–3", "4–9", "10+"],
    contours: "halvány vonalak: azonos hozzájárulású helyek",
    axis: "a teljes eltérés %-a",
    cellTip: (n, l, r) => `<strong>${n} szó</strong> ebben a cellában` +
      `<br><span style="color:var(--text-muted)">rang: ${l} · ${r}</span>`,
    rank: "rang",
    count: "db",
    share: "részesedés az eltérésből",
    caption: (rtd, l, r) =>
      `RTD = ${rtd} (0 = azonos rangsor, 1 = semmi közös). ` +
      `${l.name}: ${l.quotes} bekiabálás, ${l.tokens} tartalmas szó · ` +
      `${r.name}: ${r.quotes} bekiabálás, ${r.tokens} tartalmas szó.`,
    caveat: "A 42. ciklusból csak a padsorhoz kötött bekiabálások sorolhatók " +
      "oldalhoz: a jegyzőkönyv a bekiabáló nevét rögzíti, a pártját nem, és " +
      "csak a 43. ciklushoz van beszédexport, amelyből a párt kiderül. A 43. " +
      "ciklus csoportjai főleg névvel jelölt bekiabálások — a két ciklus " +
      "közti távolság részben ebből a különbségből is fakad. A minták kicsik: " +
      "néhány száz tartalmas szó oldalanként.",
    bootstrap: (share, draws) =>
      `${draws} újramintavételből ${share} esetben a 43. ciklus Fidesz–KDNP-je ` +
      "a saját kormányzati bekiabálásaihoz áll közelebb, mint az akkori ellenzékéhez.",
    tableSummary: "Táblázat: a 25 legnagyobb hozzájárulás",
    tableHead: ["szó", "jellemzőbb", "db bal", "db jobb", "rang bal", "rang jobb", "részesedés"]
  },
  vocab: {
    lede: "Ugyanaz a rombusz, ezúttal a felszólalások szókincsére: bármely két " +
      "szereplő összevethető — oldal, frakció vagy egyes képviselő, miniszter. " +
      "Csak a tartalmas szavak számítanak (főnév, ige, melléknév, határozószó), " +
      "a töltelékszavak és a megszólítások nélkül. Ha egy képviselőt a saját " +
      "frakciójával vet össze, az ő szavai a frakció számaiban is benne vannak.",
    left: "Bal oldal", right: "Jobb oldal", swap: "Csere",
    groups: { side: "Oldalak", group: "Pártszövetség", faction: "Frakciók", person: "Felszólalók" },
    sides: { government: "Kormányoldal (TISZA és a miniszterek)", opposition: "Ellenzék" },
    noFaction: "frakción kívül",
    loading: "A szókincsadatok betöltése…",
    same: "Két különböző szereplőt válasszon.",
    caption: (rtd, l, r) =>
      `RTD = ${rtd} (0 = azonos rangsor, 1 = semmi közös). ` +
      `${l.name}: ${l.speeches} felszólalás, ${l.tokens} tartalmas szó · ` +
      `${r.name}: ${r.speeches} felszólalás, ${r.tokens} tartalmas szó.`,
    scale: refs => "Viszonyításként: " + refs.join(" · ") +
      ". A bekiabálások két oldala között ennél jóval nagyobb, 0,7 körüli az eltérés.",
    threshold: (n, min) =>
      `${n} felszólaló választható: aki legalább ${min} tartalmas szót mondott. ` +
      "Ennél rövidebb szövegnél a rangsor főleg zaj.",
    computed: "A különbséget a böngésző számolja, ugyanazzal a módszerrel, mint a keyflux csomag.",
    names: "A lemmatizáló néhány családnevet közszóként olvas (gulyás, jános), " +
      "ezért ezek kisbetűvel jelennek meg; a számolást ez nem érinti."
  },
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
  renderAllotaxonograph();
});

function selectView(view) {
  const buttons = [...document.querySelectorAll(".tab[data-view]")];
  if (!buttons.some(b => b.dataset.view === view)) return;
  buttons.forEach(b => b.setAttribute("aria-selected", String(b.dataset.view === view)));
  document.querySelectorAll("[data-panel]").forEach(p =>
    p.classList.toggle("hidden", p.dataset.panel !== view));
  // The vocabulary view loads its own data file, and only when first opened.
  if (view === "vocab") renderVocab();
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


/* ------------------------------------------------------- allotaxonograph */
/* Rank-turbulence divergence between two groups' heckle vocabularies, drawn as
 * the Dodds et al. diamond: every word sits where its rank in the left group
 * meets its rank in the right, rotated 45 degrees so that words both groups use
 * a lot sit at the apex and one-sided words fall toward their own flank. The
 * cells are counts (sequential ramp); the identity colours belong to the two
 * groups' *positions*, never to a party, because Fidesz-KDNP is on both sides
 * of one comparison. Numbers come precomputed from scripts/heckle_content.py. */
function renderAllotaxonograph() {
  const A = DATA.heckle_allotaxonographs;
  const section = document.getElementById("allotax-section");
  if (!A) { section.classList.add("hidden"); return; }
  const S = T.allotax;
  document.getElementById("allotax-lede").textContent = S.lede;
  document.getElementById("allotax-switch-label").textContent = S.switchLabel;
  document.getElementById("allotax-diamond-title").textContent = S.diamondTitle;
  document.getElementById("allotax-shift-title").textContent = S.shiftTitle;
  document.getElementById("allotax-table-summary").textContent = S.tableSummary;

  if (!state.allotax) state.allotax = A.comparisons[0].id;
  const sw = document.getElementById("allotax-switch");
  sw.innerHTML = "";
  A.comparisons.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(c.id === state.allotax));
    b.tabIndex = c.id === state.allotax ? 0 : -1;
    b.textContent = S.buttons[c.id] || c.id;
    b.addEventListener("click", () => { state.allotax = c.id; renderAllotaxonograph(); });
    b.addEventListener("keydown", e => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = A.comparisons[(i + step + A.comparisons.length) % A.comparisons.length];
      state.allotax = next.id;
      renderAllotaxonograph();
      sw.querySelector('[aria-checked="true"]').focus();
    });
    sw.appendChild(b);
  });

  const cmp = A.comparisons.find(c => c.id === state.allotax);
  const groupOf = id => ({ ...A.groups[id], ...(S.groups[id] || { name: id, short: id }) });
  const L = groupOf(cmp.left), R = groupOf(cmp.right);
  const LEFT = "var(--series-1)", RIGHT = "var(--series-2)";
  const types = cmp.types;
  const share = t => t.contrib / cmp.divergence * 100;
  const sideName = t => t.dir === "left" ? L.short : t.dir === "right" ? R.short : "—";
  const wordTip = t =>
    `<strong>${t.label || t.t}</strong> · ${S.towards(sideName(t))}<br>` +
    `${L.short}: ${t.c1} ${S.count}, ${S.rank} ${fmt(t.r1, 1)}<br>` +
    `${R.short}: ${t.c2} ${S.count}, ${S.rank} ${fmt(t.r2, 1)}<br>` +
    `${S.share}: ${fmt(share(t), 2)}%`;

  document.getElementById("allotax-intro").textContent = S.intro[cmp.id] || "";
  drawAllotaxDiamond(document.getElementById("allotax-diamond"), types, cmp, L, R, LEFT, RIGHT, S, wordTip,
    document.getElementById("allotax-legend"));
  const top = types.filter(t => t.dir !== "shared")
    .sort((a, b) => d3.descending(a.contrib, b.contrib)).slice(0, 25);
  drawWordShift(document.getElementById("allotax-shift"), top, share, LEFT, RIGHT, S, wordTip);

  document.getElementById("allotax-caption").textContent = S.caption(
    fmt(cmp.divergence, 3),
    { name: L.name, quotes: fmt(L.quotes, 0), tokens: fmt(L.tokens, 0) },
    { name: R.name, quotes: fmt(R.quotes, 0), tokens: fmt(R.tokens, 0) });
  const involves42 = L.cycle === 42 || R.cycle === 42;
  const boot = A.bootstrap;
  document.getElementById("allotax-caveat").textContent =
    (involves42 ? S.caveat : "") +
    (boot && cmp.id === "fidesz_opp_43__fidesz_gov_42"
      ? " " + S.bootstrap(fmt(boot.closer_to_own_past_than_to_old_opposition * 100, 0) + "%", boot.draws)
      : "");

  const table = d3.select("#allotax-table").html("");
  table.append("thead").append("tr").selectAll("th").data(S.tableHead).join("th")
    .text(d => d).style("cursor", "default");
  table.append("tbody").selectAll("tr").data(top).join("tr").html(t =>
    `<td>${t.label || t.t}</td><td>${sideName(t)}</td><td class="num">${t.c1}</td>` +
    `<td class="num">${t.c2}</td><td class="num">${fmt(t.r1, 1)}</td>` +
    `<td class="num">${fmt(t.r2, 1)}</td><td class="num">${fmt(share(t), 2)}%</td>`);
}

function drawAllotaxDiamond(host, types, cmp, L, R, LEFT, RIGHT, S, wordTip, legendHost) {
  const W = Math.max(300, Math.min(560, host.clientWidth || 520));
  const pad = 14, top = 44, bottom = 12, side = W - 2 * pad;
  const H = top + side + bottom;
  const maxRank = d3.max(types, t => Math.max(t.r1, t.r2));
  const Lmax = Math.log10(maxRank) + 0.04;
  const unit = side / (Math.SQRT2 * Lmax);
  // (a, b) = (log10 rank left, log10 rank right) -> screen. Left-typical words
  // (small a, large b) land left of the axis; shared-common words at the apex.
  const X = (a, b) => pad + side / 2 + (a - b) / Math.SQRT2 * unit;
  const Y = (a, b) => top + (a + b) / Math.SQRT2 * unit;
  const lg = r => Math.log10(Math.max(1, r));

  const BINS = 26, cell = Lmax / BINS;
  const cells = new Map();
  types.forEach(t => {
    const i = Math.min(BINS - 1, Math.floor(lg(t.r1) / cell));
    const j = Math.min(BINS - 1, Math.floor(lg(t.r2) / cell));
    const key = i * BINS + j;
    if (!cells.has(key)) cells.set(key, { i, j, words: [] });
    cells.get(key).words.push(t);
  });
  const fill = d3.scaleThreshold().domain([2, 4, 10])
    .range(["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)"]);

  const svg = d3.select(host).html("").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
    .attr("role", "img")
    .attr("aria-label", `${S.diamondTitle}: ${L.name} — ${R.name}, RTD ${fmt(cmp.divergence, 3)}`);

  // Frame and the axis of equal rank.
  const corner = (a, b) => `${X(a, b)},${Y(a, b)}`;
  svg.append("polygon")
    .attr("points", [corner(0, 0), corner(Lmax, 0), corner(Lmax, Lmax), corner(0, Lmax)].join(" "))
    .style("fill", "none").style("stroke", "var(--grid)");
  svg.append("line").attr("x1", X(0, 0)).attr("y1", Y(0, 0)).attr("x2", X(Lmax, Lmax)).attr("y2", Y(Lmax, Lmax))
    .style("stroke", "var(--grid)").style("stroke-dasharray", "3 3");

  // Cells, each a rotated square, with a hover that lists its words.
  svg.append("g").selectAll("polygon").data([...cells.values()]).join("polygon")
    .attr("points", d => {
      const a0 = d.i * cell, a1 = a0 + cell, b0 = d.j * cell, b1 = b0 + cell;
      return [corner(a0, b0), corner(a1, b0), corner(a1, b1), corner(a0, b1)].join(" ");
    })
    .style("fill", d => fill(d.words.length))
    .style("stroke", "var(--surface-1)").style("stroke-width", 0.6)
    .on("mousemove", (event, d) => {
      const words = d.words.slice().sort((a, b) => d3.descending(a.contrib, b.contrib));
      showTip(S.cellTip(words.length, L.short, R.short) + "<br>" + words.slice(0, 10).map(t =>
        `${t.label || t.t} <span style="color:var(--text-muted)">${fmt(t.r1, 1)} · ${fmt(t.r2, 1)}</span>`).join("<br>") +
        (words.length > 10 ? "<br>…" : ""), event);
    })
    .on("mouseleave", hideTip);

  // Iso-divergence contours: where a word would contribute equally, from the
  // closed form delta = |r1^-a - r2^-a|^(1/(a+1)). Drawn faint, over the cells.
  const alpha = cmp.alpha, n = 90;
  const values = new Float64Array(n * n);
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
    const r1 = 10 ** ((gx + 0.5) / n * Lmax), r2 = 10 ** ((gy + 0.5) / n * Lmax);
    values[gy * n + gx] = Math.abs(r1 ** -alpha - r2 ** -alpha) ** (1 / (alpha + 1));
  }
  const thresholds = d3.ticks(0.05, d3.max(values), 7).filter(v => v > 0);
  const toScreen = d3.geoTransform({
    point(gx, gy) { this.stream.point(X(gx / n * Lmax, gy / n * Lmax), Y(gx / n * Lmax, gy / n * Lmax)); }
  });
  svg.append("g").selectAll("path").data(d3.contours().size([n, n]).thresholds(thresholds)(values)).join("path")
    .attr("d", d3.geoPath(toScreen))
    .style("fill", "none").style("stroke", "var(--text-muted)")
    .style("stroke-opacity", 0.35).style("stroke-width", 0.8).style("pointer-events", "none");

  // Labels: the strongest contributors of each side, placed where they sit,
  // greedily, skipping any that would collide or leave the frame.
  const font = 11, placed = [];
  const candidates = ["left", "right"].flatMap(dir => types.filter(t => t.dir === dir)
    .sort((a, b) => d3.descending(a.contrib, b.contrib)).slice(0, 9));
  candidates.sort((a, b) => d3.descending(a.contrib, b.contrib));
  const labels = [];
  candidates.forEach(t => {
    const x = X(lg(t.r1), lg(t.r2)), y = Y(lg(t.r1), lg(t.r2));
    const w = (t.label || t.t).length * font * 0.58, h = font * 1.2;
    const left = t.dir === "left";
    const box = { x0: left ? x - 5 - w : x + 5, x1: left ? x - 5 : x + 5 + w, y0: y - h / 2, y1: y + h / 2 };
    if (box.x0 < 2 || box.x1 > W - 2 || box.y0 < top - 4 || box.y1 > H) return;
    if (placed.some(b => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) return;
    placed.push(box);
    labels.push({ t, x, y, left });
  });
  const lab = svg.append("g").style("pointer-events", "none");
  lab.selectAll("circle").data(labels).join("circle")
    .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 2.6)
    .style("fill", "var(--text-primary)").style("stroke", "var(--surface-1)").style("stroke-width", 1.5);
  lab.selectAll("text").data(labels).join("text")
    .attr("x", d => d.left ? d.x - 5 : d.x + 5).attr("y", d => d.y).attr("dy", "0.35em")
    .attr("text-anchor", d => d.left ? "end" : "start")
    .style("font-size", font + "px").style("fill", "var(--text-primary)")
    .style("paint-order", "stroke").style("stroke", "var(--surface-1)").style("stroke-width", "3px")
    .text(d => d.t.label || d.t.t);

  // Orientation, said in words: which side is which, and what the apex means.
  const head = svg.append("g").style("font-size", "11.5px");
  [[L, LEFT, pad, "start", "← "], [R, RIGHT, W - pad, "end", ""]].forEach(([g, colour, x, anchor, arrow]) => {
    const text = head.append("text").attr("x", x + (anchor === "start" ? 14 : -14)).attr("y", 14)
      .attr("text-anchor", anchor).style("fill", "var(--text-secondary)")
      .text(anchor === "start" ? arrow + S.towards(g.short) : S.towards(g.short) + " →");
    head.append("rect").attr("x", anchor === "start" ? x : x - 10).attr("y", 5).attr("width", 10).attr("height", 10)
      .attr("rx", 2).style("fill", colour);
    return text;
  });
  head.append("text").attr("x", X(0, 0)).attr("y", top - 8).attr("text-anchor", "middle")
    .style("fill", "var(--text-muted)").text("▲ " + S.apex);

  legendHost.innerHTML =
    `<span>${S.legend}:</span>` +
    S.bins.map((b, i) => `<span><i class="swatch" style="background:var(--seq-${i + 1})"></i>${b}</span>`).join("") +
    `<span style="color:var(--text-muted)">${S.contours}</span>`;
}

function drawWordShift(host, top, share, LEFT, RIGHT, S, wordTip) {
  const W = Math.max(300, host.clientWidth || 460);
  const rowH = 19, marginX = 92, topPad = 6, axisH = 42;
  const H = topPad + top.length * rowH + axisH;
  const maxShare = d3.max(top, share) || 1;
  const x = d3.scaleLinear().domain([-maxShare, maxShare]).range([marginX, W - marginX]).nice();
  const y = (d, i) => topPad + i * rowH;
  const svg = d3.select(host).html("").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
    .attr("role", "img").attr("aria-label", S.shiftTitle);

  // A bar with only its data end rounded (4px), anchored square on the axis.
  const bar = (x0, x1, yTop, h, r = 4) => {
    const dir = x1 >= x0 ? 1 : -1, len = Math.abs(x1 - x0), rr = Math.min(r, len, h / 2);
    const xe = x1, xs = x0;
    return `M${xs},${yTop}` +
      `H${xe - dir * rr}` +
      `A${rr},${rr} 0 0 ${dir > 0 ? 1 : 0} ${xe},${yTop + rr}` +
      `V${yTop + h - rr}` +
      `A${rr},${rr} 0 0 ${dir > 0 ? 1 : 0} ${xe - dir * rr},${yTop + h}` +
      `H${xs}Z`;
  };
  const x0 = x(0);
  // As many decimals as the tick step needs: 0.05% steps must not all read "0%".
  const ticks = x.ticks(5), step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;
  const decimals = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  const rows = svg.append("g").selectAll("g").data(top).join("g");
  rows.append("path")
    .attr("d", (t, i) => {
      const v = t.dir === "left" ? -share(t) : share(t);
      return bar(x0, x(v), y(t, i) + 2, rowH - 4);   // 2px surface gap above and below
    })
    .style("fill", t => t.dir === "left" ? LEFT : RIGHT);
  rows.append("text")
    .attr("x", (t, i) => t.dir === "left" ? x(-share(t)) - 5 : x(share(t)) + 5)
    .attr("y", (t, i) => y(t, i) + rowH / 2).attr("dy", "0.35em")
    .attr("text-anchor", t => t.dir === "left" ? "end" : "start")
    .style("font-size", "11.5px").style("fill", "var(--text-primary)")
    .text(t => t.label || t.t);
  // Hit target: the whole row, wider than the mark.
  rows.append("rect")
    .attr("x", 0).attr("width", W).attr("y", (t, i) => y(t, i)).attr("height", rowH)
    .style("fill", "transparent")
    .on("mousemove", (event, t) => showTip(wordTip(t), event))
    .on("mouseleave", hideTip);

  // Drawn after the rows, so it must not swallow the hover at the bars' base.
  svg.append("line").attr("x1", x0).attr("x2", x0).attr("y1", topPad).attr("y2", topPad + top.length * rowH)
    .style("stroke", "var(--text-muted)").style("stroke-width", 1).style("pointer-events", "none");
  const axis = svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${topPad + top.length * rowH + 4})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(v => fmt(Math.abs(v), decimals) + "%").tickSizeOuter(0));
  axis.select(".domain").remove();
  svg.append("text").attr("x", x0).attr("y", H - 2).attr("text-anchor", "middle")
    .style("font-size", "10.5px").style("fill", "var(--text-muted)").text(S.axis);
}


/* ------------------------------------------------------- speech vocabulary */
/* Any two speakers, factions or sides, compared on the content words of their
 * speeches. The counts come from scripts/speech_vocabulary.py as a separate
 * file fetched on first use; the divergence is computed here by rtd.js, which
 * tests/test_dashboard_rtd.py holds to keyflux's numbers. */
let VOCAB = null, vocabLoading = null;

function loadVocab() {
  if (VOCAB) return Promise.resolve(VOCAB);
  if (!vocabLoading) {
    vocabLoading = d3.json(DATA.vocabulary.path).then(raw => {
      const byId = new Map();
      raw.entities.forEach(e => {
        let i = 0;
        e.index = e.gaps.map(g => (i += g));   // gaps -> absolute vocab indices
        byId.set(e.id, e);
      });
      VOCAB = { ...raw, byId, counts: new Map() };
      return VOCAB;
    });
  }
  return vocabLoading;
}

function vocabCounts(id) {
  if (!VOCAB.counts.has(id)) {
    const e = VOCAB.byId.get(id);
    VOCAB.counts.set(id, new Map(e.index.map((v, k) => [VOCAB.vocab[v], e.n[k]])));
  }
  return VOCAB.counts.get(id);
}

function vocabName(e) {
  const S = T.vocab;
  if (e.kind === "side") return S.sides[e.name] || e.name;
  if (e.kind === "group") return "Fidesz–KDNP";
  if (e.kind === "faction") return e.name;
  return `${e.name} (${e.faction || S.noFaction})`;
}

function renderVocab() {
  const section = document.getElementById("vocab-section");
  if (!DATA || !DATA.vocabulary) { section.classList.add("hidden"); return; }
  const S = T.vocab, A = T.allotax;
  document.getElementById("vocab-lede").textContent = S.lede;
  document.getElementById("vocab-a-label").textContent = S.left;
  document.getElementById("vocab-b-label").textContent = S.right;
  document.getElementById("vocab-swap").setAttribute("aria-label", S.swap);
  document.getElementById("vocab-diamond-title").textContent = A.diamondTitle;
  document.getElementById("vocab-shift-title").textContent = A.shiftTitle;
  document.getElementById("vocab-table-summary").textContent = A.tableSummary;
  const note = document.getElementById("vocab-caption");
  if (!VOCAB) note.textContent = S.loading;
  loadVocab().then(V => {
    const selA = document.getElementById("vocab-a"), selB = document.getElementById("vocab-b");
    if (!selA.options.length) {
      const fill = sel => {
        ["side", "group", "faction", "person"].forEach(kind => {
          const og = document.createElement("optgroup");
          og.label = S.groups[kind];
          V.entities.filter(e => e.kind === kind).forEach(e => og.appendChild(new Option(vocabName(e), e.id)));
          sel.appendChild(og);
        });
      };
      fill(selA); fill(selB);
      const params = new URLSearchParams(location.search);
      selA.value = V.byId.has(params.get("va")) ? params.get("va") : "faction:TISZA";
      selB.value = V.byId.has(params.get("vb")) ? params.get("vb") : "faction:Fidesz";
      const changed = () => {
        const url = new URL(location.href);
        url.searchParams.set("va", selA.value); url.searchParams.set("vb", selB.value);
        history.replaceState(null, "", url);
        drawVocab();
      };
      selA.onchange = changed; selB.onchange = changed;
      document.getElementById("vocab-swap").onclick = () => {
        [selA.value, selB.value] = [selB.value, selA.value];
        changed();
      };
    }
    drawVocab();
  });

  function drawVocab() {
    const a = document.getElementById("vocab-a").value, b = document.getElementById("vocab-b").value;
    const eA = VOCAB.byId.get(a), eB = VOCAB.byId.get(b);
    const L = { name: vocabName(eA), short: eA.kind === "person" ? eA.name : vocabName(eA) };
    const R = { name: vocabName(eB), short: eB.kind === "person" ? eB.name : vocabName(eB) };
    const diamond = document.getElementById("vocab-diamond"), shift = document.getElementById("vocab-shift");
    const caption = document.getElementById("vocab-caption");
    if (a === b) {
      diamond.innerHTML = ""; shift.innerHTML = ""; d3.select("#vocab-table").html("");
      document.getElementById("vocab-legend").innerHTML = "";
      caption.textContent = S.same;
      return;
    }
    const alpha = DATA.vocabulary.params.alpha;
    const result = rtd(vocabCounts(a), vocabCounts(b), alpha);
    const label = new Map(VOCAB.vocab.map((t, i) => [t, VOCAB.labels[i] || t]));
    result.types.forEach(t => { t.label = label.get(t.t) || t.t; });
    const cmp = { divergence: result.divergence, alpha };
    const share = t => t.contrib / result.divergence * 100;
    const sideName = t => t.dir === "left" ? L.short : t.dir === "right" ? R.short : "—";
    const wordTip = t =>
      `<strong>${t.label}</strong> · ${A.towards(sideName(t))}<br>` +
      `${L.short}: ${t.c1} ${A.count}, ${A.rank} ${fmt(t.r1, 1)}<br>` +
      `${R.short}: ${t.c2} ${A.count}, ${A.rank} ${fmt(t.r2, 1)}<br>` +
      `${A.share}: ${fmt(share(t), 2)}%`;
    drawAllotaxDiamond(diamond, result.types, cmp, L, R, "var(--series-1)", "var(--series-2)", A, wordTip,
      document.getElementById("vocab-legend"));
    const top = result.types.filter(t => t.dir !== "shared").slice(0, 25);
    drawWordShift(shift, top, share, "var(--series-1)", "var(--series-2)", A, wordTip);

    caption.textContent = S.caption(fmt(result.divergence, 3),
      { name: L.name, speeches: fmt(eA.speeches, 0), tokens: fmt(eA.tokens, 0) },
      { name: R.name, speeches: fmt(eB.speeches, 0), tokens: fmt(eB.tokens, 0) });
    const refs = Object.entries(DATA.vocabulary.reference_rtd).slice(0, 2).map(([pair, v]) =>
      pair.split("|").map(id => vocabName(VOCAB.byId.get(id))).join(" ↔ ") + " " + fmt(v, 3));
    document.getElementById("vocab-note").textContent =
      S.scale(refs) + " " +
      S.threshold(VOCAB.entities.filter(e => e.kind === "person").length, DATA.vocabulary.params.min_tokens) +
      " " + S.computed + " " + S.names;

    const table = d3.select("#vocab-table").html("");
    table.append("thead").append("tr").selectAll("th").data(A.tableHead).join("th")
      .text(d => d).style("cursor", "default");
    table.append("tbody").selectAll("tr").data(top).join("tr").html(t =>
      `<td>${t.label}</td><td>${sideName(t)}</td><td class="num">${t.c1}</td>` +
      `<td class="num">${t.c2}</td><td class="num">${fmt(t.r1, 1)}</td>` +
      `<td class="num">${fmt(t.r2, 1)}</td><td class="num">${fmt(share(t), 2)}%</td>`);
  }
}
