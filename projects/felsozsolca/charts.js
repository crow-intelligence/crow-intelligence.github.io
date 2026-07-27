// Chart primitives for the Felsőzsolca inspection dashboard.
//
// Hand-rolled SVG rather than a chart library. The forms needed here are few, and
// the book they feed may be printed in greyscale in places — a default chart theme
// would fight that the whole way.
//
// Rules held to throughout, from the project's data-visualisation guidance:
//   - colour follows the entity, never its rank;
//   - a diverging scale has two opposite poles and a NEUTRAL midpoint;
//   - text wears ink tokens, never the series colour;
//   - every chart has a table-view twin, so no value is reachable only by hover;
//   - marks are thin, grid and axes are recessive hairlines.

const NS = "http://www.w3.org/2000/svg";

export function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  }
  if (parent) parent.appendChild(node);
  return node;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// --- colour -----------------------------------------------------------------
//
// Interpolation happens in OKLab, not sRGB. A straight RGB blend between blue and
// a warm grey passes through a muddy purple and compresses the middle of the
// scale, which on a stripes chart is exactly where the reader is trying to tell
// one decade from another.

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}
function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
export function mix(hexA, hexB, t) {
  const A = rgbToOklab(hexToRgb(hexA));
  const B = rgbToOklab(hexToRgb(hexB));
  return rgbToHex(oklabToRgb(A.map((v, i) => v + (B[i] - v) * t)));
}

/** Diverging colour for a signed value, symmetric about zero. */
export function diverging(value, maxAbs) {
  const cold = cssVar("--diverge-cold");
  const warm = cssVar("--diverge-warm");
  const neutral = cssVar("--diverge-neutral");
  const t = Math.min(1, Math.abs(value) / maxAbs);
  return mix(neutral, value >= 0 ? warm : cold, t);
}

// --- shared chrome ----------------------------------------------------------

let tip;
function tooltip() {
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "tooltip";
    document.body.appendChild(tip);
  }
  return tip;
}
function showTip(html, evt) {
  const t = tooltip();
  t.innerHTML = html;
  t.dataset.show = "1";
  const pad = 14;
  t.style.left = Math.min(evt.clientX + pad, window.innerWidth - t.offsetWidth - 8) + "px";
  t.style.top = Math.max(evt.clientY - t.offsetHeight - pad, 8) + "px";
}
function hideTip() {
  if (tip) tip.dataset.show = "0";
}

/**
 * Hatching for the accessibility / print channel. The ARM ANGLE carries the
 * diverging sign — 45° for warm, 135° for cool — so the encoding survives being
 * photocopied, which colour does not.
 */
function ensureTexture(svg) {
  let defs = svg.querySelector("defs");
  if (defs) return;
  defs = el("defs", {}, svg);
  for (const [id, angle] of [["hatch-warm", 45], ["hatch-cold", 135]]) {
    const p = el(
      "pattern",
      { id, width: 6, height: 6, patternUnits: "userSpaceOnUse",
        patternTransform: `rotate(${angle})` },
      defs,
    );
    el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "currentColor", "stroke-width": 2 }, p);
  }
}

// --- warming stripes --------------------------------------------------------

/**
 * One cell per year, coloured by anomaly. The classic Ed Hawkins form.
 *
 * It is colour-only by construction, which is precisely why it never ships alone
 * here: `divergingBars` below plots the same numbers against a real axis, and the
 * table view carries every value. The stripes are for impact; the bars are what
 * survives greyscale.
 */
