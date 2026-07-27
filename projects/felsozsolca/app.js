// Felsőzsolca inspection dashboard — wiring.
//
// Loads the generated JSON in internal/data/ and renders it. No build step, no
// framework, no network call except the OSM basemap tiles when a map is present.

import {
  comparisonRows,
  divergingBars,
  dumbbell,
  indexedLines,
  lines,
  rampLegend,
  stripes,
  table,
} from "./charts.js";
import { clearImagery, renderMap, renderMapLegend, setImagery } from "./mapview.js";

const $ = (sel) => document.querySelector(sel);

async function load(name) {
  const res = await fetch(`./data/${name}.json`);
  if (!res.ok) throw new Error(`${name}.json: ${res.status}`);
  return res.json();
}

// --- theme ------------------------------------------------------------------
// A viewer's explicit choice must beat the OS setting both ways, so the toggle
// stamps data-theme on <html> rather than relying on the media query alone.

function initTheme() {
  const btn = $("#theme");
  const apply = (mode) => {
    document.documentElement.dataset.theme = mode;
    btn.textContent = mode === "dark" ? "Világos" : "Sötét";
    btn.setAttribute("aria-pressed", mode === "dark");
  };
  // ?theme=light|dark forces a mode. Both modes have to be checked on every
  // change — dark is a separately chosen set of steps, not a flip of light — and
  // a URL switch makes that scriptable instead of a manual click.
  const forced = new URLSearchParams(location.search).get("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  apply(forced || localStorage.getItem("theme") || (prefersDark ? "dark" : "light"));
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    apply(next);
    render();
  });
}

// --- climate ----------------------------------------------------------------

let climate;

