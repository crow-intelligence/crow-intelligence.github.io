// The dashboard map: Phase 0 boundary plus present-state OSM infrastructure.
//
// Every category is distinguished by BOTH colour and dash pattern. Three of the
// five hues sit below 3:1 against the light surface and one pair is weak under
// tritanopia, so colour alone would not carry the encoding — and the book this
// feeds may be printed in greyscale. Labels and counts in the legend do the rest.
//
// Nothing here shows change over time. OSM records when a feature was *mapped*,
// which for this town is a record of a handful of mappers' weekends rather than
// of the town's construction history. See docs/decisions.md D6.

const STYLE = {
  boundary: { color: "var(--text-primary)", weight: 3, dashArray: null, fill: false },
  neighbour: { color: "var(--text-muted)", weight: 1.5, dashArray: "6,5", fill: false },
  river: { color: "var(--series-1)", weight: 4, dashArray: null, fill: false },
  near_river: { color: "var(--diverge-warm)", weight: 7, dashArray: null, fill: false },
  dyke: { color: "var(--series-2)", weight: 4, dashArray: null, fill: false },
  cycleway: { color: "var(--series-3)", weight: 3, dashArray: "7,5", fill: false },
  industrial: { color: "var(--series-4)", weight: 2, dashArray: null, fill: true },
  motorway: { color: "var(--series-5)", weight: 3, dashArray: "14,6", fill: false },
  floodgate: { color: "var(--series-5)", weight: 3, dashArray: null, fill: false },
};

function resolve(style) {
  const probe = document.createElement("div");
  document.body.appendChild(probe);
  const out = {};
  for (const [k, v] of Object.entries(style)) {
    probe.style.color = v.color;
    out[k] = { ...v, color: getComputedStyle(probe).color };
  }
  probe.remove();
  return out;
}

function pathOptions(s) {
  return {
    color: s.color,
    weight: s.weight,
    dashArray: s.dashArray,
    fill: s.fill,
    fillColor: s.color,
    fillOpacity: s.fill ? 0.22 : 0,
    lineCap: "butt",
  };
}

let map;
let overlays = {};
let satellite = null;
let satelliteData = null;

/**
 * Swap the satellite image under the vectors.
 *
 * All ten years share one grid and one set of bounds, so switching is a straight
 * source swap — nothing repositions. If the boundary appears to shift when you change
 * year, the grid is wrong and every comparison on this map is worthless.
 */
export function setImagery(year, style) {
  if (!map || !satelliteData) return;
  const entry = satelliteData.years.find((y) => y.year === year);
  if (!entry) return;
  const url = `./data/${entry.files[style]}`;
  if (satellite) {
    satellite.setUrl(url);
  } else {
    satellite = L.imageOverlay(url, satelliteData.bounds, {
      pane: "satellite",
      className: "sat-image",
      attribution: satelliteData.attribution,
    }).addTo(map);
  }
  return entry;
}

export function clearImagery() {
  if (satellite) {
    satellite.remove();
    satellite = null;
  }
}