export function stripes(node, { years, values, maxAbs, format }) {
  const H = 120;              // the coloured band
  const AXIS = 22;            // room for the decade ticks BELOW it
  const W = years.length * 8;
  // The viewBox includes the axis band. Sizing a chart to the plot alone and
  // letting the labels spill is a known way to end up with text landing on the
  // caption underneath. And no preserveAspectRatio="none": stretching the box to
  // fill the width would stretch the tick text with it.
  const svg = el("svg", { viewBox: `0 0 ${W} ${H + AXIS}`,
                          role: "img", "aria-label": "Éves hőmérsékleti anomália, színsávok" }, node);
  ensureTexture(svg);
  const w = W / years.length;
  years.forEach((year, i) => {
    const v = values[i];
    const r = el("rect", {
      x: i * w, y: 0, width: w, height: H,
      fill: diverging(v, maxAbs),
      tabindex: 0,
      role: "graphics-symbol",
      "aria-label": `${year}: ${format(v)}`,
    }, svg);
    const label = `<strong>${year}</strong><br>${format(v)}`;
    r.addEventListener("pointerenter", (e) => showTip(label, e));
    r.addEventListener("pointermove", (e) => showTip(label, e));
    r.addEventListener("pointerleave", hideTip);
    r.addEventListener("focus", (e) => showTip(label, e));
    r.addEventListener("blur", hideTip);
  });
  // Decade ticks, so the strip is readable as time rather than as decoration.
  years.forEach((year, i) => {
    if (year % 20 !== 0) return;
    el("line", { x1: i * w, y1: H, x2: i * w, y2: H + 5, class: "axis-line" }, svg);
    const t = el("text", { x: i * w, y: H + 16, "text-anchor": "middle" }, svg);
    t.textContent = year;
  });
  return svg;
}

// --- diverging bars ---------------------------------------------------------

/** The same data as `stripes`, against an axis. This is the greyscale-safe twin. */
export function divergingBars(node, { years, values, maxAbs, format, unit }) {
  const W = 900, H = 260;
  const m = { top: 10, right: 12, bottom: 26, left: 44 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
                          "aria-label": "Éves hőmérsékleti anomália, oszlopdiagram" }, node);
  ensureTexture(svg);
  const g = el("g", { transform: `translate(${m.left},${m.top})` }, svg);

  const y = (v) => ih / 2 - (v / maxAbs) * (ih / 2);
  const bw = iw / years.length;

  for (const tick of [-2, -1, 0, 1, 2]) {
    if (Math.abs(tick) > maxAbs) continue;
    el("line", { x1: 0, y1: y(tick), x2: iw, y2: y(tick),
                 class: tick === 0 ? "axis-line" : "gridline" }, g);
    const t = el("text", { x: -8, y: y(tick) + 4, "text-anchor": "end" }, g);
    t.textContent = tick > 0 ? `+${tick}` : `${tick}`;
  }
  const ul = el("text", { x: -8, y: -2, "text-anchor": "end" }, g);
  ul.textContent = unit;

  years.forEach((year, i) => {
    const v = values[i];
    // 2px surface gap between adjacent bars rather than a stroke around them.
    const r = el("rect", {
      x: i * bw + 1, width: Math.max(1, bw - 2),
      y: v >= 0 ? y(v) : y(0), height: Math.max(1, Math.abs(y(v) - y(0))),
      fill: diverging(v, maxAbs), rx: 1, tabindex: 0,
      role: "graphics-symbol", "aria-label": `${year}: ${format(v)}`,
    }, g);
    const label = `<strong>${year}</strong><br>${format(v)}`;
    r.addEventListener("pointerenter", (e) => showTip(label, e));
    r.addEventListener("pointermove", (e) => showTip(label, e));
    r.addEventListener("pointerleave", hideTip);
    r.addEventListener("focus", (e) => showTip(label, e));
    r.addEventListener("blur", hideTip);
  });

  years.forEach((year, i) => {
    if (year % 20 !== 0) return;
    const t = el("text", { x: i * bw + bw / 2, y: ih + 18, "text-anchor": "middle" }, g);
    t.textContent = year;
  });
  return svg;
}

/**
 * A round gridline interval giving roughly five or six lines across a range.
 *
 * A fixed step produces either three gridlines or nineteen depending on the data,
 * and nineteen hairlines behind four thin lines is noise the reader has to see past.
 */
function niceStep(range, target = 5) {
  if (!(range > 0)) return 1;
  const rough = range / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    if (magnitude * multiple >= rough) return magnitude * multiple;
  }
  return magnitude * 10;
}

// --- indexed lines ----------------------------------------------------------

