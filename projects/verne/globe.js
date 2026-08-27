/* The globe: a canvas for the sphere, an SVG overlay for the things you can click.
 *
 * Canvas for the base because the coastline is a few thousand vertices and redrawing it as
 * SVG means making the browser re-parse every path's `d` on every frame of a drag. Canvas
 * streams straight into path commands and touches no DOM at all.
 *
 * SVG for the marks because moving a few dozen `cx` attributes per frame costs nothing,
 * where re-parsing path data does. So there is no hit-testing on the canvas anywhere.
 *
 * The overlay is aria-hidden, deliberately. A screen reader given nineteen dot labels in
 * projection order gets noise; the panel's list of places, and the itinerary below the
 * globe, are the accessible representation and they carry more than a label could.
 *
 * The drag moves two angles and pins the roll at zero. A minimal-rotation drag (versor) is
 * lovely on a free-tumbling globe and wrong on an atlas: it spins the third angle and tilts
 * the horizon. Same decision, same reason, as globe.shortest_rotation on the Python side.
 *
 * ---------------------------------------------------------------------------------------
 * What a test cannot check here, so look at the page:
 *   - Antarctica is white and the ocean is not. A backwards ring fills its own complement.
 *   - The far side of the globe has no clickable dots on it.
 *   - Dragging is smooth, and never rolls the horizon.
 *   - Auto-rotate stops the moment you touch it, and never starts under reduced motion.
 *   - Old-style figures in the prose; lining, tabular figures in the day column.
 *   - Stepping 22 to 26 crosses the Pacific eastward, not the long way round the world.
 *   - A drag part-way through a turn stops the turn immediately.
 *   - Under reduced motion the globe jumps between chapters and never tweens.
 *   - The off-route diamonds read as a faint scatter rather than as claims.
 * ---------------------------------------------------------------------------------------
 */

