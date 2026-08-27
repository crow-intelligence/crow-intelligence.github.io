/* Load the payloads, wire the page, and say plainly what is not yet checked.
 *
 * One piece of state: which chapter, held in the URL hash as `#ch-12`.
 *
 * That hash names a real element — the chapter written out four thousand words down the
 * page — which is exactly what makes the tab bar work with scripting switched off, and
 * exactly what must not happen with it switched on: a tab click has to turn the globe
 * where it stands. So a click is prevented, the URL is pushed, and render() is called.
 * Back arrives as popstate and a pasted link as hashchange. Three doors, one room, and
 * the room is still render().
 */

import { createGlobe } from "./globe.js";
import { localise, t, useStrings } from "./i18n.js";

const NAMES = [
  "strings",
  "journey",
  "land",
  "borders_1880",
  "borders_modern",
  "places",
  "chapters",
  "provenance",
];

/* Which border layers exist, in the order the control offers them. `none` is first
 * because it is the absence of a layer rather than one of them. */
const ERAS = ["none", "1880", "today"];

async function load(name) {
  const response = await fetch(`./data/${name}.json`);
  if (!response.ok) throw new Error(`${name}.json: ${response.status}`);
  return response.json();
}

async function main() {
  const loaded = Object.fromEntries(
    (await Promise.all(NAMES.map(load))).map((payload, index) => [
      NAMES[index],
      payload,
    ]),
  );
  const { strings, journey, land, places, chapters, provenance } = loaded;

  useStrings(strings);
  localise();

  provenanceThreshold = provenance.doubtful_below;

  // The chapter payload carries place keys, not coordinates: the fold that produced them
  // is a sixty-codepoint typography normalisation and lives in Python, where a test can
  // see it. The positions are here already, so looking them up costs nothing.
  const located = new Map(places.places.map((place) => [place.key, place]));
  const byNumber = new Map(chapters.chapters.map((entry) => [entry.chapter, entry]));

  renderChecked(provenance);
  renderLegend(journey);
  renderItinerary(journey, places);

  const stage = document.querySelector("#stage");
  const toggle = document.querySelector("#rotate");
  const globe = createGlobe(stage, {
    land,
    journey,
    borders: { 1880: loaded.borders_1880, today: loaded.borders_modern },
    onIdleChange: () => setToggleLabel(toggle, globe),
  });
  buildBorderControl(globe);
  lightHandler = (key) => globe.light(key);
  setToggleLabel(toggle, globe);
  toggle.addEventListener("click", () => {
    globe.setPaused(!globe.isPaused());
    setToggleLabel(toggle, globe);
  });

  const tabs = buildChapterBar(chapters.chapters);

  function render() {
    const wanted = readHash();
    const entry = wanted === null ? null : byNumber.get(wanted) || null;
    for (const [number, tab] of tabs) {
      const on = entry !== null && number === entry.chapter;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    }
    // With no chapter selected nothing is a tab stop, so the first one becomes one.
    if (!entry && tabs.size) [...tabs.values()][0].tabIndex = 0;

    const preview = document.querySelector("#preview");
    preview.textContent = entry ? entry.summary.hover : t("chapters.pick");

    if (!entry) {
      globe.clearPlaces();
      renderOverviewPanel(journey);
      document.querySelector("#announce").textContent = "";
      return;
    }

    globe.showPlaces(
      entry.places.map((place) => ({ ...place, ...(located.get(place.key) || {}) })),
      entry.focus,
    );
    if (entry.focus) globe.turnTo(entry.focus.lon, entry.focus.lat);
    renderPanel(entry, chapters, journey, located);
    document.querySelector("#announce").textContent = t("chapter.heading", {
      n: entry.chapter,
      title: entry.title,
    });
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("popstate", render);

  /* Each written-out chapter links back up to the globe. Here the scroll is wanted, so
   * it is done explicitly — and without `behavior: "smooth"`, which is why this needs
   * no reduced-motion guard. */
  for (const link of document.querySelectorAll("a.to-globe")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      go(`#ch-${link.dataset.chapter}`);
      document.querySelector("#globe").scrollIntoView({ block: "start" });
    });
  }
  render();
}

/** `#ch-12` is a chapter; anything else — a skip link, a typo, nothing — is the route. */
function readHash() {
  const match = /^#ch-(\d+)$/.exec(location.hash);
  return match ? Number(match[1]) : null;
}