/**
 * Two series rebased to a common year, on ONE axis.
 *
 * Population and dwelling stock differ by a factor of three. Giving them a y-axis
 * each is the single most common way a chart invents a relationship that is not in
 * the data — the alignment of the two scales is arbitrary, so the crossing point
 * means nothing. Indexed to a shared base, the gap between the lines is real.
 */
export function indexedLines(node, { years, series, baseYear, marker, format }) {
  const W = 900, H = 340;
  const m = { top: 16, right: 120, bottom: 34, left: 46 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
                          "aria-label": "Indexelt idősorok" }, node);
  const g = el("g", { transform: `translate(${m.left},${m.top})` }, svg);

  // Nulls must be filtered before Math.min/max: JavaScript coerces null to 0, so a
  // single gap in a series silently drags the axis down to zero and flattens every
  // line into the top eighth of the chart.
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  const step = niceStep(Math.max(...all) - Math.min(...all));
  const lo = Math.min(95, Math.floor(Math.min(...all) / step) * step);
  const hi = Math.max(105, Math.ceil(Math.max(...all) / step) * step);
  const x = (year) => ((year - years[0]) / (years[years.length - 1] - years[0])) * iw;
  const y = (v) => ih - ((v - lo) / (hi - lo)) * ih;

  for (let tick = lo; tick <= hi + 1e-9; tick += step) {
    const isBase = tick === 100;
    el("line", { x1: 0, y1: y(tick), x2: iw, y2: y(tick),
                 class: isBase ? "axis-line" : "gridline" }, g);
    const t = el("text", { x: -8, y: y(tick) + 4, "text-anchor": "end" }, g);
    t.textContent = tick;
  }

  // A fixed "every tenth year" rule labels exactly one tick on an eleven-year
  // span. Pick the interval from the span instead.
  const span = years[years.length - 1] - years[0];
  const yearStep = span > 25 ? 10 : span > 12 ? 5 : 2;
  for (const year of years) {
    if (year % yearStep !== 0) continue;
    const t = el("text", { x: x(year), y: ih + 20, "text-anchor": "middle" }, g);
    t.textContent = year;
  }

  // The flood, annotated on the chart rather than left to the caption. The step in
  // the dwelling series is the reason the chart is worth showing at all.
  if (marker) {
    el("line", { x1: x(marker.year), y1: 0, x2: x(marker.year), y2: ih,
                 stroke: "var(--text-muted)", "stroke-width": 1 }, g);
    const lab = el("text", { x: x(marker.year) + 5, y: 12,
                             fill: "var(--text-secondary)" }, g);
    lab.textContent = marker.label;
  }

  series.forEach((s) => {
    // Break the path at a missing year rather than bridging it. The national
    // dwelling series has no data between 1990 and 2000, and joining those two
    // points would draw a decade of steady growth nobody measured.
    let pen = "M";
    const d = years
      .map((yr, i) => {
        if (s.values[i] == null) {
          pen = "M";
          return "";
        }
        const seg = `${pen}${x(yr)} ${y(s.values[i])}`;
        pen = "L";
        return seg;
      })
      .join("");
    el("path", { d, fill: "none", stroke: s.color, "stroke-width": s.faint ? 1.5 : 2,
                 "stroke-dasharray": s.dash || null,
                 opacity: s.faint ? 0.85 : 1,
                 "stroke-linejoin": "round" }, g);
    // Census years are counts, not estimates; marking them says which points are
    // measurements and which are the interpolation between them.
    years.forEach((yr, i) => {
      if (!s.census?.[i]) return;
      el("circle", { cx: x(yr), cy: y(s.values[i]), r: 3.5, fill: s.color,
                     stroke: "var(--surface-1)", "stroke-width": 2 }, g);
    });
  });

  // Direct labels, anchored to each series' last year WITH A VALUE and nudged apart
  // where they collide — the town's population and the national one end within a
  // tenth of a point of each other, which is the finding but unreadable stacked.
  const MIN_GAP = 14;
  const ends = series
    .map((s) => {
      let last = years.length - 1;
      while (last >= 0 && s.values[last] == null) last--;
      return last < 0 ? null : { s, at: y(s.values[last]), value: s.values[last] };
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].at - ends[i - 1].at < MIN_GAP) ends[i].at = ends[i - 1].at + MIN_GAP;
  }
  for (const e of ends) {
    const lab = el("text", { x: iw + 8, y: e.at + 4,
                             fill: "var(--text-secondary)" }, g);
    lab.textContent = `${e.s.label} ${e.value.toFixed(0)}`;
  }

  // One crosshair for both series: a shared hit strip per year, comfortably wide.
  const bw = iw / (years.length - 1);
  const rule = el("line", { x1: 0, y1: 0, x2: 0, y2: ih, stroke: "var(--text-muted)",
                            "stroke-width": 1, opacity: 0 }, g);
  years.forEach((yr, i) => {
    const hit = el("rect", { x: x(yr) - bw / 2, y: 0, width: bw, height: ih,
                             fill: "transparent", tabindex: 0, role: "graphics-symbol",
                             "aria-label": `${yr}` }, g);
    // A gappy series has no value in some years; say so rather than crashing on it.
    const html =
      `<strong>${yr}</strong>` +
      series
        .map((s) =>
          s.values[i] == null
            ? `<br>${s.label}: nincs adat`
            : `<br>${s.label}: ${format(s.raw[i])} (${s.values[i].toFixed(1)})`,
        )
        .join("");
    const enter = (e) => {
      rule.setAttribute("x1", x(yr));
      rule.setAttribute("x2", x(yr));
      rule.setAttribute("opacity", 1);
      showTip(html, e);
    };
    hit.addEventListener("pointerenter", enter);
    hit.addEventListener("pointermove", enter);
    hit.addEventListener("focus", enter);
    hit.addEventListener("pointerleave", () => { rule.setAttribute("opacity", 0); hideTip(); });
    hit.addEventListener("blur", () => { rule.setAttribute("opacity", 0); hideTip(); });
  });

  const note = el("text", { x: 0, y: -4, fill: "var(--text-muted)" }, g);
  note.textContent = `index, ${baseYear} = 100`;
  return svg;
}