import {
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from "./vendor/d3-geo-3.1.1.js";

const DEGREES_PER_SECOND = 6;
const IDLE_BEFORE_ROTATING = 20000;
const SVG_NS = "http://www.w3.org/2000/svg";

/* How a chapter's places are drawn. Shape first and colour second, because the page may
 * be printed grey and because the nine stops already own "large, paper-filled,
 * ink-ringed" — a chapter mark has to be tellable from those without relying on hue. */
const PLACE_MARK = {
  here: { radius: 6, halo: 10 },
  past: { radius: 4 },
  future: { radius: 4 },
  cyclic: { radius: 4 },
  off_route: { radius: 5, diamond: true },
  unknown: { radius: 5, diamond: true },
};
const SPHERE = { type: "Sphere" };
const GRATICULE = geoGraticule10();

export function createGlobe(stage, { land, journey, borders, onIdleChange }) {
  const canvas = stage.querySelector("canvas");
  const svg = stage.querySelector("svg");
  const context = canvas.getContext("2d");
  const projection = geoOrthographic().precision(0.4);
  const path = geoPath(projection, context);

  // Open on London's meridian, but tilted to the route's own mean latitude rather than to
  // London's. Centring on London itself points the globe at the Arctic and puts most of
  // the journey over the horizon: the wager is made at 51 degrees north and run at about
  // 34, so that is where the camera sits.
  const start = journey.nodes[0];
  const located = journey.nodes.filter((node) => node.lat !== null);
  const meanLat = located.reduce((sum, node) => sum + node.lat, 0) / located.length;
  let rotation = [-start.lon, -meanLat, 0];
  let size = 0;
  let spinning = false;
  let lastIdle = performance.now();
  let paused = prefersReducedMotion();
  let turning = null;
  let era = null;
  let marks = [];
  let litKey = null;

  const stops = mergeRepeats(journey.nodes).map(buildStop);
  const chapterLayer = document.createElementNS(SVG_NS, "g");
  // Under the stops, so a route stop is never hidden by a mark for the same place.
  svg.append(chapterLayer);
  for (const stop of stops) svg.append(stop.group);

  /* Canvas cannot read `var(--ocean)`, so the colours are resolved from the stylesheet at
   * draw time rather than written twice. This is also the whole of what a dark mode would
   * need later: change the CSS, change nothing here. */
  function colours() {
    const style = getComputedStyle(document.documentElement);
    const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    return {
      ocean: read("--ocean", "#eae5d8"),
      land: read("--land", "#fffdf8"),
      landEdge: read("--land-edge", "#cfc9ba"),
      graticule: read("--graticule", "rgba(90,83,70,.16)"),
      border: read("--border", "#9a917d"),
      sphereEdge: read("--sphere-edge", "#b5ad9b"),
      modes: Object.fromEntries(
        Object.entries(journey.transport_style).map(([mode, style_]) => [
          mode,
          read(style_.colour, "#5a5346"),
        ]),
      ),
    };
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    size = Math.max(240, Math.min(rect.width, rect.height));
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    canvas.style.width = canvas.style.height = `${size}px`;
    // The backing store is in device pixels and everything else is in CSS pixels; setting
    // the transform once here is what keeps the rest of the file from knowing that.
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    projection.translate([size / 2, size / 2]).scale(size / 2 - 8);
    draw();
  }

  function draw() {
    const ink = colours();
    projection.rotate(rotation);
    context.clearRect(0, 0, size, size);

    context.beginPath();
    path(SPHERE);
    context.fillStyle = ink.ocean;
    context.fill();

    context.beginPath();
    path(GRATICULE);
    context.strokeStyle = ink.graticule;
    context.lineWidth = 0.6;
    context.stroke();

    context.beginPath();
    path(land);
    context.fillStyle = ink.land;
    context.fill();
    context.strokeStyle = ink.landEdge;
    context.lineWidth = 0.7;
    context.stroke();

    /* Political borders, over the land and under the route. One path for the whole
     * layer, not one per country: they are drawn as hairlines and nothing is labelled,
     * so a dissolved geometry costs a single path build per frame instead of three
     * hundred. Dashed, so that a border and a coastline stay tellable apart in print
     * and in grey. */
    const layer = era && borders[era];
    if (layer) {
      context.beginPath();
      path(layer);
      context.strokeStyle = ink.border;
      context.lineWidth = 0.7;
      context.setLineDash([3, 2]);
      context.stroke();
      context.setLineDash([]);
    }

    for (const leg of journey.legs) {
      if (!leg.arc.length) continue;
      const style = journey.transport_style[leg.primary_mode] || {};
      context.beginPath();
      path({ type: "LineString", coordinates: leg.arc });
      context.strokeStyle = ink.modes[leg.primary_mode] || "#5a5346";
      context.lineWidth = style.width || 2;
      context.setLineDash(style.dash || []);
      context.lineCap = "round";
      context.stroke();
      context.setLineDash([]);
    }

    context.beginPath();
    path(SPHERE);
    context.strokeStyle = ink.sphereEdge;
    context.lineWidth = 1;
    context.stroke();

    placeStops();
  }

  /* With the roll pinned at zero, the centre of the visible hemisphere is exactly the
   * negated rotation — so "is this stop on the near side?" is one distance comparison. */
  function placeStops() {
    const centre = [-rotation[0], -rotation[1]];
    for (const mark of marks) {
      const visible = geoDistance(mark.point, centre) < Math.PI / 2;
      mark.group.classList.toggle("behind", !visible);
      if (!visible) continue;
      const [x, y] = projection(mark.point);
      mark.group.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    }
    for (const stop of stops) {
      const node = stop.node;
      if (node.lat === null) {
        stop.group.classList.add("behind");
        continue;
      }
      const visible = geoDistance([node.lon, node.lat], centre) < Math.PI / 2;
      stop.group.classList.toggle("behind", !visible);
      if (!visible) continue;
      const [x, y] = projection([node.lon, node.lat]);
      stop.group.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
      // Labels flip to the inside near the rim so they never run off the disc.
      const flip = x > size * 0.72;
      stop.label.setAttribute("x", flip ? -12 : 12);
      stop.label.setAttribute("text-anchor", flip ? "end" : "start");
    }
  }

  /* Pointer events rather than d3-drag: about twenty lines, and pointer capture is what
   * makes a drag survive the cursor leaving the canvas. */
  let dragging = null;
  canvas.addEventListener("pointerdown", (event) => {
    dragging = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
    interacted();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    // Degrees per pixel, scaled so a drag across the disc turns the globe about half round
    // whatever size it is being shown at.
    const perPixel = 180 / size;
    rotation = [
      rotation[0] + (event.clientX - dragging.x) * perPixel,
      clamp(rotation[1] - (event.clientY - dragging.y) * perPixel, -90, 90),
      0,
    ];
    dragging = { x: event.clientX, y: event.clientY };
    interacted();
    draw();
  });
  const release = (event) => {
    if (!dragging) return;
    dragging = null;
    canvas.classList.remove("dragging");
    canvas.releasePointerCapture?.(event.pointerId);
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  function interacted() {
    lastIdle = performance.now();
    // A turn in flight is the page's idea; a drag is the reader's, and the reader wins.
    turning = null;
    if (spinning) {
      spinning = false;
      onIdleChange?.(false);
    }
  }

  let previous = performance.now();
  function frame(now) {
    const elapsed = now - previous;
    previous = now;

    if (turning) {
      const share = Math.min(1, (now - turning.start) / turning.ms);
      const eased = easeInOut(share);
      rotation = [
        turning.fromLon + turning.dLon * eased,
        turning.fromLat + turning.dLat * eased,
        0,
      ];
      if (share >= 1) turning = null;
      draw();
      requestAnimationFrame(frame);
      return;
    }

    const idle = now - lastIdle > IDLE_BEFORE_ROTATING;
    const wanted = idle && !paused && !document.hidden && !dragging;
    if (wanted !== spinning) {
      spinning = wanted;
      onIdleChange?.(spinning);
    }
    if (spinning) {
      // Eastward, the way Fogg went: the centre longitude increases, so the rotation
      // angle decreases.
      rotation = [rotation[0] - (DEGREES_PER_SECOND * elapsed) / 1000, rotation[1], 0];
      draw();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  new ResizeObserver(resize).observe(stage);
  resize();

  return {
    redraw: draw,
    isPaused: () => paused,
    setPaused(value) {
      paused = value;
      if (!value) lastIdle = 0;
      interactedIfResuming(value);
    },
    /* Turn to a point, taking the short way and keeping the horizon level.
     *
     * Two angles, roll pinned at zero — the same choice as the drag, and for the same
     * reason. Slerping the great circle between the two viewpoints and deriving a
     * rotation from it spins the third angle and tips the world over. */
    turnTo(lon, lat) {
      lastIdle = performance.now();
      turning = null;
      const target = [-lon, -lat];
      if (paused || prefersReducedMotion()) {
        rotation = [target[0], target[1], 0];
        draw();
        return;
      }
      const swing = geoDistance([-rotation[0], -rotation[1]], [lon, lat]);
      turning = {
        fromLon: rotation[0],
        fromLat: rotation[1],
        dLon: shortestRotation(rotation[0], target[0]),
        dLat: target[1] - rotation[1],
        start: performance.now(),
        // Proportional to how far you just moved, so a hop across India and a leap
        // across the Pacific do not take the same time and pretend to be equal.
        ms: clamp((swing * 180) / Math.PI * 6, 250, 1200),
      };
    },

    /* Which era of border to draw, or none at all. */
    setBorders(name) {
      era = name && borders[name] ? name : null;
      draw();
    },

    /* Show one chapter's places, or none. Rebuilt rather than diffed: a chapter names a
     * couple of dozen places at most, and a diff would be more code than it saves. */
    showPlaces(places, focus) {
      chapterLayer.replaceChildren();
      marks = [];

      /* The party's own position, drawn from Fogg's resolved pin rather than from the
       * chapter's `here` class. `here` is a judgement about a place the chapter
       * *mentions*, and a chapter almost never mentions where it already is — nine
       * times in the whole book. Without this the globe would centre on the party and
       * then not say which dot they were. */
      if (focus) {
        const party = buildMark({ key: "__party__", class: "here", ...focus });
        party.group.classList.add("party");
        chapterLayer.append(party.group);
        marks.push(party);
      }
      const routeStops = new Set(journey.nodes.map((node) => node.key));
      for (const place of places || []) {
        if (!place.plotted || place.lon === undefined) continue;
        // A stop already has a dot. Marking its class on the existing one beats drawing
        // a second dot on the same pixel.
        if (routeStops.has(place.key)) {
          const stop = stops.find((one) => one.node.key === place.key);
          if (stop) stop.group.dataset.placeClass = place.class;
          continue;
        }
        const mark = buildMark(place);
        chapterLayer.append(mark.group);
        marks.push(mark);
      }
      svg.classList.toggle("chapter", Boolean(places && places.length));
      placeStops();
    },

    clearPlaces() {
      litKey = null;
      chapterLayer.replaceChildren();
      marks = [];
      for (const stop of stops) delete stop.group.dataset.placeClass;
      svg.classList.remove("chapter");
    },

    /* Light one mark, so hovering the panel's list points at the globe. The list is the
     * accessible representation; this is the direction that matters. */
    light(key) {
      if (litKey === key) return;
      litKey = key;
      for (const mark of marks) mark.group.classList.toggle("is-lit", mark.key === key);
      for (const stop of stops) stop.group.classList.toggle("is-lit", stop.node.key === key);
    },
  };

  function interactedIfResuming(value) {
    if (value) interacted();
  }
}

/* London is index 0 and index 8 — the route is a cycle, and that is its shape rather than a
 * duplicate. Drawn as two dots they sit exactly on top of each other and the labels collide
 * into nonsense, so the repeats become one dot carrying both days. */
function mergeRepeats(nodes) {
  const byKey = new Map();
  for (const node of nodes) {
    const seen = byKey.get(node.key);
    if (seen) seen.days.push(node.day);
    else byKey.set(node.key, { ...node, days: [node.day] });
  }
  return [...byKey.values()];
}

function buildStop(node) {
  const svgNS = "http://www.w3.org/2000/svg";
  const group = document.createElementNS(svgNS, "g");
  // No unchecked class. The pins used to carry a broken ring meaning "nobody has
  // checked this resolution", and the sentence explaining it has been taken off the
  // page — an unexplained notation is worse than none. `status` is still in the
  // payload, so the ring can come back the day places.csv is reviewed.
  group.setAttribute("class", "stop");

  // An invisible larger circle underneath, so a 7px dot still has a 28px touch target.
  const hit = document.createElementNS(svgNS, "circle");
  hit.setAttribute("class", "hit");
  hit.setAttribute("r", "14");

  const pin = document.createElementNS(svgNS, "circle");
  pin.setAttribute("class", "pin");
  // The stop that is both the start and the finish is drawn larger, because it is.
  pin.setAttribute("r", node.days.length > 1 ? "7.5" : "5.5");

  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("dy", "0.34em");
  label.append(document.createTextNode(node.name_in_text));
  const day = document.createElementNS(svgNS, "tspan");
  day.setAttribute("class", "day tabular");
  day.textContent = `  ${node.days.join(" · ")}`;
  label.append(day);

  group.append(hit, pin, label);
  return { node, group, label };
}

/* The Python original — verne80.globe.shortest_rotation — is doctested, and this is the
 * same four operations. Getting it wrong does not look like a bug: the globe sails 340
 * degrees east instead of 20 west, and reads as the page showing off. */
function shortestRotation(current, target) {
  return ((target - current + 540) % 360) - 180;
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function buildMark(place) {
  const style = PLACE_MARK[place.class] || PLACE_MARK.unknown;
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("class", `place is-${place.class}`);

  if (style.halo) {
    const halo = document.createElementNS(SVG_NS, "circle");
    halo.setAttribute("class", "halo");
    halo.setAttribute("r", String(style.halo));
    group.append(halo);
  }

  if (style.diamond) {
    // A different shape, not a different colour: off-route is the one class that has to
    // read as "not on the route" with the hue taken away.
    const r = style.radius;
    const diamond = document.createElementNS(SVG_NS, "path");
    diamond.setAttribute("class", "mark");
    diamond.setAttribute("d", `M0,${-r} L${r},0 L0,${r} L${-r},0 Z`);
    group.append(diamond);
  } else if (place.class === "cyclic") {
    // London, which the route visits twice: half behind and half ahead, drawn as such.
    const r = style.radius;
    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("class", "mark");
    ring.setAttribute("r", String(r));
    const half = document.createElementNS(SVG_NS, "path");
    half.setAttribute("class", "half");
    half.setAttribute("d", `M0,${-r} A${r},${r} 0 0 1 0,${r} Z`);
    group.append(ring, half);
  } else {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("class", "mark");
    dot.setAttribute("r", String(style.radius));
    group.append(dot);
  }
  return { key: place.key, point: [place.lon, place.lat], group };
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