/* Change the state without letting the browser jump to the section the hash names. */
function go(hash) {
  if (location.hash === hash) return render();
  history.pushState(null, "", hash || location.pathname + location.search);
  render();
}

function buildChapterBar(chapters) {
  const list = document.querySelector("#chapterbar .tabs");
  const tabs = new Map();
  for (const entry of chapters) {
    const tab = document.createElement("a");
    tab.className = "tab tabular";
    tab.href = `#ch-${entry.chapter}`;
    tab.id = `tab-${entry.chapter}`;
    tab.role = "tab";
    tab.tabIndex = -1;
    tab.textContent = String(entry.chapter);
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      go(tab.getAttribute("href"));
    });
    tab.title = entry.title;
    // The preview follows the pointer without committing to a chapter, so the bar can
    // be read as a table of contents rather than only stepped through.
    tab.addEventListener("mouseenter", () => {
      document.querySelector("#preview").textContent = entry.summary.hover;
    });
    list.append(tab);
    tabs.set(entry.chapter, tab);
  }
  document.querySelector("#panel").setAttribute("aria-labelledby", "tab-1");

  /* Roving tabindex: one Tab stop for thirty-seven chapters, and the arrows move within
   * them. Thirty-seven stops would make the rest of the page unreachable by keyboard. */
  list.addEventListener("keydown", (event) => {
    const numbers = [...tabs.keys()];
    const here = numbers.indexOf(Number(event.target.id?.replace("tab-", "")));
    const to = {
      ArrowLeft: here - 1,
      ArrowRight: here + 1,
      Home: 0,
      End: numbers.length - 1,
    }[event.key];
    if (to !== undefined && to >= 0 && to < numbers.length) {
      event.preventDefault();
      const next = tabs.get(numbers[to]);
      next.tabIndex = 0;
      next.focus();
      go(next.getAttribute("href"));
    } else if (event.key === "Escape") {
      go("");
    } else if (event.key === " ") {
      event.preventDefault();
      event.target.click();
    }
  });
  return tabs;
}

function renderOverviewPanel(journey) {
  const panel = document.querySelector("#panel");
  panel.replaceChildren();
  // Not the "pick a chapter" line: the preview strip above the globe already says it,
  // and saying it twice in one screenful reads as a page that has lost its place.
  const stops = document.createElement("p");
  stops.className = "label";
  stops.textContent = journey.nodes
    .map((node) => node.name_in_text)
    .filter((name, index, all) => all.indexOf(name) === index)
    .join(" · ");
  panel.append(stops);
}

function renderPanel(entry, chapters, journey, located) {
  const panel = document.querySelector("#panel");
  panel.replaceChildren();
  panel.setAttribute("aria-labelledby", `tab-${entry.chapter}`);

  const count = document.createElement("p");
  count.className = "label tabular";
  count.textContent = t("chapter.of", {
    n: entry.chapter,
    total: chapters.chapters.length,
  });
  panel.append(count, stepper(entry, chapters.chapters.length));

  const title = document.createElement("h3");
  title.tabIndex = -1;
  title.textContent = entry.title;
  panel.append(title);

  panel.append(paragraph(entry.summary.detail));

  panel.append(section("where.heading", whereTheyAre(entry, chapters.tracks)));
  panel.append(section("day.heading", eightyDays(entry, journey)));
  panel.append(section("people.present.heading", cast(entry.present, true)));
  panel.append(
    section("people.elsewhere.heading", cast(entry.named_elsewhere, false)),
  );
  panel.append(section("place.heading", chapterPlaces(entry, located)));
  panel.append(section("transport.heading", travel(entry)));
}

function anchor(text, hash) {
  const link = document.createElement("a");
  link.textContent = text;
  link.href = hash || location.pathname;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    go(hash);
  });
  return link;
}

function stepper(entry, total) {
  const row = document.createElement("div");
  row.className = "stepper";
  const back = anchor(t("chapter.previous"), `#ch-${Math.max(1, entry.chapter - 1)}`);
  const on = anchor(t("chapter.next"), `#ch-${Math.min(total, entry.chapter + 1)}`);
  const all = anchor(t("chapters.overview"), "");
  // Down to the same chapter written out in full — the pairing that turns a duplicate
  // into two views of one thing.
  const read = document.createElement("a");
  read.textContent = t("chapter.read_below");
  read.href = `#ch-${entry.chapter}`;
  row.append(back, on, all, read);
  return row;
}

/* The three tracks, with how we know shown beside each. A carried row is dimmed, which
 * is the same "nobody is asserting this" channel as a pin's broken ring. */