// --- plain lines ------------------------------------------------------------

/**
 * Several series in their own units on one axis.
 *
 * Unlike `indexedLines` this plots the values themselves, so it is only legitimate
 * when the series genuinely share a unit — here, forints. Two measures of different
 * scale would need indexing or two charts, never two y-axes.
 */
export function lines(node, { years, series, unit, format }) {
  const W = 900, H = 320;
  const m = { top: 18, right: 150, bottom: 34, left: 62 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
                          "aria-label": "Idősor" }, node);
  const g = el("g", { transform: `translate(${m.left},${m.top})` }, svg);

  const all = series.flatMap((s) => s.values);
  const step = niceStep(Math.max(...all) - 0);
  const hi = Math.ceil(Math.max(...all) / step) * step;
  const x = (year) => ((year - years[0]) / (years[years.length - 1] - years[0])) * iw;
  const y = (v) => ih - (v / hi) * ih;

  for (let tick = 0; tick <= hi + 1e-9; tick += step) {
    el("line", { x1: 0, y1: y(tick), x2: iw, y2: y(tick),
                 class: tick === 0 ? "axis-line" : "gridline" }, g);
    const t = el("text", { x: -8, y: y(tick) + 4, "text-anchor": "end" }, g);
    t.textContent = format(tick);
  }
  const ul = el("text", { x: -8, y: -4, "text-anchor": "end" }, g);
  ul.textContent = unit;

  const span = years[years.length - 1] - years[0];
  const yearStep = span > 25 ? 10 : span > 12 ? 5 : 2;
  for (const year of years) {
    if (year % yearStep !== 0) continue;
    const t = el("text", { x: x(year), y: ih + 20, "text-anchor": "middle" }, g);
    t.textContent = year;
  }

  const last = years.length - 1;
  series.forEach((s) => {
    const d = years.map((yr, i) => `${i ? "L" : "M"}${x(yr)} ${y(s.values[i])}`).join("");
    el("path", { d, fill: "none", stroke: s.color,
                 "stroke-width": s.emphasis ? 2.5 : 2,
                 "stroke-dasharray": s.dash || null,
                 "stroke-linejoin": "round" }, g);
  });

  // Direct labels, nudged apart where the lines end at the same value. Rebasing to
  // the final year makes the two series meet there exactly, so without this the
  // labels print on top of each other and neither is readable.
  const MIN_GAP = 14;
  const placed = series
    .map((s, i) => ({ s, i, y: y(s.values[last]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < placed.length; i++) {
    if (placed[i].y - placed[i - 1].y < MIN_GAP) {
      placed[i].y = placed[i - 1].y + MIN_GAP;
    }
  }
  for (const p of placed) {
    const lab = el("text", { x: iw + 8, y: p.y + 4,
                             fill: "var(--text-secondary)" }, g);
    lab.textContent = p.s.label;
    // A leader tick when the label had to move, so it still reads as belonging to
    // its line rather than floating free.
    if (Math.abs(p.y - y(p.s.values[last])) > 1) {
      el("line", { x1: iw + 1, y1: y(p.s.values[last]), x2: iw + 6, y2: p.y,
                   stroke: p.s.color, "stroke-width": 1 }, g);
    }
  }

  const bw = iw / (years.length - 1);
  const rule = el("line", { x1: 0, y1: 0, x2: 0, y2: ih, stroke: "var(--text-muted)",
                            "stroke-width": 1, opacity: 0 }, g);
  years.forEach((yr, i) => {
    const hit = el("rect", { x: x(yr) - bw / 2, y: 0, width: bw, height: ih,
                             fill: "transparent", tabindex: 0,
                             role: "graphics-symbol", "aria-label": `${yr}` }, g);
    const html = `<strong>${yr}</strong>` +
      series.map((s) => `<br>${s.label}: ${format(s.values[i])} ${unit}`).join("");
    const enter = (e) => {
      rule.setAttribute("x1", x(yr));
      rule.setAttribute("x2", x(yr));
      rule.setAttribute("opacity", 1);
      showTip(html, e);
    };
    hit.addEventListener("pointerenter", enter);
    hit.addEventListener("pointermove", enter);
    hit.addEventListener("focus", enter);
    hit.addEventListener("pointerleave", () => { rule.setAttribute("opacity", 0); hideTip(); });
    hit.addEventListener("blur", () => { rule.setAttribute("opacity", 0); hideTip(); });
  });
  return svg;
}

// --- dumbbell ---------------------------------------------------------------

/**
 * Before and after per item, on ONE shared axis.
 *
 * The form for "how did each of these change between two dates". Two shades of a
 * single hue rather than two categorical colours: these are not two subjects, they
 * are one subject at two times, and the connecting bar carries the direction.
 *
 * A shared axis means the rows are comparable with each other, which is the whole
 * point — a per-row scale would make a 2-point move look like a 20-point one.
 */
export function dumbbell(node, { rows, labels, domain, format }) {
  const W = 900;
  const rowH = 34;
  const m = { top: 26, right: 60, bottom: 30, left: 250 };
  const H = m.top + rows.length * rowH + m.bottom;
  const iw = W - m.left - m.right;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
                          "aria-label": "Változás két időpont között" }, node);
  const g = el("g", { transform: `translate(${m.left},${m.top})` }, svg);
  const [lo, hi] = domain;
  const x = (v) => ((v - lo) / (hi - lo)) * iw;

  const before = cssVar("--era-before");
  const after = cssVar("--era-after");

  for (let tick = lo; tick <= hi; tick += (hi - lo) / 5) {
    el("line", { x1: x(tick), y1: -6, x2: x(tick), y2: rows.length * rowH,
                 class: "gridline" }, g);
    const t = el("text", { x: x(tick), y: rows.length * rowH + 18,
                           "text-anchor": "middle" }, g);
    t.textContent = Math.round(tick);
  }

  rows.forEach((row, i) => {
    const y = i * rowH + rowH / 2;
    const label = el("text", { x: -12, y: y + 4, "text-anchor": "end",
                               fill: "var(--text-secondary)" }, g);
    label.textContent = row.label;

    // The county's move over the same two censuses, drawn faintly behind. Without
    // it the employment row reads as something that happened to Felsőzsolca; with
    // it you can see the county moved the same distance, which is the finding.
    if (row.refBefore != null && row.refAfter != null) {
      el("line", { x1: x(row.refBefore), y1: y + 9, x2: x(row.refAfter), y2: y + 9,
                   stroke: "var(--text-muted)", "stroke-width": 2, opacity: 0.55,
                   "stroke-linecap": "round" }, g);
      for (const value of [row.refBefore, row.refAfter]) {
        el("circle", { cx: x(value), cy: y + 9, r: 2.5, fill: "var(--text-muted)",
                       opacity: 0.55 }, g);
      }
    }

    el("line", { x1: x(row.before), y1: y, x2: x(row.after), y2: y,
                 stroke: "var(--axis)", "stroke-width": 3,
                 "stroke-linecap": "round" }, g);

    for (const [value, colour] of [[row.before, before], [row.after, after]]) {
      // A 2px surface ring, not a border: the two markers can overlap when a value
      // barely moved, and they must still read as two.
      el("circle", { cx: x(value), cy: y, r: 6, fill: colour,
                     stroke: "var(--surface-1)", "stroke-width": 2 }, g);
    }

    const delta = row.after - row.before;
    const note = el("text", { x: iw + 10, y: y + 4,
                              fill: "var(--text-secondary)" }, g);
    note.textContent = `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`;

    const hit = el("rect", { x: -m.left, y: i * rowH, width: W - m.right,
                             height: rowH, fill: "transparent", tabindex: 0,
                             role: "graphics-symbol",
                             "aria-label": `${row.label}: ${labels[0]} ${row.before}, ${labels[1]} ${row.after}` }, g);
    const refLine =
      row.refBefore == null || row.refAfter == null
        ? ""
        : `<br><em>${row.refLabel}: ${format(row.refBefore)} → ` +
          `${format(row.refAfter)} (${row.refAfter - row.refBefore >= 0 ? "+" : "−"}` +
          `${Math.abs(row.refAfter - row.refBefore).toFixed(1)})</em>`;
    const html = `<strong>${row.label}</strong><br>` +
      `${labels[0]}: ${format(row.before)}<br>${labels[1]}: ${format(row.after)}` +
      refLine;
    hit.addEventListener("pointerenter", (e) => showTip(html, e));
    hit.addEventListener("pointermove", (e) => showTip(html, e));
    hit.addEventListener("pointerleave", hideTip);
    hit.addEventListener("focus", (e) => showTip(html, e));
    hit.addEventListener("blur", hideTip);
  });

  return svg;
}