function renderClimate() {
  const node = $("#climate-charts");
  node.innerHTML = "";

  const years = climate.years;
  const anomalies = climate.anomaly_c;
  // Symmetric domain: a diverging scale whose arms differ in length would make a
  // +1.0 look bigger or smaller than a −1.0, which is exactly the comparison the
  // chart exists to support.
  const maxAbs = Math.ceil(Math.max(...anomalies.map(Math.abs)) * 2) / 2;
  const fmt = (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} °C`;

  const legendWrap = document.createElement("div");
  legendWrap.className = "legend";
  node.appendChild(legendWrap);
  rampLegend(legendWrap, { maxAbs, unit: "°C" });

  const stripFig = document.createElement("figure");
  node.appendChild(stripFig);
  stripes(stripFig, { years, values: anomalies, maxAbs, format: fmt });
  const cap1 = document.createElement("figcaption");
  cap1.innerHTML =
    `Egy sáv egy év, ${years[0]}–${years[years.length - 1]}. A szín az eltérés az ` +
    `${climate.baseline.first}–${climate.baseline.last}-es átlagtól ` +
    `(${climate.baseline.mean_c.toFixed(2)} °C). ` +
    `<strong>Ez a forma csak színnel közöl</strong> — nyomdai, szürkeárnyalatos ` +
    `használatra az alatta lévő oszlopdiagram való.`;
  stripFig.appendChild(cap1);

  const barFig = document.createElement("figure");
  node.appendChild(barFig);
  divergingBars(barFig, { years, values: anomalies, maxAbs, format: fmt, unit: "°C" });
  const cap2 = document.createElement("figcaption");
  cap2.textContent =
    "Ugyanaz az adat tengellyel. Ez a változat szürkeárnyalatban is olvasható.";
  barFig.appendChild(cap2);
}

function renderClimateTable() {
  const node = $("#climate-table");
  node.innerHTML = "";
  table(node, {
    columns: ["Év", "Évi közép (°C)", "Eltérés (°C)"],
    rows: climate.years.map((y, i) => [
      String(y),
      climate.mean_c[i].toFixed(2),
      (climate.anomaly_c[i] >= 0 ? "+" : "−") + Math.abs(climate.anomaly_c[i]).toFixed(2),
    ]),
  });
}

function renderClimateMeta() {
  $("#climate-sub").textContent = climate.subtitle;
  const src = $("#climate-source");
  src.innerHTML =
    `${climate.attribution} · Homogenizált napi adatsor, ` +
    `<a href="${climate.source_url}">odp.met.hu</a> · letöltve ${climate.accessed}.`;
  const ul = $("#climate-caveats");
  ul.innerHTML = "";
  for (const c of climate.caveats) {
    const li = document.createElement("li");
    li.textContent = c;
    ul.appendChild(li);
  }
}

// --- table toggles ----------------------------------------------------------

function initToggles() {
  for (const btn of document.querySelectorAll("[data-toggle]")) {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.toggle);
      const shown = !target.classList.toggle("hidden");
      btn.setAttribute("aria-pressed", String(shown));
    });
  }
}

// --- population and dwellings -----------------------------------------------

let ksh;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderKsh() {
  const node = $("#ksh-chart");
  node.innerHTML = "";
  const fig = document.createElement("figure");
  node.appendChild(fig);

  const legend = $("#ksh-legend");
  legend.innerHTML = "";
  const series = [
    { label: "Lakások", values: ksh.dwellings_index, raw: ksh.dwellings,
      color: cssVar("--series-2"), census: ksh.census },
    { label: "Népesség", values: ksh.population_index, raw: ksh.population,
      color: cssVar("--series-1"), census: ksh.census },
  ];
  // Hungary over the same years, faint, so the town stays the subject.
  if (ksh.national) {
    series.push(
      { label: "Lakások — Mo.", values: ksh.national.dwellings_index,
        raw: ksh.national.dwellings_index, color: cssVar("--text-muted"),
        dash: "5,4", faint: true },
      { label: "Népesség — Mo.", values: ksh.national.population_index,
        raw: ksh.national.population_index, color: cssVar("--text-muted"),
        dash: "2,3", faint: true },
    );
  }
  for (const s of series) {
    const item = document.createElement("span");
    item.className = "item";
    item.innerHTML =
      `<span class="chip" style="background:${s.color}"></span><span>${s.label}</span>`;
    legend.appendChild(item);
  }
  const dot = document.createElement("span");
  dot.className = "item";
  dot.style.color = "var(--text-muted)";
  dot.textContent = "● = népszámlálás (mért érték, nem becslés)";
  legend.appendChild(dot);

  indexedLines(fig, {
    years: ksh.years,
    series,
    baseYear: ksh.base_year,
    marker: { year: ksh.flood_year, label: "2010 árvíz" },
    format: (v) => v.toLocaleString("hu-HU"),
  });
}

function renderKshMeta() {
  $("#ksh-sub").textContent = ksh.subtitle;
  const peak = ksh.population.indexOf(Math.max(...ksh.population));
  const hu = (v) => v.toLocaleString("hu-HU");
  $("#ksh-caption").innerHTML =
    `A két sor szétnyílása a lényeg: a lakásszám 1990 óta ` +
    `<strong>${hu(ksh.dwellings[0])}</strong>-ról ` +
    `<strong>${hu(ksh.dwellings[ksh.dwellings.length - 1])}</strong>-re nőtt, ` +
    `a népesség ${ksh.years[peak]}-ben tetőzött (${hu(ksh.population[peak])}), ` +
    `és azóta ${hu(ksh.population[ksh.population.length - 1])}-re esett. ` +
    `Több lakás, kevesebb ember.<br><br>` +
    (ksh.national
      ? `<strong>De mihez képest?</strong> Magyarország népessége ugyanezen évek ` +
        `alatt ${ksh.national.population_index[ksh.national.population_index.length - 1]}-re ` +
        `esett (1990 = 100), Felsőzsolcáé ` +
        `${ksh.population_index[ksh.population_index.length - 1]}-re — ` +
        `<strong>gyakorlatilag ugyanannyira</strong>. A fogyás tehát országos ` +
        `jelenség, nem felsőzsolcai. A lakásállomány viszont eltér: az országos ` +
        `${ksh.national.dwellings_index[ksh.national.dwellings_index.length - 1]}-cel ` +
        `szemben itt csak ${ksh.dwellings_index[ksh.dwellings_index.length - 1]} — ` +
        `nagyjából fele annyi épült, mint az országos ütem. Az országos lakássor ` +
        `1990 és 2000 között hiányzik a KSH-nál, ezért ott megszakad a vonal.<br><br>`
      : "") +
    `<strong>Amit ez az ábra nem mutat meg:</strong> a 2011-es népszámláláskor a ` +
    `lakásszám 70-nel kevesebb az előző évi becslésnél — csakhogy 2001-ben, árvíz ` +
    `nélkül, 59-cel volt kevesebb. A népszámlálás újraalapozza a két összeírás ` +
    `közötti becsléseket, ezért ebből a sorból <em>nem</em> lehet szétválasztani az ` +
    `árvíz pusztítását a statisztikai korrekciótól. A 270 összedőlt házhoz külön ` +
    `forrás kell.`;
  $("#ksh-source").innerHTML =
    `${ksh.attribution} · <a href="${ksh.source_url}">ksh.hu</a> · letöltve ${ksh.accessed}.`;
}

function renderKshTable() {
  const node = $("#ksh-table");
  node.innerHTML = "";
  table(node, {
    columns: ["Időpont", "Népesség", "Lakások", "Terület (ha)"],
    rows: ksh.dates.map((d, i) => [
      d + (ksh.census[i] ? " ●" : ""),
      ksh.population[i].toLocaleString("hu-HU"),
      ksh.dwellings[i].toLocaleString("hu-HU"),
      String(ksh.area_ha[i]),
    ]),
  });
}

// --- economy ----------------------------------------------------------------

let economy;

function renderEconomy() {
  const hu = (v) => v.toLocaleString("hu-HU");

  // Census 2011 vs 2022 — before and after per item, one shared axis.
  const dbNode = $("#census-chart");
  dbNode.innerHTML = "";
  const dbLegend = $("#census-legend");
  dbLegend.innerHTML = "";
  for (const [label, varname] of [["2011", "--era-before"], ["2022", "--era-after"]]) {
    const item = document.createElement("span");
    item.className = "item";
    item.innerHTML =
      `<span class="chip" style="background:var(${varname});border-radius:50%"></span>` +
      `<span>${label}. évi népszámlálás</span>`;
    dbLegend.appendChild(item);
  }
  const ref = document.createElement("span");
  ref.className = "item";
  ref.innerHTML =
    `<svg width="20" height="10"><line x1="1" y1="5" x2="19" y2="5" ` +
    `stroke="var(--text-muted)" stroke-width="2" opacity="0.55"/></svg>` +
    `<span>ugyanez ${economy.county_name} vármegyében</span>`;
  dbLegend.appendChild(ref);
  const dbFig = document.createElement("figure");
  dbNode.appendChild(dbFig);
  dumbbell(dbFig, {
    rows: economy.comparison
      .filter((c) => c.unit === "%")
      .map((c) => ({
        label: c.label,
        before: c.before,
        after: c.after,
        refBefore: c.county_before,
        refAfter: c.county_after,
        refLabel: economy.county_name,
      })),
    labels: ["2011", "2022"],
    domain: [0, 100],
    format: (v) => `${v.toFixed(1)}%`,
  });

  // Real quantities, indexed. No money on this chart: see the caption.
  const trNode = $("#trend-chart");
  trNode.innerHTML = "";
  const trLegend = $("#trend-legend");
  trLegend.innerHTML = "";
  const slots = ["--series-1", "--series-2", "--series-3", "--series-4"];
  const series = economy.trend.map((t, i) => ({
    label: t.label,
    values: t.index,
    raw: t.raw,
    color: cssVar(slots[i % slots.length]),
  }));
  for (const s of series) {
    const item = document.createElement("span");
    item.className = "item";
    item.innerHTML =
      `<span class="chip" style="background:${s.color}"></span><span>${s.label}</span>`;
    trLegend.appendChild(item);
  }
  const trFig = document.createElement("figure");
  trNode.appendChild(trFig);
  indexedLines(trFig, {
    years: economy.years,
    series,
    baseYear: economy.base_year,
    marker: null,
    format: (v) => hu(v),
  });
}

function renderEconomyMeta() {
  const find = (code) => economy.comparison.find((c) => c.code === code);
  const emp = find("TYWD001");
  const age = find("TYWB001");
  const rooms = find("TYWH005");
  const nocomfort = find("TYWH009");

  const cEmp = economy.comparison.find((c) => c.code === "TYWD001");
  const townMove = cEmp.after - cEmp.before;
  const countyMove = (cEmp.county_after ?? 0) - (cEmp.county_before ?? 0);
  $("#census-sub").innerHTML =
    `A két népszámlálás közötti változás, a vármegye ugyanezen mozgásával együtt ` +
    `(halvány vonal).`;
  $("#census-caption").innerHTML =
    `<strong>A legfontosabb, amit a halvány vonal elárul.</strong> ` +
    `A foglalkoztatottság Felsőzsolcán ${cEmp.before}%-ról ${cEmp.after}%-ra nőtt ` +
    `(+${townMove.toFixed(1)}), ${economy.county_name} vármegyében viszont ` +
    `${cEmp.county_before}%-ról ${cEmp.county_after}%-ra (+${countyMove.toFixed(1)}). ` +
    `A javulás tehát <strong>nem felsőzsolcai, hanem országos jelenség</strong> — ` +
    `a település még valamivel kevesebbet is mozdult, mint a környezete. ` +
    `Baseline nélkül ez az ábra pont az ellenkezőjét sugallná.<br><br>` +
    `A lakásminőség is elmozdult: a négy- vagy többszobás lakások aránya ` +
    `${rooms.before}%-ról ${rooms.after}%-ra, a komfort nélkülieké ` +
    `${nocomfort.before}%-ról ${nocomfort.after}%-ra. Ez a két népszámlálás az árvíz ` +
    `két oldalán van, de a KSH nem bontja meg, mennyi ebből az újjáépítés — az ` +
    `összefüggés valószínű, nem bizonyított.<br><br>` +
    `Nem szerepel az ábrán, mert nem százalék: az <strong>öregedési index</strong> ` +
    `${age.before}-ról <strong>${age.after}</strong>-ra nőtt.`;

  const inc = economy.income;
  $("#trend-sub").textContent =
    `Valós mennyiségek, ${economy.base_year} = 100. Mind a négy „ezer lakosra” ` +
    `vagy „tízezer lakosra” vetített arány, nem darabszám.`;
  $("#trend-caption").innerHTML =
    `Több autó, több vállalkozás, több internet — és <strong>kevesebb bolt</strong>. ` +
    `Mind a négy arányszám, nem darabszám: a népesség ugyanezen évek alatt csökkent, ` +
    `így egy emelkedő arány nem feltétlenül jelent több darabot.<br><br>` +
    `A jövedelem külön ábrán van, mert forintban mérjük és inflációt kell kezelni ` +
    `hozzá — indexelve idetéve elnyomná a többi négyet.`;

  for (const id of ["#census-source", "#trend-source"]) {
    $(id).innerHTML =
      `${economy.attribution} · <a href="${economy.licence_url}">${economy.licence}</a> ` +
      `· letöltve ${economy.accessed}. Minden érték arányszám, nem darabszám.`;
  }
}

function renderEconomyTable() {
  const node = $("#economy-table");
  node.innerHTML = "";
  table(node, {
    columns: ["Mutató", "2011", "2022", "Változás"],
    rows: economy.comparison.map((c) => [
      c.label,
      `${c.before}${c.unit}`,
      `${c.after}${c.unit}`,
      `${c.after - c.before >= 0 ? "+" : "−"}${Math.abs(c.after - c.before).toFixed(1)}`,
    ]),
  });
  const t2 = document.createElement("div");
  node.appendChild(t2);
  table(t2, {
    columns: ["Év", ...economy.trend.map((t) => t.label)],
    rows: economy.years.map((y, i) => [
      String(y),
      ...economy.trend.map((t) => String(t.raw[i])),
    ]),
  });
}

// --- baseline comparison ----------------------------------------------------

function renderBaseline() {
  const rows = economy?.baseline;
  if (!rows?.length) return;
  const node = $("#baseline-chart");
  node.innerHTML = "";

  const legend = $("#baseline-legend");
  legend.innerHTML = "";
  const marks = [
    ["Felsőzsolca", `<span class="chip" style="background:var(--series-1);border-radius:50%"></span>`],
    [`${economy.district_name} járás`, `<svg width="14" height="14"><line x1="7" y1="1" x2="7" y2="13" stroke="var(--text-secondary)" stroke-width="2"/></svg>`],
    [`${economy.county_name} vármegye`, `<svg width="14" height="14"><line x1="7" y1="1" x2="7" y2="13" stroke="var(--text-muted)" stroke-width="2"/></svg>`],
    ["országos középső 50%", `<span class="chip" style="background:var(--gridline)"></span>`],
  ];
  for (const [label, mark] of marks) {
    const item = document.createElement("span");
    item.className = "item";
    item.innerHTML = `${mark}<span>${label}</span>`;
    legend.appendChild(item);
  }

  const fig = document.createElement("figure");
  node.appendChild(fig);
  const top = Math.max(160, ...rows.map((r) => r.town_pct ?? 0));
  comparisonRows(fig, {
    rows: rows.map((r) => ({
      label: r.label,
      year: r.year,
      town: r.town_pct,
      district: r.district_pct,
      county: r.county_pct,
      p25: r.p25_pct,
      p75: r.p75_pct,
      percentile: r.percentile,
      reporting: r.settlements_reporting,
      townRaw: r.town,
      districtRaw: r.district,
      countyRaw: r.county,
      medianRaw: r.median,
    })),
    domain: [0, Math.ceil(top / 50) * 50],
    labels: {
      town: "Felsőzsolca",
      district: `${economy.district_name} járás`,
      county: `${economy.county_name}`,
    },
    format: (v) => (v == null ? "–" : v.toLocaleString("hu-HU")),
  });
}

function renderBaselineMeta() {
  const rows = economy?.baseline;
  if (!rows?.length) return;
  const by = (code) => rows.find((r) => r.code === code);
  const emp = by("TYWD001");
  const shops = by("TYWF001");
  const grad = by("TYWG004");

  $("#baseline-sub").innerHTML =
    `Minden mutató az országos mediánhoz mérve (=100), a járás és a vármegye ` +
    `értékével együtt. A sáv az ország középső 50%-a, tehát ami azon kívül esik, ` +
    `az tényleg szokatlan.`;
  $("#baseline-caption").innerHTML =
    `<strong>Miért kell ez.</strong> A foglalkoztatottság ${emp.town}%, az országos ` +
    `medián ${emp.median}% — vagyis Felsőzsolca <strong>pontosan átlagos</strong> ` +
    `(${Math.round(emp.percentile)}. percentilis), holott a vármegyéhez képest jól áll. ` +
    `Egyetlen viszonyítási alappal mindkét ellentétes állítás „igazolható”.<br><br>` +
    `Ami tényleg kilóg: <strong>diplomások ${grad.town}%</strong> az országos ` +
    `${grad.median}%-kal szemben (${Math.round(grad.percentile)}. percentilis), és a ` +
    `<strong>kiskereskedelmi ellátottság</strong>, ami a járásénak nagyjából a fele ` +
    `(${shops.town} vs ${shops.district}) — magas jövedelem, kevés bolt: ` +
    `a lakók Miskolcon vásárolnak.<br><br>` +
    `<em>A színek nem minősítenek.</em> A kevesebb bolt nem egyértelműen rosszabb, ` +
    `és az alacsonyabb munkanélküliség más irányba mutat, mint az alacsonyabb ` +
    `autószám. Az ábra helyzetet mutat, az értékelés az olvasóé.`;
  $("#baseline-source").innerHTML =
    `${economy.attribution} · ${rows[0].settlements_queried} település, ` +
    `járási és vármegyei szint ugyanabból a szolgáltatásból · ` +
    `<a href="${economy.licence_url}">${economy.licence}</a> · letöltve ${economy.accessed}.`;
}

// --- income, nominal against real -------------------------------------------

let incomeBase = "real_at_end";

function renderIncome() {
  const inc = economy?.income;
  if (!inc) return;
  const node = $("#income-chart");
  node.innerHTML = "";

  // Emphasis, not two categories: the real series is the point and the nominal one
  // is context showing what the currency did. Grey recedes, blue carries the eye.
  const series = [
    { label: "folyó áron", values: inc.nominal, color: cssVar("--text-muted"),
      dash: "6,4" },
    {
      label: incomeBase === "real_at_end"
        ? `változatlan áron (${inc.real_end_year})`
        : `változatlan áron (${inc.real_start_year})`,
      values: inc[incomeBase],
      color: cssVar("--series-1"),
      emphasis: true,
    },
  ];

  const legend = $("#income-legend");
  legend.innerHTML = "";
  for (const s of series) {
    const item = document.createElement("span");
    item.className = "item";
    item.innerHTML =
      `<span class="chip" style="background:${s.color}"></span><span>${s.label}</span>`;
    legend.appendChild(item);
  }

  const fig = document.createElement("figure");
  node.appendChild(fig);
  lines(fig, {
    years: inc.years,
    series,
    unit: "ezer Ft",
    format: (v) => Math.round(v).toLocaleString("hu-HU"),
  });

  for (const b of document.querySelectorAll("#income-bar [data-base]")) {
    b.setAttribute("aria-pressed", String(b.dataset.base === incomeBase));
  }
}

function buildIncomeBar() {
  const inc = economy?.income;
  if (!inc) return;
  const bar = $("#income-bar");
  bar.innerHTML = "";
  for (const [key, label] of [
    ["real_at_end", `${inc.real_end_year} forintban (mai érték)`],
    ["real_at_start", `${inc.real_start_year} forintban (induló érték)`],
  ]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.base = key;
    b.addEventListener("click", () => {
      incomeBase = key;
      renderIncome();
    });
    bar.appendChild(b);
  }
}

function renderIncomeMeta() {
  const inc = economy?.income;
  if (!inc) return;
  const first = inc.years[0];
  const last = inc.years[inc.years.length - 1];
  const nomX = inc.nominal[inc.nominal.length - 1] / inc.nominal[0];
  const realX = inc.real_at_end[inc.real_at_end.length - 1] / inc.real_at_end[0];
  const hu = (v) => Math.round(v).toLocaleString("hu-HU");

  $("#income-sub").innerHTML =
    `Egy adófizetőre jutó SZJA-alapot képező jövedelem, ${first}–${last}. ` +
    `A két vonal közötti rés maga az infláció.`;
  $("#income-caption").innerHTML =
    `Folyó áron <strong>${nomX.toFixed(2)}-szeres</strong> a növekedés ` +
    `(${hu(inc.nominal[0])} → ${hu(inc.nominal[inc.nominal.length - 1])} ezer Ft). ` +
    `A fogyasztói árak ugyanezen évek alatt <strong>${inc.inflation_pct}%</strong>-kal ` +
    `nőttek, így reálértéken a növekedés <strong>${realX.toFixed(2)}-szeres</strong> — ` +
    `továbbra is jelentős, de nem a három.<br><br>` +
    `A két gomb ugyanazt a reálsort mutatja, csak más pénznemben: a mai és az induló ` +
    `év forintjában. Az arányok mindkettőben azonosak, csak a tengely felirata más — ` +
    `ezt tesztben is rögzítettük.`;
  $("#income-source").innerHTML =
    `${economy.attribution} · árindex: ` +
    `<a href="${inc.cpi_url}">${inc.cpi_attribution}</a> · ` +
    `<a href="${economy.licence_url}">${economy.licence}</a> · letöltve ${economy.accessed}.`;
}

// --- map --------------------------------------------------------------------

let geo;
let imagery;
let currentYear = null;
let currentStyle = "true";

function satCaption(entry) {
  const node = $("#sat-caption");
  if (!entry) {
    node.textContent =
      "Nincs műholdkép kiválasztva — csak az OSM alaptérkép és a vektorrétegek.";
    return;
  }
  const platform = entry.platform.replace("landsat-", "Landsat ");
  node.innerHTML =
    `<strong>${entry.date}</strong> · ${platform} · ${imagery.ground_res_m} m-es ` +
    `képpont · a település fölött ${entry.town_obstructed_pct}% takarás · ` +
    `${imagery.styles[currentStyle]}. ` +
    `${imagery.attribution}.`;
}

function selectYear(year) {
  currentYear = year;
  const entry = year === null ? (clearImagery(), null) : setImagery(year, currentStyle);
  satCaption(entry);
  for (const b of document.querySelectorAll("#yearbar [data-year]")) {
    b.setAttribute("aria-pressed", String(Number(b.dataset.year) === year));
  }
  for (const b of document.querySelectorAll("#yearbar [data-style]")) {
    b.setAttribute("aria-pressed", String(b.dataset.style === currentStyle));
  }
}

function buildYearBar() {
  const bar = $("#yearbar");
  bar.innerHTML = "";
  const off = document.createElement("button");
  off.textContent = "Nincs kép";
  off.dataset.year = "";
  off.addEventListener("click", () => selectYear(null));
  bar.appendChild(off);
  bar.appendChild(Object.assign(document.createElement("span"), { className: "sep" }));

  for (const entry of imagery.years) {
    const b = document.createElement("button");
    b.textContent = entry.year;
    b.dataset.year = entry.year;
    // 2009 / 2010 / 2011 bracket the June 2010 flood: before, one month after,
    // and the following summer. Marked so they are easy to step between.
    if ([2009, 2010, 2011].includes(entry.year)) b.classList.add("flood");
    b.title = `${entry.date} · ${entry.platform}`;
    b.addEventListener("click", () => selectYear(entry.year));
    bar.appendChild(b);
  }

  bar.appendChild(Object.assign(document.createElement("span"), { className: "sep" }));
  for (const [key, label] of Object.entries(imagery.styles)) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.style = key;
    b.addEventListener("click", () => {
      currentStyle = key;
      selectYear(currentYear);
    });
    bar.appendChild(b);
  }
}

function drawMap() {
  renderMapLegend($("#map-legend"), geo);
  renderMap($("#map"), geo, imagery);
  if (imagery) {
    buildYearBar();
    selectYear(currentYear ?? imagery.years[imagery.years.length - 1].year);
  }
}

function renderGeoMeta() {
  const p = geo.river_proximity;
  $("#map-sub").textContent =
    `A 0. fázisban elfogadott határ, az OSM mai infrastruktúrájával. ` +
    `A rétegek jobbra kapcsolhatók.`;
  $("#map-caption").innerHTML =
    `A pirossal kiemelt szakasz a határ azon része, amely ${p.tolerance_m} méteren ` +
    `belül fut a ${geo.river}hoz: a hossz <strong>${(p.fraction * 100).toFixed(1)}%</strong>-a, ` +
    `és a település szélességének nyugati ${(p.eastern_edge * 100).toFixed(0)}%-án belül marad. ` +
    `<strong>A dátumok azt mutatják, mikor került az elem a térképre, nem azt, mikor épült.</strong>`;
  $("#map-source").innerHTML =
    `${geo.attribution} (${geo.licence}) · Overpass, letöltve ${geo.accessed}.`;
}

function render() {
  if (climate) renderClimate();
  if (ksh) renderKsh();
  if (economy) { renderEconomy(); renderBaseline(); renderIncome(); }
  if (geo) drawMap();
}

async function main() {
  initTheme();
  initToggles();
  try {
    climate = await load("climate");
    renderClimateMeta();
    renderClimate();
    renderClimateTable();
  } catch (err) {
    $("#climate-charts").textContent = `Nem sikerült betölteni: ${err.message}`;
  }
  try {
    ksh = await load("ksh");
    renderKshMeta();
    renderKsh();
    renderKshTable();
  } catch (err) {
    $("#ksh-chart").textContent = `Nem sikerült betölteni: ${err.message}`;
  }
  try {
    economy = await load("economy");
    renderEconomyMeta();
    renderEconomy();
    renderEconomyTable();
    renderBaselineMeta();
    renderBaseline();
    buildIncomeBar();
    renderIncomeMeta();
    renderIncome();
  } catch (err) {
    $("#census-chart").textContent = `Nem sikerült betölteni: ${err.message}`;
  }
  try {
    geo = await load("geo");
    renderGeoMeta();
    try {
      imagery = await load("imagery");
    } catch {
      imagery = null; // the map is still worth having without the satellite layer
    }
    drawMap();
  } catch (err) {
    $("#map-sub").textContent = `A térkép nem töltődött be: ${err.message}`;
  }
}

main();