function whereTheyAre(entry, tracks) {
  const display = new Map(tracks.map((track) => [track.key, track.display]));
  const list = document.createElement("ul");
  list.className = "plain";
  for (const row of entry.tracks) {
    const item = document.createElement("li");
    const who = display.get(row.track) || row.track;
    if (row.source === "unknown") {
      item.textContent = t("track.absent", { who });
      item.className = "faint";
    } else {
      const how =
        row.source === "carried"
          ? t("track.carried", { n: row.stated_at_chapter })
          : row.source === "inferred"
            ? t("track.inferred")
            : t("track.stated", { n: row.stated_at_chapter });
      /* Only a node, never `place_name_in_text`. A carried row's printed place comes
       * from the chapter that stated it, and for Fix in chapter 9 that is "station" —
       * true of that chapter and meaningless here. */
      const at = row.at_node;
      item.textContent = at ? `${who} — ${at} · ${how}` : `${who} — ${how}`;
      if (row.source === "carried") item.className = "faint";
    }
    list.append(item);
  }
  return list;
}

/* What the eighty days can honestly be told from.
 *
 * The table gives a budget per stage. `along` orders pins along a line and is not time —
 * verne80.position.RoutePoint says so at length — so there is no interpolated day here,
 * no percentage and no progress bar. The sentence about a budget is what stops "days 20
 * to 23" being read as "it is day 21".
 */
function eightyDays(entry, journey) {
  const wrap = document.createDocumentFragment();
  const fogg = entry.tracks.find((row) => row.track === "fogg");
  const leg = fogg && fogg.leg !== null ? journey.legs[fogg.leg] : null;
  if (!leg) {
    wrap.append(paragraph(t("day.no_window")));
  } else {
    const nodes = journey.nodes;
    wrap.append(
      paragraph(
        t("day.window", {
          origin: nodes[leg.origin].name_in_text,
          destination: nodes[leg.destination].name_in_text,
          from: leg.day_from,
          to: leg.day_to,
        }),
      ),
    );
    wrap.append(note(t("day.not_a_date")));
  }
  if (entry.schedule.status === "unknown") {
    wrap.append(paragraph(t("day.silent")));
    return wrap;
  }
  const status = t(`schedule.${entry.schedule.status}`);
  wrap.append(
    paragraph(
      entry.schedule.detail
        ? t("day.says_detail", { status, detail: entry.schedule.detail })
        : t("day.says", { status }),
    ),
  );
  return wrap;
}

/* People the book names, and people the book only describes.
 *
 * The two are kept apart because merging them would assert that the engineer of one
 * chapter is the engineer of another. There are nine engineers and they are nine men.
 */
function cast(people, present) {
  const wrap = document.createDocumentFragment();
  if (!people.length) {
    wrap.append(note(t("people.elsewhere.none")));
    return wrap;
  }
  const named = people.filter((one) => one.kind === "person");
  const roles = people.filter((one) => one.kind === "role");

  if (named.length) {
    const list = document.createElement("ul");
    list.className = "plain";
    for (const one of named) {
      const item = document.createElement("li");
      item.textContent = one.display;
      // The printed spelling is a quotation and survives the fold. Where it differs
      // from the display name, or where one chapter prints two, say so.
      const printed = [one.name_in_text, ...one.also_printed].filter(
        (name) => name !== one.display,
      );
      if (printed.length) {
        const quoted = document.createElement("span");
        quoted.className = "faint";
        quoted.textContent = ` — ${t("people.printed_as", {
          names: printed.join(", "),
        })}`;
        item.append(quoted);
      }
      list.append(item);
    }
    wrap.append(list);
  }

  if (roles.length) {
    const line = document.createElement("p");
    line.className = "faint";
    line.textContent = roles.map((one) => one.display).join(", ");
    wrap.append(line);
    if (present) wrap.append(note(t("people.roles.note")));
  }
  return wrap;
}

/* Every place the chapter names, drawn or not, with the reason attached when not.
 *
 * This list is the accessible twin of the marks on the globe: the SVG overlay is
 * aria-hidden, because nineteen dot labels read in projection order is noise, and a
 * named, classed, reasoned list is the same information in a usable order.
 */