// --- comparison against a baseline ------------------------------------------

/**
 * Where one place sits against its district, its county and the whole country.
 *
 * Everything is expressed as a percentage of the national median so that cars,
 * shops and forints can share one axis. 100 is the median; the light band is the
 * national interquartile range, so "unusual" is visible rather than asserted.
 *
 * **Nothing here is coloured by direction, deliberately.** Fewer shops per head is
 * not obviously worse, and lower unemployment runs the opposite way from lower car
 * ownership. Colouring by good and bad would smuggle in a verdict the data does not
 * contain; this shows position and lets the reader judge.
 */
export function comparisonRows(node, { rows, domain, labels, format }) {
  const W = 900;
  const rowH = 32;
  const m = { top: 30, right: 92, bottom: 34, left: 250 };
  const H = m.top + rows.length * rowH + m.bottom;
  const iw = W - m.left - m.right;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
                          "aria-label": "Összehasonlítás az országos középértékkel" }, node);
  const g = el("g", { transform: `translate(${m.left},${m.top})` }, svg);
  const [lo, hi] = domain;
  const x = (v) => ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * iw;
  const step = niceStep(hi - lo, 5);

  for (let tick = lo; tick <= hi + 1e-9; tick += step) {
    const isMedian = Math.abs(tick - 100) < 1e-9;
    el("line", { x1: x(tick), y1: -8, x2: x(tick), y2: rows.length * rowH,
                 class: isMedian ? "axis-line" : "gridline" }, g);
    const t = el("text", { x: x(tick), y: rows.length * rowH + 18,
                           "text-anchor": "middle" }, g);
    t.textContent = tick;
  }
  const cap = el("text", { x: x(100), y: -14, "text-anchor": "middle",
                           fill: "var(--text-secondary)" }, g);
  cap.textContent = "országos medián = 100";

  rows.forEach((row, i) => {
    const y = i * rowH + rowH / 2;
    const label = el("text", { x: -12, y: y + 4, "text-anchor": "end",
                               fill: "var(--text-secondary)" }, g);
    label.textContent = row.label;

    // The national middle half, as context behind everything else.
    if (row.p25 != null && row.p75 != null) {
      el("rect", { x: x(row.p25), y: y - 9, width: Math.max(1, x(row.p75) - x(row.p25)),
                   height: 18, fill: "var(--gridline)", rx: 2 }, g);
    }
    for (const [value, cls] of [[row.district, "district"], [row.county, "county"]]) {
      if (value == null) continue;
      el("line", { x1: x(value), y1: y - 7, x2: x(value), y2: y + 7,
                   stroke: cls === "county" ? "var(--text-muted)" : "var(--text-secondary)",
                   "stroke-width": 2 }, g);
    }
    el("circle", { cx: x(row.town), cy: y, r: 6.5, fill: "var(--series-1)",
                   stroke: "var(--surface-1)", "stroke-width": 2 }, g);

    const pct = el("text", { x: iw + 10, y: y + 4, fill: "var(--text-secondary)" }, g);
    pct.textContent = `${Math.round(row.percentile)}. pctilis`;

    const hit = el("rect", { x: -m.left, y: i * rowH, width: W - m.right,
                             height: rowH, fill: "transparent", tabindex: 0,
                             role: "graphics-symbol", "aria-label": row.label }, g);
    const line = (name, v, raw) =>
      v == null ? "" : `<br>${name}: ${format(raw)} (${v.toFixed(0)}%)`;
    const html =
      `<strong>${row.label}</strong> · ${row.year}` +
      line(labels.town, row.town, row.townRaw) +
      line(labels.district, row.district, row.districtRaw) +
      line(labels.county, row.county, row.countyRaw) +
      `<br>országos medián: ${format(row.medianRaw)}` +
      `<br><em>${Math.round(row.percentile)}. percentilis, ` +
      `${row.reporting} település közül</em>`;
    hit.addEventListener("pointerenter", (e) => showTip(html, e));
    hit.addEventListener("pointermove", (e) => showTip(html, e));
    hit.addEventListener("pointerleave", hideTip);
    hit.addEventListener("focus", (e) => showTip(html, e));
    hit.addEventListener("blur", hideTip);
  });
  return svg;
}