export function renderMap(node, geo, imagery) {
  const style = resolve(STYLE);
  satelliteData = imagery || null;
  satellite = null;

  if (map) {
    map.remove();
    map = null;
  }
  node.innerHTML = "";
  // zoomSnap: 0 allows fractional zoom, so fitBounds fits the town exactly.
  // Leaflet's default snaps to whole zoom levels and must round DOWN to fit both
  // axes — with a 6.6 km north-south extent in a 520px box that costs a full
  // level, and the map opens showing twice the area it should, most of it Miskolc.
  map = L.map(node, { scrollWheelZoom: false, zoomSnap: 0 });

  // Between the tiles (200) and the vectors (400), so the satellite sits under the
  // boundary and the infrastructure rather than hiding them.
  map.createPane("satellite").style.zIndex = 250;

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: `${geo.attribution} (${geo.licence})`,
  }).addTo(map);

  const layer = (data, key, label) =>
    L.geoJSON(data, { style: () => pathOptions(style[key]) }).bindTooltip(label, {
      sticky: true,
    });

  // Context first, so the subjects draw on top of it.
  const neighbour = layer(geo.layers.neighbour, "neighbour", geo.neighbour);
  const boundary = layer(geo.layers.boundary, "boundary", geo.town);
  const river = layer(geo.layers.river, "river", geo.river);
  const nearRiver = layer(
    geo.layers.near_river,
    "near_river",
    `A határ ${geo.river}hoz simuló szakasza`,
  );

  const byCategory = {};
  for (const feature of geo.layers.infrastructure.features) {
    const key = feature.properties.category;
    (byCategory[key] ||= []).push(feature);
  }

  overlays = {};
  neighbour.addTo(map);
  boundary.addTo(map);
  river.addTo(map);
  nearRiver.addTo(map);

  overlays[`${geo.town} — közigazgatási határ`] = boundary;
  overlays[`${geo.neighbour} — szomszéd`] = neighbour;
  overlays[geo.river] = river;
  overlays[`A határ ${geo.river}hoz simuló szakasza`] = nearRiver;

  for (const { key, label: name, count } of geo.categories) {
    if (!count) continue;
    const group = L.geoJSON(
      { type: "FeatureCollection", features: byCategory[key] || [] },
      {
        style: () => pathOptions(style[key]),
        onEachFeature: (feature, lyr) => {
          const p = feature.properties;
          const also =
            p.categories.length > 1
              ? `<br><em>egyben: ${p.categories.join(", ")}</em>`
              : "";
          // "Mapped", never "built". The distinction is the whole reason this
          // layer is a present-state map rather than a time series.
          const mapped = p.mapped
            ? `<br>térképre került: ${p.mapped.slice(0, 10)}`
            : "";
          const built = p.start_date ? `<br>megadott építés: ${p.start_date}` : "";
          lyr.bindTooltip(
            `<strong>${name}</strong>${p.name ? " — " + p.name : ""}${also}${mapped}${built}`,
            { sticky: true },
          );
        },
      },
    );
    group.addTo(map);
    overlays[`${name} (${count})`] = group;
  }

  L.control.layers(null, overlays, { collapsed: false, position: "topright" }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  // Size can still be settling when the card first lays out; measuring stale
  // dimensions is the other way fitBounds silently picks the wrong view.
  map.invalidateSize();
  // Fit the imagery when there is any: it is slightly larger than the boundary, so
  // fitting the boundary instead leaves basemap showing down both sides and the
  // photograph reads as a floating rectangle rather than as the map.
  map.fitBounds(satelliteData ? satelliteData.bounds : geo.bounds, {
    padding: [8, 8],
    animate: false,
  });
  return map;
}

/** Legend rows carrying colour, dash pattern, label and count together. */
export function renderMapLegend(node, geo) {
  const style = resolve(STYLE);
  node.innerHTML = "";
  const rows = [
    ["boundary", `${geo.town} — határ`, null],
    ["neighbour", `${geo.neighbour}`, null],
    ["river", geo.river, null],
    ["near_river", `határ a ${geo.river} mentén`, null],
    ...geo.categories.filter((c) => c.count).map((c) => [c.key, c.label, c.count]),
  ];
  for (const [key, label, count] of rows) {
    const s = style[key];
    const item = document.createElement("span");
    item.className = "item";
    const svg = `<svg width="26" height="12" aria-hidden="true">
      <line x1="1" y1="6" x2="25" y2="6" stroke="${s.color}"
            stroke-width="${Math.min(s.weight, 5)}"
            ${s.dashArray ? `stroke-dasharray="${s.dashArray}"` : ""} />
    </svg>`;
    item.innerHTML = `${svg}<span>${label}${count ? ` (${count})` : ""}</span>`;
    node.appendChild(item);
  }
  const missing = geo.categories.filter((c) => !c.count);
  if (missing.length) {
    const note = document.createElement("span");
    note.className = "item";
    note.style.color = "var(--text-muted)";
    note.textContent = `nincs az OSM-ben: ${missing.map((c) => c.label).join(", ")}`;
    node.appendChild(note);
  }
}