function chapterPlaces(entry, located) {
  const wrap = document.createDocumentFragment();
  const list = document.createElement("ul");
  list.className = "places";
  for (const place of entry.places) {
    const item = document.createElement("li");
    item.className = `place is-${place.class}`;
    if (!place.plotted) item.classList.add("unplotted");

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = place.name_in_text;
    item.append(name);

    const said = document.createElement("span");
    said.className = "faint";
    const resolved = located.get(place.key);
    /* A modern name only for the places the curation vouches for — the nine stops and
     * the waypoints. The other 177 are resolved and unreviewed, and some of those
     * resolutions are wrong in ways that a rename makes worse rather than better:
     * Benares comes back as Lal Bahadur Shastri Airport. Printing nothing is the honest
     * answer until somebody has looked. */
    const modern =
      resolved &&
      resolved.tier === "itinerary" &&
      resolved.name_changed &&
      resolved.modern_name !== place.name_in_text
        ? `, ${resolved.modern_name}`
        : "";
    said.textContent = ` — ${t(`place.class.${place.class}`)}${modern}`;
    item.append(said);

    /* The sub-line: why this one is not drawn, how far the resolution is to be
     * trusted, and where else the book names it. A place that turns up in nine
     * chapters is a different kind of thing from one named once in passing. */
    const aside = [];
    if (!place.plotted && place.reason) aside.push(t(`place.${place.reason}`));
    if (resolved && resolved.doubtful) {
      aside.push(
        t("place.doubtful", {
          score: resolved.confidence,
          threshold: provenanceThreshold,
        }),
      );
    }
    if (resolved && resolved.chapters && resolved.chapters.length > 1) {
      aside.push(t("place.chapters", { numbers: resolved.chapters.join(", ") }));
    }
    if (aside.length) {
      const why = document.createElement("span");
      why.className = "faint reason";
      why.textContent = aside.join(" · ");
      item.append(why);
    }
    if (place.plotted) {
      item.addEventListener("mouseenter", () => globeLight(place.key));
      item.addEventListener("mouseleave", () => globeLight(null));
    }
    list.append(item);
  }
  wrap.append(list);
  wrap.append(
    note(
      t("place.count", {
        plotted: entry.place_counts.plotted,
        named: entry.place_counts.named,
      }),
    ),
  );
  return wrap;
}

function travel(entry) {
  if (!entry.transport.length) return note(t("transport.none"));
  const list = document.createElement("ul");
  list.className = "plain";
  for (const item of entry.transport) {
    const row = document.createElement("li");
    row.innerHTML = dashSwatch(item.mode);
    const label = document.createElement("span");
    const parts = [t(`mode.${item.mode}`)];
    if (item.vessel) parts.push(item.vessel);
    if (item.from && item.to) {
      parts.push(t("transport.between", { from: item.from, to: item.to }));
    }
    label.textContent = parts.join(" · ");
    row.append(label);
    list.append(row);
  }
  return list;
}

let provenanceThreshold = 0.7;
let lightHandler = () => {};
function globeLight(key) {
  lightHandler(key);
}

/* ------------------------------------------------------------------ shared bits */

function section(key, body) {
  const wrap = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = t(key);
  wrap.append(heading, body);
  return wrap;
}

function paragraph(text) {
  const node = document.createElement("p");
  node.textContent = text;
  return node;
}

function note(text) {
  const node = document.createElement("p");
  node.className = "note";
  node.textContent = text;
  return node;
}

/* The dash is what carries the key into greyscale and into print, so it is drawn rather
 * than named. Not TRANSPORT_STYLE's glyphs: they include ● and ▲, which neither of the
 * page's two typefaces has, so those chips would fall back mid-line. */
let styleFor = () => ({});
function dashSwatch(mode) {
  const style = styleFor(mode);
  return (
    `<svg width="34" height="12" aria-hidden="true">` +
    `<line x1="1" y1="6" x2="33" y2="6" stroke="var(${style.colour})" ` +
    `stroke-width="${style.width || 2}" stroke-linecap="round" ` +
    `stroke-dasharray="${(style.dash || []).join(" ")}"/></svg>`
  );
}

function setToggleLabel(button, globe) {
  const paused = globe?.isPaused?.() ?? true;
  button.textContent = t(paused ? "globe.rotate.play" : "globe.rotate.pause");
  button.setAttribute("aria-pressed", String(paused));
}

/* The counts used to sit above the globe. They are one sentence in the closing section
 * now, filled from the build rather than typed, so the numbers cannot drift away from
 * the payload they describe. */
function renderChecked(record) {
  const counts = record.places;
  document.querySelector("#about-checked").textContent = t("about.checked", {
    plotted: counts.plotted,
    total: counts.total,
    doubtful: counts.doubtful,
    threshold: record.doubtful_below,
  });
}