// --- table view -------------------------------------------------------------

/** The WCAG-clean twin. Every chart here has one; nothing is hover-only. */
export function table(node, { columns, rows }) {
  const t = el2("table", { class: "data" }, node);
  const thead = el2("thead", {}, t);
  const hr = el2("tr", {}, thead);
  for (const c of columns) el2("th", {}, hr).textContent = c;
  const tb = el2("tbody", {}, t);
  for (const row of rows) {
    const tr = el2("tr", {}, tb);
    for (const cell of row) el2("td", {}, tr).textContent = cell;
  }
  return t;
}

function el2(name, attrs, parent) {
  const n = document.createElement(name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

/** A colour ramp legend, so a continuous scale is never unlabelled. */
export function rampLegend(node, { maxAbs, unit }) {
  const wrap = el2("div", { class: "scale" }, node);
  el2("span", {}, wrap).textContent = `−${maxAbs.toFixed(1)} ${unit}`;
  const ramp = el2("span", { class: "ramp" }, wrap);
  const stops = [];
  for (let i = 0; i <= 20; i++) {
    const v = -maxAbs + (2 * maxAbs * i) / 20;
    stops.push(`${diverging(v, maxAbs)} ${(i / 20) * 100}%`);
  }
  ramp.style.background = `linear-gradient(to right, ${stops.join(",")})`;
  el2("span", {}, wrap).textContent = `+${maxAbs.toFixed(1)} ${unit}`;
  return wrap;
}