/* Borders are a display preference, not content, so they live in localStorage rather
 * than in the hash — the same reasoning felsozsolca uses for its theme. `?borders=`
 * overrides it, so a link can still carry the comparison to somebody else. */
function buildBorderControl(globe) {
  const group = document.querySelector("#borders");
  const asked = new URLSearchParams(location.search).get("borders");
  let remembered = null;
  try {
    remembered = localStorage.getItem("borders");
  } catch {
    // A browser refusing storage is not a reason to fail to draw a globe.
  }
  let era = [asked, remembered, "1880"].find((one) => ERAS.includes(one)) || "1880";

  const buttons = new Map();
  for (const name of ERAS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = t(`borders.${name === "none" ? "none" : name}`);
    button.addEventListener("click", () => choose(name));
    group.append(button);
    buttons.set(name, button);
  }

  function choose(name) {
    era = name;
    for (const [key, button] of buttons) {
      button.setAttribute("aria-pressed", String(key === name));
    }
    globe.setBorders(name === "none" ? null : name);
    // The note explains what the historic layer is, so it belongs to that layer rather
    // than sitting under the control saying it about whatever is currently drawn.
    document.querySelector(".borders-note").hidden = name !== "1880";
    try {
      localStorage.setItem("borders", name);
    } catch {
      // Nothing to do, and nothing worth telling the reader about.
    }
  }
  choose(era);
}

function renderLegend(journey) {
  styleFor = (mode) => journey.transport_style[mode] || {};
  const modes = document.querySelector("#legend-modes");
  for (const mode of [...new Set(journey.legs.map((leg) => leg.primary_mode))]) {
    const item = document.createElement("li");
    item.innerHTML = dashSwatch(mode);
    const label = document.createElement("span");
    const legs = journey.legs.filter((leg) => leg.primary_mode === mode);
    label.textContent = `${t(`mode.${mode}`)} — ${t("stage.count", {
      n: legs.length,
    })}`;
    item.append(label);
    modes.append(item);
  }

  const places = document.querySelector("#legend-places");
  for (const name of ["here", "past", "future", "cyclic", "off_route"]) {
    const item = document.createElement("li");
    item.className = `place is-${name}`;
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    const label = document.createElement("span");
    label.textContent = t(`place.class.${name}`);
    item.append(swatch, label);
    places.append(item);
  }
}

/* The itinerary is written into the page at build time, so this replaces rather than
 * appends — otherwise a reader with scripting on would see all nine stops twice. */
function renderItinerary(journey, places) {
  const list = document.querySelector("#itinerary");
  list.replaceChildren();
  const named = new Map(places.places.map((place) => [place.key, place]));

  journey.nodes.forEach((node, position) => {
    const item = document.createElement("li");
    const day = document.createElement("span");
    day.className = "day-badge tabular";
    day.textContent = t("stage.day", { n: node.day });
    const name = document.createElement("span");
    name.className = "stop-name";
    name.textContent = node.name_in_text;
    item.append(day, name);

    if (node.name_changed && node.modern_name !== node.name_in_text) {
      const modern = document.createElement("span");
      modern.className = "renamed";
      modern.textContent = ` — ${t("place.renamed", {
        old: node.name_in_text,
        new: node.modern_name,
      })}`;
      item.append(modern);
    }

    const leg = journey.legs[position];
    if (leg) {
      const onward = document.createElement("p");
      onward.className = "onward";
      const via = leg.via_as_written.length
        ? ` ${t("stage.via", { places: leg.via_as_written.join(", ") })}.`
        : "";
      const waypoints = leg.waypoints
        .map((point) => named.get(point.key)?.name_in_text)
        .filter(Boolean);
      const drawn = waypoints.length ? ` Drawn through ${waypoints.join(", ")}.` : "";
      onward.textContent = `${leg.mode_as_written}, ${t("stage.days", {
        n: leg.days,
      })}.${via}${drawn}`;
      item.append(onward);
    }
    list.append(item);
  });
}

main().catch((error) => {
  console.error(error);
  /* This used to write into #provenance, which no longer exists — so until now a
   * payload that failed to load produced a silently blank page. The page itself is
   * fully rendered at build time, so a failure here costs the globe and nothing else,
   * and saying so is better than leaving a dead interface. */
  const box = document.querySelector("#page-error");
  if (box) {
    box.textContent = `The globe could not load its data: ${error.message}`;
    box.hidden = false;
  }
});
