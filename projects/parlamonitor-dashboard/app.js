import { rtd } from "./rtd.js";
import Graph from "./vendor/graphology.esm.js";
import forceAtlas2 from "./vendor/forceatlas2.esm.js";
import { setupSound, VIRTUE_PITCH } from "./sound.js";

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
  lines: {
    kinds: {
      applause:      { name: "Taps",               short: "taps" },
      laughter_with: { name: "Nevetés vele",        short: "nevetés vele" },
      laughter_at:   { name: "Nevetés rajta",       short: "nevetés rajta" },
      heckle:        { name: "Bekiabálás",          short: "bekiabálás" },
      quiet:         { name: "Csendes mondatok",    short: "csendes mondat" }
    },
    cmpTitle: "Mi vált ki tapsot, nevetést, bekiabálást?",
    cmpLede: "Minden reakciót visszahelyeztünk arra a mondatra, amely után a " +
      "jegyzőkönyv rögzítette. Itt e mondatok szókincse áll szemben azokéval, " +
      "amelyekre semmi sem reagált. A nevetést aszerint bontjuk, hogy a " +
      "szónok saját oldala nevetett-e (vele) vagy a másik (rajta).",
    switchLabel: "Összevetés",
    buttons: {
      "applause|quiet": "Taps ↔ csend",
      "heckle|quiet": "Bekiabálás ↔ csend",
      "laughter_with|laughter_at": "Nevetés vele ↔ rajta"
    },
    caption: (rtd, l, r) =>
      `RTD = ${rtd}. ${l.name}: ${l.sentences} mondat, ${l.tokens} tartalmas szó · ` +
      `${r.name}: ${r.sentences} mondat, ${r.tokens} tartalmas szó.`,
    loading: "A mondatadatok betöltése…",
    featuresTitle: "Milyen mondatra tapsolnak?",
    featuresLede: "Hányszor gyakoribb egy-egy jellemző a reakciót kiváltó " +
      "mondatokban, mint a csendesekben. Az 1× vonaltól jobbra: gyakoribb; " +
      "balra: ritkább. A teli kör szignifikáns eltérést jelöl (p < 0,05), az üres nem.",
    features: {
      exclamation: "felkiáltással zárul", question: "kérdéssel zárul",
      number: "számot tartalmaz", we: "többes szám első személy (mi)",
      negation: "tagadást tartalmaz", names_opponent: "megnevezi a másik oldalt"
    },
    featuresNote: q => `Alap: ${q} csendes mondat, a megszólítások (Tisztelt Ház!) nélkül. ` +
      "A másik oldal megnevezése: a kormányoldali szónoknál Fidesz, KDNP, Orbán, Mi " +
      "Hazánk, Toroczkai; az ellenzékinél TISZA és Magyar Péter.",
    featuresSummary: "Táblázat: a jellemzők gyakorisága",
    featuresHead: ["reakció", "jellemző", "a reakció előtti mondatokban", "a csendes mondatokban", "arány", "szignifikancia"],
    ratio: "arány a csendes mondatokhoz",
    filled: "teli kör: szignifikáns", hollow: "üres kör: nem szignifikáns",
    positionTitle: "Hol a beszédben?",
    positionLede: "Melyik szakaszában hangzanak el a reakciót kiváltó mondatok: " +
      "a beszédet tíz egyenlő részre osztva, 100 mondatra vetítve. A beszéd " +
      "végi udvariassági tapsot külön számoljuk, mert az a beszédnek szól, nem a mondatnak.",
    closingKpi: "beszéd végi taps", closingSub: (n, of) => `${n} a ${of} reakcióból`,
    linesKpi: "mondat utáni reakció", linesSub: n => `${n} mondat a 43. ciklusban`,
    deciles: ["eleje", "vége"], per100: "100 mondatra",
    positionNote: "A tengelyek panelenként eltérnek: a bekiabálás nagyságrenddel gyakoribb a nevetésnél.",
    mpTitle: "Kinek a mondatai?",
    mpLede: "Egy felszólaló reakciót kiváltó mondatai szó szerint, a jegyzőkönyvből, " +
      "a legerősebb tapssal kezdve. Mellette, hogy 100 mondatából hány váltott ki " +
      "reakciót, a frakciója átlagához mérve.",
    mpLabel: "Felszólaló",
    fewSentences: "kevés mondat",
    mpKpi: (kind) => kind,
    mpSub: (rate, fac) => `frakció: ${fac}`,
    noBest: "Ennek a felszólalónak kevesebb mint 100 mondata van, ezért nem mutatunk tőle idézetet.",
    noLines: "nincs ilyen mondata",
    interrupted: "félbeszakítva",
    mpNote: min => `A ${min} mondatnál rövidebb életművek aránya zajos, ezért jelöljük őket.`
  },
  living: {
    dayTitle: "Egy ülésnap, ahogy a terem hallotta",
    dayLede: "Az egész nap egyetlen idővonalon, mint egy kotta. Középen a felszólalások, " +
      "a szónok frakciójának színében. Fölöttük a szónok saját oldalának válaszai: taps, " +
      "nevetés, biztató közbeszólás. Alattuk a másik oldalé: bekiabálás — külön sávban " +
      "az ellenséges, vádló vagy sértő —, nevetés rajta, és a terem zaja, morajlása. " +
      "Kattintson egy felszólalásra, és alább elolvashatja, mondatonként.",
    dayLabel: "Ülésnap",
    dayOption: (date, n) => `${date} — ${n} reakció`,
    own: "fent: a szónok saját oldala",
    other: "lent: a másik oldal",
    ownGroup: "a szónok saját oldala", otherGroup: "a másik oldal",
    speechesLane: "felszólalások",
    lanes: {
      support: "közbeszólás (biztató)", laugh_with: "nevetés vele", applause: "taps",
      heckle: "bekiabálás", heckle_hostile: "ellenséges bekiabálás",
      laugh_at: "nevetés rajta", noise: "zaj, moraj, felzúdulás"
    },
    reactionsWord: "reakció",
    scales: "minden sávnak saját skálája van (a jobb szélen: a legnagyobb oszlop)",
    hostileTag: "ellenséges",
    viewLabel: "Nézet",
    views: { score: "kotta", classic: "két tömb" },
    hostileTitle: w => `vádló, megszégyenítő vagy sértő szó: ${w}`,
    closing: "apró jel a sáv végén: udvariassági taps a beszéd után",
    axis: "az ülés kezdete óta eltelt idő (óra)",
    hour: h => `${h}. óra`,
    note: minutes => "A reakciók időpontja becslés: a beszéd kezdetéből és hosszából, " +
      "aszerint, hogy a beszéd szavainak mekkora része hangzott el addig a mondatig. " +
      `Egy oszlop ${minutes} percet fog át. A beszéd végi udvariassági tapsot és az ` +
      "elnöki csengőt nem számoljuk az oszlopokba.",
    tableSummary: "Táblázat: a nap felszólalásai",
    tableHead: ["kezdés", "felszólaló", "frakció", "műfaj", "saját oldal", "másik oldal"],
    binTip: (from, to) => `${from}–${to}`,
    ownN: n => `saját oldal: ${n}`, otherN: n => `másik oldal: ${n}`,
    speechTitle: "Egy felszólalás, a terem válaszaival",
    speechLede: "A beszéd szövege mondatonként. A reakciók azon az oldalon jelennek meg, " +
      "ahonnan jöttek: balra a kormánypárti, jobbra az ellenzéki padsorok. A ⟋ jel " +
      "azt mutatja, hol szakították félbe a szónokot.",
    gov: "kormánypárti padsorok", opp: "ellenzéki padsorok", speech: "a felszólalás",
    head: (who, fac, type, agenda) => `<strong>${who}</strong> (${fac}) · ${type}` +
      (agenda ? `<br><span style="color:var(--text-muted)">${agenda}</span>` : ""),
    meta: (start, minutes, own, other) =>
      `az ülés kezdete után ${start} · ${minutes} perc · saját oldal: ${own} reakció · másik oldal: ${other}`,
    cutTitle: "itt szakították félbe",
    noFaction: "frakción kívül",
    loading: "A nap betöltése…"
  },
  sound: {
    soundTitle: "Hallgassa meg",
    soundLede: "Ugyanez a nap — vagy egyetlen felszólalás — zeneként. Az alapdallamot az " +
      "erények szókincse adja: minden erénynek saját hangja van, magasan és fényesen, ha " +
      "dicsérik, két oktávval mélyebben és sötéten, ha vádként hangzik el. Alatta a téma " +
      "zúg: minden témának saját akkordja van. Erre szólnak rá a terem hangszerei: a taps, " +
      "a nevetés, a bekiabálás. A kormánypárti padsorok balról, az ellenzékiek jobbról szólnak.",
    soundNote: "Ez értelmezés, nem mérés: a hangmagasságok, az akkordok és a hangszerek " +
      "választott leképezések. Az időpontok ugyanazok a becslések, mint az idővonalon. " +
      "A téma a felszólalás BERTopic-témája; 28 téma jut 8 akkordra, így két téma " +
      "akkordja egyezhet.",
    modeLabel: "Mit szólaltassunk meg",
    modes: { day: "az egész napot", speech: "a kiválasztott felszólalást" },
    lengthLabel: "Hossz", tempoLabel: "Tempó",
    volumeLabel: "Hangerő",
    minutes: m => `${m} perc`,
    bpm: (n, sec) => `${n} mondat/perc (${sec} mp)`,
    play: "Lejátszás", pause: "Szünet", solo: "szóló",
    onLabel: layer => `${layer}: szóljon`,
    loading: "A hangszerek betöltése…",
    failed: "A hang nem indult el ebben a böngészőben.",
    dayPiece: m => `Az egész ülésnap ${m} percbe sűrítve. Nyomja meg a ▶ gombot.`,
    speechPiece: (who, topic) => `${who} felszólalása, mondatonként egy ütés` +
      (topic ? ` · téma: ${topic}` : " · ennek a felszólalásnak nincs témája, nincs zúgás") + ".",
    sentenceAt: (i, n, who) => `${who} · ${i}. mondat (összesen ${n})`,
    now: (who, fac, topic) => `Most: ${who}${fac ? ` (${fac})` : ""}` + (topic ? ` · téma: ${topic}` : ""),
    mappingHead: ["szól", "réteg", "hangszer", "ebben a darabban", ""],
    layers: {
      virtue_affirming: "erény, dicsérő", virtue_accusing: "erény, vádló", drone: "téma",
      applause: "taps", laugh_with: "nevetés vele", support: "közbeszólás (biztató)",
      heckle: "bekiabálás", heckle_hostile: "ellenséges bekiabálás", laugh_at: "nevetés rajta",
      noise: "zaj, moraj, felzúdulás", bell: "elnöki csengő",
      closing: "udvariassági taps a beszéd végén", pulse: "mondatütem"
    },
    instruments: {
      virtue_affirming: name => "magas pengetés; erényenként saját hang: " +
        Object.entries(VIRTUE_PITCH).map(([k, p]) => `${name(k)} ${p}`).join(", "),
      virtue_accusing: "ugyanaz a hang két oktávval mélyebben, sötét, kissé elhangolt hangszínnel",
      drone: "halk, kitartott akkord; témánként saját, a téma váltásakor vált",
      applause: "rózsaszín zaj, mint az eső; a hossza a taps erejét követi (taps → vastaps)",
      laugh_with: "gyors, felfelé futó xilofon",
      support: "fadob",
      heckle: "pergődobszerű kattanás",
      heckle_hostile: "mély rézfúvós döfés, kis szekund",
      laugh_at: "lefelé csúszó kürtszerű hang",
      noise: "mély, barna zaj, felduzzadó moraj",
      bell: "csengő",
      closing: "halk cintányér — alapból néma, mert szinte minden beszéd végén szól",
      pulse: "halk ütés minden mondatra — alapból néma"
    }
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
  if (view === "lines") renderLines();
  if (view === "elo") renderLiving();
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


/* ---------------------------------------------------------- applause lines */
/* Which sentences earned applause, laughter or heckling. The summary (features,
 * positions, rates) is in the bundle; the per-group word counts and the best
 * lines are a side file, fetched when the tab first opens. */
const LINE_KINDS = ["applause", "laughter_with", "laughter_at", "heckle"];
const lineColour = kind => SERIES[LINE_KINDS.indexOf(kind)];   // fixed order, never by rank
let LINES = null, linesLoading = null;

function loadLines() {
  if (LINES) return Promise.resolve(LINES);
  if (!linesLoading) {
    linesLoading = d3.json(DATA.applause.lines_path).then(raw => {
      const counts = {};
      Object.entries(raw.groups).forEach(([name, g]) => {
        let i = 0;
        counts[name] = new Map(g.gaps.map((gap, k) => [raw.vocab[(i += gap)], g.n[k]]));
      });
      const label = new Map(raw.vocab.map((t, i) => [t, raw.labels[i] || t]));
      LINES = { ...raw, counts, label };
      return LINES;
    });
  }
  return linesLoading;
}

function renderLines() {
  const A = DATA && DATA.applause;
  if (!A) { document.getElementById("lines").classList.add("hidden"); return; }
  const S = T.lines;
  const set = (id, text) => { document.getElementById(id).textContent = text; };
  set("lines-cmp-title", S.cmpTitle); set("lines-cmp-lede", S.cmpLede);
  set("lines-switch-label", S.switchLabel);
  set("lines-diamond-title", T.allotax.diamondTitle); set("lines-shift-title", T.allotax.shiftTitle);
  set("lines-features-title", S.featuresTitle); set("lines-features-lede", S.featuresLede);
  set("lines-features-summary", S.featuresSummary);
  set("lines-position-title", S.positionTitle); set("lines-position-lede", S.positionLede);
  set("lines-mp-title", S.mpTitle); set("lines-mp-lede", S.mpLede); set("lines-mp-label", S.mpLabel);

  drawLineFeatures(A, S);
  drawLinePositions(A, S);
  if (!LINES) set("lines-caption", S.loading);
  loadLines().then(() => { drawLineComparison(A, S); drawLineSpeaker(A, S); });
}

function drawLineComparison(A, S) {
  const ids = Object.keys(S.buttons);
  if (!state.linesCmp) state.linesCmp = ids[0];
  const sw = document.getElementById("lines-switch");
  sw.innerHTML = "";
  ids.forEach((id, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(id === state.linesCmp));
    b.tabIndex = id === state.linesCmp ? 0 : -1;
    b.textContent = S.buttons[id];
    b.onclick = () => { state.linesCmp = id; drawLineComparison(A, S); };
    b.onkeydown = e => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      state.linesCmp = ids[(i + step + ids.length) % ids.length];
      drawLineComparison(A, S);
      sw.querySelector('[aria-checked="true"]').focus();
    };
    sw.appendChild(b);
  });
  const [left, right] = state.linesCmp.split("|");
  const result = rtd(LINES.counts[left], LINES.counts[right], A.params.alpha);
  result.types.forEach(t => { t.label = LINES.label.get(t.t) || t.t; });
  const L = { name: S.kinds[left].name, short: S.kinds[left].short };
  const R = { name: S.kinds[right].name, short: S.kinds[right].short };
  const share = t => t.contrib / result.divergence * 100;
  const sideName = t => t.dir === "left" ? L.short : t.dir === "right" ? R.short : "—";
  const X = T.allotax;
  const wordTip = t =>
    `<strong>${t.label}</strong> · ${X.towards(sideName(t))}<br>` +
    `${L.short}: ${t.c1} ${X.count}, ${X.rank} ${fmt(t.r1, 1)}<br>` +
    `${R.short}: ${t.c2} ${X.count}, ${X.rank} ${fmt(t.r2, 1)}<br>` +
    `${X.share}: ${fmt(share(t), 2)}%`;
  drawAllotaxDiamond(document.getElementById("lines-diamond"), result.types,
    { divergence: result.divergence, alpha: A.params.alpha }, L, R,
    "var(--series-1)", "var(--series-2)", X, wordTip, document.getElementById("lines-legend"));
  drawWordShift(document.getElementById("lines-shift"),
    result.types.filter(t => t.dir !== "shared").slice(0, 25), share,
    "var(--series-1)", "var(--series-2)", X, wordTip);
  const sentencesOf = kind => kind === "quiet" ? A.quiet_sentences
    : (A.features.find(f => f.line_kind === kind) || {}).lines;
  set("lines-caption", S.caption(fmt(result.divergence, 3),
    { name: L.name, sentences: fmt(sentencesOf(left), 0), tokens: fmt(LINES.groups[left].tokens, 0) },
    { name: R.name, sentences: fmt(sentencesOf(right), 0), tokens: fmt(LINES.groups[right].tokens, 0) }));
  function set(id, text) { document.getElementById(id).textContent = text; }
}

function drawLineFeatures(A, S) {
  const host = document.getElementById("lines-features");
  const rows = A.features.filter(f => f.feature !== "median_words" && f.rate_ratio);
  const features = Object.keys(S.features);
  const W = Math.max(320, Math.min(900, host.clientWidth || 760));
  const labelW = 220, rowH = 34, top = 10, bottom = 38;
  const H = top + features.length * rowH + bottom;
  const ratios = rows.map(r => r.rate_ratio);
  const x = d3.scaleLog().domain([Math.min(0.3, d3.min(ratios)) * 0.9, Math.max(3.5, d3.max(ratios)) * 1.1])
    .range([labelW, W - 16]);
  const y = f => top + features.indexOf(f) * rowH + rowH / 2;
  const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%").attr("role", "img").attr("aria-label", S.featuresTitle);
  svg.append("g").selectAll("line").data(features).join("line")
    .attr("x1", labelW).attr("x2", W - 16).attr("y1", y).attr("y2", y)
    .style("stroke", "var(--grid)");
  svg.append("line").attr("x1", x(1)).attr("x2", x(1)).attr("y1", top - 4).attr("y2", H - bottom + 4)
    .style("stroke", "var(--text-muted)").style("stroke-dasharray", "3 3").style("pointer-events", "none");
  svg.append("g").selectAll("text").data(features).join("text")
    .attr("x", labelW - 10).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end")
    .style("font-size", "12.5px").style("fill", "var(--text-secondary)").text(f => S.features[f]);
  const dodge = kind => (LINE_KINDS.indexOf(kind) - 1.5) * 6;
  const significant = r => r.significance && r.significance !== "ns";
  const cx = r => x(r.rate_ratio), cy = r => y(r.feature) + dodge(r.line_kind);
  svg.append("g").selectAll("circle").data(rows).join("circle")
    .attr("cx", cx).attr("cy", cy).attr("r", 5)
    .style("fill", r => significant(r) ? lineColour(r.line_kind) : "var(--surface-1)")
    .style("stroke", r => lineColour(r.line_kind)).style("stroke-width", 2)
    .style("pointer-events", "none");
  // Hit targets: one band per dot, 20px wide and as tall as its dodge slot, so
  // neighbouring dots in a row never cover each other's target.
  svg.append("g").attr("class", "hit").selectAll("rect").data(rows).join("rect")
    .attr("x", r => cx(r) - 10).attr("y", r => cy(r) - 3).attr("width", 20).attr("height", 6)
    .style("fill", "transparent")
    .on("mousemove", (event, r) => showTip(
      `<strong>${S.kinds[r.line_kind].name}</strong> · ${S.features[r.feature]}<br>` +
      `${fmt(r.lines_with, 0)} / ${fmt(r.lines, 0)} mondat (${fmt(r.rate_lines * 100, 1)}%) ` +
      `· csendes: ${fmt(r.quiet_with, 0)} / ${fmt(r.quiet, 0)} (${fmt(r.rate_quiet * 100, 1)}%)<br>` +
      `${fmt(r.rate_ratio, 2)}× · ${r.significance}`, event))
    .on("mouseleave", hideTip);
  const axis = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - bottom + 6})`)
    .call(d3.axisBottom(x).tickValues([0.25, 0.5, 1, 2, 3]).tickFormat(v => fmt(v, 2) + "×").tickSizeOuter(0));
  axis.select(".domain").remove();
  svg.append("text").attr("x", x(1)).attr("y", H - 4).attr("text-anchor", "middle")
    .style("font-size", "10.5px").style("fill", "var(--text-muted)").text(S.ratio);

  document.getElementById("lines-features-legend").innerHTML =
    LINE_KINDS.map(k => `<span><i class="swatch" style="background:${lineColour(k)};border-radius:50%"></i>${S.kinds[k].name}</span>`).join("") +
    `<span style="color:var(--text-muted)">${S.filled} · ${S.hollow}</span>`;
  document.getElementById("lines-features-note").textContent = S.featuresNote(fmt(A.quiet_sentences, 0));
  const table = d3.select("#lines-features-table").html("");
  table.append("thead").append("tr").selectAll("th").data(S.featuresHead).join("th").text(d => d).style("cursor", "default");
  table.append("tbody").selectAll("tr").data(rows).join("tr").html(r =>
    `<td>${S.kinds[r.line_kind].name}</td><td>${S.features[r.feature]}</td>` +
    `<td class="num">${fmt(r.lines_with, 0)} / ${fmt(r.lines, 0)}</td>` +
    `<td class="num">${fmt(r.quiet_with, 0)} / ${fmt(r.quiet, 0)}</td>` +
    `<td class="num">${fmt(r.rate_ratio, 2)}×</td><td>${r.significance}</td>`);
}

function drawLinePositions(A, S) {
  const placed = A.counts.placed, closing = A.counts.closing;
  document.getElementById("lines-position-kpis").innerHTML =
    `<div class="kpi"><div class="k">${S.closingKpi}</div><div class="v">${fmt(closing / placed * 100, 0)}%</div>` +
    `<div class="s">${S.closingSub(fmt(closing, 0), fmt(placed, 0))}</div></div>` +
    `<div class="kpi"><div class="k">${S.linesKpi}</div><div class="v">${fmt(A.counts.aligned - closing, 0)}</div>` +
    `<div class="s">${S.linesSub(fmt(A.sentences, 0))}</div></div>`;
  const host = d3.select("#lines-position").html("");
  LINE_KINDS.forEach(kind => {
    const data = A.positions[kind].per_100.map((v, i) => ({ i, v, n: A.positions[kind].lines[i], of: A.positions[kind].sentences[i] }));
    const panel = host.append("div");
    panel.append("h3").style("font-size", "13px").style("margin", "0 0 4px").style("display", "flex")
      .style("align-items", "center").style("gap", "6px")
      .html(`<i class="swatch" style="background:${lineColour(kind)}"></i>${S.kinds[kind].name}`);
    const W = 260, H = 130, m = { l: 34, r: 8, t: 8, b: 24 };
    const x = d3.scaleLinear().domain([0, 9]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.v) || 1]).nice().range([H - m.b, m.t]);
    const svg = panel.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
      .attr("role", "img").attr("aria-label", `${S.positionTitle}: ${S.kinds[kind].name}`);
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(3).tickSize(-(W - m.l - m.r)).tickFormat(v => fmt(v, 1)))
      .call(g => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b + 4})`)
      .call(d3.axisBottom(x).tickValues([0, 9]).tickFormat((v, i) => S.deciles[i]).tickSize(0))
      .call(g => g.select(".domain").remove())
      // Anchor the end labels inward, or "vége" is clipped at the panel edge.
      .call(g => g.selectAll(".tick text").attr("text-anchor", (d, i) => (i ? "end" : "start")));
    svg.append("path").datum(data).attr("d", d3.line().x(d => x(d.i)).y(d => y(d.v)))
      .style("fill", "none").style("stroke", lineColour(kind)).style("stroke-width", 2);
    svg.append("g").selectAll("circle").data(data).join("circle")
      .attr("cx", d => x(d.i)).attr("cy", d => y(d.v)).attr("r", 4)
      .style("fill", lineColour(kind)).style("stroke", "var(--surface-1)").style("stroke-width", 2)
      .on("mousemove", (event, d) => showTip(
        `<strong>${S.kinds[kind].name}</strong> · ${d.i * 10}–${d.i * 10 + 10}%<br>` +
        `${fmt(d.n, 0)} / ${fmt(d.of, 0)} mondat · ${fmt(d.v, 2)} ${S.per100}`, event))
      .on("mouseleave", hideTip);
  });
  document.getElementById("lines-position-note").textContent = S.positionNote;
}

function drawLineSpeaker(A, S) {
  const sel = document.getElementById("lines-mp");
  const speakers = A.rates.speaker.slice().sort((a, b) => d3.ascending(a.speaker, b.speaker));
  if (!sel.options.length) {
    speakers.forEach(r => sel.appendChild(new Option(
      `${r.speaker} (${r.faction || T.vocab.noFaction}) — ${fmt(r.sentences, 0)} mondat` +
      (r.below_min_sentences ? ` · ${S.fewSentences}` : ""), r.speaker_id)));
    const wanted = new URLSearchParams(location.search).get("lmp");
    const byId = new Map(speakers.map(r => [r.speaker_id, r]));
    const first = A.rates.speaker.slice().sort((a, b) => d3.descending(a.sentences, b.sentences))[0];
    sel.value = byId.has(wanted) ? wanted : byId.has(state.mp) ? state.mp : first.speaker_id;
    sel.onchange = () => {
      const url = new URL(location.href); url.searchParams.set("lmp", sel.value);
      history.replaceState(null, "", url);
      drawLineSpeaker(A, S);
    };
  }
  const me = speakers.find(r => r.speaker_id === sel.value);
  const faction = A.rates.faction.find(f => f.faction === me.faction);
  document.getElementById("lines-mp-kpis").innerHTML = LINE_KINDS.map(kind =>
    `<div class="kpi"><div class="k"><i class="swatch" style="background:${lineColour(kind)}"></i> ${S.kinds[kind].name}</div>` +
    `<div class="v">${fmt(me[`${kind}_per_100`], 1)}</div>` +
    `<div class="s">${fmt(me[kind], 0)} mondat · ${S.mpSub(null, faction ? fmt(faction[`${kind}_per_100`], 1) : "—")}</div></div>`).join("");
  const best = LINES.best[me.speaker_id];
  const host = document.getElementById("lines-mp-best");
  if (!best) { host.innerHTML = `<p class="note">${S.noBest}</p>`; }
  else {
    const esc = t => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    host.innerHTML = LINE_KINDS.map(kind => {
      const items = best[kind] || [];
      return `<div class="line-group"><h4><i class="swatch" style="background:${lineColour(kind)}"></i>${S.kinds[kind].name}</h4>` +
        (items.length ? items.map(l =>
          `<div class="line-quote">„${esc(l.text)}${l.interrupted ? "…" : ""}”` +
          `<span class="react">(${esc(l.span)})${l.interrupted ? " · " + S.interrupted : ""} · ${l.date} · ${esc(l.speech_type)}</span></div>`).join("")
          : `<p class="note" style="margin:2px 0 8px">${S.noLines}</p>`) + "</div>";
    }).join("");
  }
  document.getElementById("lines-mp-note").textContent = S.mpNote(A.params.min_sentences);
}


/* ------------------------------------------------------- living parliament */
/* A sitting day as a conversation. One file per day, fetched as a day is
 * picked. Above the strip: the speaker's own side responding; below: the other
 * side answering back (see parlamonitor.living for the rules). */
const livingDays = new Map();

function loadDay(date) {
  if (!livingDays.has(date)) livingDays.set(date, d3.json(DATA.living.path + date + ".json"));
  return livingDays.get(date);
}

const esc = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const huDate = d => new Date(d + "T12:00:00").toLocaleDateString("hu-HU", { month: "long", day: "numeric" });
const clock = sec => `${Math.floor(sec / 3600)}:${String(Math.floor(sec % 3600 / 60)).padStart(2, "0")}`;
const glyph = kinds => kinds.includes("heckling") || kinds.includes("interjection") ? "💬"
  : kinds.includes("laughter") ? "😄" : kinds.includes("applause") ? "👏" : kinds.includes("bell") ? "🔔" : "·";

function renderLiving() {
  const L = DATA && DATA.living;
  if (!L) { document.getElementById("elo").classList.add("hidden"); return; }
  const S = T.living;
  const set = (id, text) => { document.getElementById(id).textContent = text; };
  set("elo-day-title", S.dayTitle); set("elo-day-lede", S.dayLede); set("elo-day-label", S.dayLabel);
  set("elo-speech-title", S.speechTitle); set("elo-speech-lede", S.speechLede);
  set("elo-table-summary", S.tableSummary);
  const sel = document.getElementById("elo-day");
  if (!sel.options.length) {
    L.days.forEach(d => sel.appendChild(new Option(S.dayOption(huDate(d.date), fmt(d.reactions, 0)), d.date)));
    const params = new URLSearchParams(location.search);
    const busiest = L.days.slice().sort((a, b) => d3.descending(a.reactions, b.reactions))[0].date;
    sel.value = L.days.some(d => d.date === params.get("day")) ? params.get("day") : busiest;
    state.eloSpeech = params.get("speech");
    state.eloView = params.get("view") === "classic" ? "classic" : "score";
    sel.onchange = () => { state.eloSpeech = null; showDay(); };
    const viewSw = document.getElementById("elo-view");
    set("elo-view-label", S.viewLabel);
    Object.entries(S.views).forEach(([id, label]) => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.setAttribute("role", "radio"); btn.textContent = label;
      btn.setAttribute("aria-checked", String(id === state.eloView));
      btn.onclick = () => {
        state.eloView = id;
        viewSw.querySelectorAll("button").forEach(x => x.setAttribute("aria-checked", String(x === btn)));
        const url = new URL(location.href); url.searchParams.set("view", id);
        history.replaceState(null, "", url);
        showDay();
      };
      viewSw.appendChild(btn);
    });
    state.sound = setupSound({
      S: T.sound,
      getDay: () => state.eloDay,
      getMeta: () => state.eloDay && L.days.find(d => d.date === state.eloDay.date),
      getSpeech: () => state.eloDay &&
        (state.eloDay.speeches.find(x => x.uid === state.eloSpeech) || state.eloDay.speeches[0]),
      getGeom: () => state.eloGeom,
      virtueName: key => T.metrics[`virtue_${key}`].hu.split(",")[0].toLowerCase()
    });
  }
  showDay();

  function showDay() {
    const date = sel.value, meta = L.days.find(d => d.date === date);
    document.getElementById("elo-seismo").innerHTML = `<p class="note">${S.loading}</p>`;
    loadDay(date).then(day => {
      if (!day.speeches.some(sp => sp.uid === state.eloSpeech)) state.eloSpeech = meta.busiest;
      const newDay = !state.eloDay || state.eloDay.date !== day.date;
      state.eloDay = day;
      state.eloGeom = (state.eloView === "classic" ? drawSeismographClassic : drawSeismograph)(day, meta, S);
      drawTranscript(day, S);
      drawDayTable(day, S);
      // Switching the view keeps the music going; a new day starts a new piece.
      if (newDay) state.sound.dayChanged();
    });
  }
}

function pickSpeech(day, uid, S, scroll) {
  state.eloSpeech = uid;
  const url = new URL(location.href);
  url.searchParams.set("day", day.date); url.searchParams.set("speech", uid);
  history.replaceState(null, "", url);
  d3.selectAll("#elo-seismo .band").style("stroke", d => d.uid === uid ? "var(--text-primary)" : "var(--surface-1)")
    .style("stroke-width", d => d.uid === uid ? 2 : 0.5);
  drawTranscript(day, S);
  state.sound.speechChanged();
  if (scroll) document.getElementById("elo-speech-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function drawSeismograph(day, meta, S) {
  const host = document.getElementById("elo-seismo");
  const W = Math.max(320, host.clientWidth || 1100);
  const narrow = W < 700;
  const labelW = narrow ? 112 : 168, rightW = 34;
  const laneH = narrow ? 24 : 28, gap = 5, stripH = 24, groupH = 16, axisH = 34;
  const LANES = DATA.living.params.lanes;            // [{id, side}], top to bottom
  const above = LANES.filter(l => l.side === "own"), below = LANES.filter(l => l.side === "other");
  const end = meta.end_s;
  const x = d3.scaleLinear().domain([0, end]).range([labelW, W - rightW]);
  // Two-minute bins, coarser on a narrow screen so a bin is never under 4px wide.
  const BIN = Math.max(120, Math.ceil(end / ((W - labelW - rightW) / 4) / 60) * 60);
  const nBins = Math.ceil(end / BIN);
  const grid = Object.fromEntries(LANES.map(l => [l.id, d3.range(nBins).map(i => ({ i, t0: i * BIN, hits: [] }))]));
  day.speeches.forEach(sp => sp.reactions.forEach(r => (r.lanes || []).forEach(lane => {
    grid[lane][Math.min(nBins - 1, Math.floor(r.t / BIN))].hits.push({ r, sp });
  })));

  // Vertical layout: group label, own lanes, the speeches, other lanes, axis.
  let y = groupH;
  const laneY = {};
  above.forEach(l => { laneY[l.id] = y; y += laneH + gap; });
  const stripY = y; y += stripH + gap + groupH;
  below.forEach(l => { laneY[l.id] = y; y += laneH + gap; });
  const H = y + axisH;
  const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
    .attr("role", "img").attr("aria-label", `${S.dayTitle}: ${huDate(day.date)}`);

  const hours = d3.range(3600, end, 3600);
  svg.append("g").selectAll("line").data(hours).join("line")
    .attr("x1", x).attr("x2", x).attr("y1", groupH).attr("y2", H - axisH)
    .style("stroke", "var(--grid)");
  const group = (text, yy) => svg.append("text").attr("x", 0).attr("y", yy - 4)
    .style("font-size", "10.5px").style("letter-spacing", ".07em").style("text-transform", "uppercase")
    .style("fill", "var(--text-muted)").text(text);
  group(S.ownGroup, groupH);
  group(S.otherGroup, stripY + stripH + gap + groupH);

  const strongest = hits => hits.slice().sort((a, b) => d3.descending(a.r.w, b.r.w))[0];
  const bw = Math.max(1, x(BIN) - x(0) - 1);   // 1px surface gap between bins
  LANES.forEach(l => {
    const bins = grid[l.id], peak = d3.max(bins, b => b.hits.length) || 0;
    const top = laneY[l.id], ink = l.side === "own" ? "var(--flow-own)" : "var(--flow-other)";
    const h = d3.scaleLinear().domain([0, Math.max(1, peak)]).range([0, laneH - 3]);
    svg.append("line").attr("x1", labelW).attr("x2", W - rightW).attr("y1", top + laneH).attr("y2", top + laneH)
      .style("stroke", "var(--border)");
    svg.append("text").attr("x", labelW - 8).attr("y", top + laneH / 2).attr("dy", "0.35em")
      .attr("text-anchor", "end").style("font-size", narrow ? "10.5px" : "12px")
      .style("fill", "var(--text-secondary)").text(S.lanes[l.id]);
    svg.append("text").attr("x", W - rightW + 4).attr("y", top + 8).style("font-size", "9.5px")
      .style("fill", "var(--text-muted)").text(peak ? `max ${peak}` : "—");
    const live = bins.filter(b => b.hits.length);
    svg.append("g").selectAll("rect").data(live).join("rect")
      .attr("x", b => x(b.t0) + 0.5).attr("width", bw)
      .attr("y", b => top + laneH - h(b.hits.length)).attr("height", b => h(b.hits.length))
      .attr("rx", 1).style("fill", ink).style("pointer-events", "none");
    // Hit targets as wide as the bin and as tall as the lane.
    svg.append("g").attr("class", "hit").selectAll("rect").data(live).join("rect")
      .attr("x", b => x(b.t0)).attr("width", Math.max(1, x(BIN) - x(0))).attr("y", top).attr("height", laneH)
      .style("fill", "transparent")
      .on("mousemove", (event, b) => {
        const best = strongest(b.hits);
        const what = best.r.who ? `${esc(best.r.who)}: ${esc(best.r.quote || "")}` : esc(best.r.span);
        showTip(`<strong>${esc(S.lanes[l.id])}</strong> · ${S.binTip(clock(b.t0), clock(b.t0 + BIN))}<br>` +
          `${b.hits.length} ${S.reactionsWord}<br><span style="color:var(--text-muted)">${esc(best.sp.speaker)}:</span> ${what}`, event);
      })
      .on("mouseleave", hideTip);
  });

  // Speeches as bands, in the speaker's faction colour; a click opens the text.
  const count = (sp, f) => sp.reactions.filter(r => r.flow === f).length;
  svg.append("g").selectAll("rect").data(day.speeches).join("rect").attr("class", "band")
    .attr("x", sp => x(sp.t0)).attr("width", sp => Math.max(1.5, x(sp.t0 + sp.dur) - x(sp.t0)))
    .attr("y", stripY).attr("height", stripH)
    .style("fill", sp => sp.faction ? factionColour(sp.faction) : "var(--neutral)")
    .style("stroke", sp => sp.uid === state.eloSpeech ? "var(--text-primary)" : "var(--surface-1)")
    .style("stroke-width", sp => sp.uid === state.eloSpeech ? 2 : 0.5).style("cursor", "pointer")
    .on("mousemove", (event, sp) => showTip(
      `<strong>${esc(sp.speaker)}</strong> (${esc(sp.faction || S.noFaction)})<br>${esc(sp.type)}<br>` +
      `${clock(sp.t0)} · ${fmt(sp.dur / 60, 0)} perc<br>${S.ownN(count(sp, "own"))} · ${S.otherN(count(sp, "other"))}`, event))
    .on("mouseleave", hideTip)
    .on("click", (event, sp) => pickSpeech(day, sp.uid, S, true));
  svg.append("text").attr("x", labelW - 8).attr("y", stripY + stripH / 2).attr("dy", "0.35em")
    .attr("text-anchor", "end").style("font-size", narrow ? "10.5px" : "12px").style("font-weight", 600)
    .style("fill", "var(--text-primary)").text(S.speechesLane);
  // Closing applause: a faint tick at the end of the speech it followed.
  const closings = day.speeches.filter(sp => sp.reactions.some(r => r.closing));
  svg.append("g").selectAll("line").data(closings).join("line")
    .attr("x1", sp => x(sp.t0 + sp.dur)).attr("x2", sp => x(sp.t0 + sp.dur))
    .attr("y1", stripY - 4).attr("y2", stripY).style("stroke", "var(--text-muted)").style("stroke-width", 1)
    .style("pointer-events", "none");

  const axis = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - axisH + 2})`)
    .call(d3.axisBottom(x).tickValues(hours).tickFormat(t => S.hour(t / 3600)).tickSize(4));
  axis.select(".domain").remove();
  svg.append("text").attr("x", labelW).attr("y", H - 2).style("font-size", "10.5px")
    .style("fill", "var(--text-muted)").text(S.axis);

  document.getElementById("elo-note").textContent = S.note(BIN / 60);
  const factions = [...new Set(day.speeches.map(sp => sp.faction).filter(Boolean))];
  document.getElementById("elo-legend").innerHTML =
    `<span><i class="swatch" style="background:var(--flow-own)"></i>${S.own}</span>` +
    `<span><i class="swatch" style="background:var(--flow-other)"></i>${S.other}</span>` +
    factions.map(f => `<span><i class="swatch" style="background:${factionColour(f)}"></i>${esc(f)}</span>`).join("") +
    `<span style="color:var(--text-muted)">${S.closing} · ${S.scales}</span>`;
  return { svg, x, top: groupH, bottom: H - axisH };
}

function drawSeismographClassic(day, meta, S) {
  const host = document.getElementById("elo-seismo");
  const W = Math.max(320, host.clientWidth || 1100);
  const m = { l: 12, r: 12 }, upH = 92, stripH = 26, downH = 92, axisH = 34;
  const H = upH + stripH + downH + axisH;
  const end = meta.end_s;
  const x = d3.scaleLinear().domain([0, end]).range([m.l, W - m.r]);
  // Two-minute bins, coarser on a narrow screen so that a bin is never under
  // 4px wide (whole minutes, so the note can say how long a bar is).
  const BIN = Math.max(120, Math.ceil(end / ((W - m.l - m.r) / 4) / 60) * 60);
  const bins = d3.range(0, Math.ceil(end / BIN)).map(i => ({ i, t0: i * BIN, own: [], other: [] }));
  day.speeches.forEach(sp => sp.reactions.forEach(r => {
    if (r.flow === "own" || r.flow === "other") bins[Math.min(bins.length - 1, Math.floor(r.t / BIN))][r.flow].push({ r, sp });
  }));
  const peak = d3.max(bins, b => Math.max(b.own.length, b.other.length)) || 1;
  const yUp = d3.scaleLinear().domain([0, peak]).range([0, upH - 6]);
  const yDown = d3.scaleLinear().domain([0, peak]).range([0, downH - 6]);
  const stripY = upH;
  const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
    .attr("role", "img").attr("aria-label", `${S.dayTitle}: ${huDate(day.date)}`);

  // Hour grid.
  const hours = d3.range(3600, end, 3600);
  svg.append("g").selectAll("line").data(hours).join("line")
    .attr("x1", x).attr("x2", x).attr("y1", 4).attr("y2", upH + stripH + downH)
    .style("stroke", "var(--grid)");
  const bw = Math.max(1, x(BIN) - x(0) - 1);   // 1px surface gap between adjacent bins
  const strongest = list => list.slice().sort((a, b) => d3.descending(a.r.w, b.r.w))[0];
  const binTip = b => {
    const parts = [`<strong>${S.binTip(clock(b.t0), clock(b.t0 + BIN))}</strong>`,
      S.ownN(b.own.length), S.otherN(b.other.length)];
    const top = strongest(b.other) || strongest(b.own);
    if (top) parts.push(`<span style="color:var(--text-muted)">${esc(top.sp.speaker)}:</span> ${esc(top.r.who ? top.r.who + ": " + (top.r.quote || "") : top.r.span)}`);
    return parts.join("<br>");
  };
  svg.append("g").selectAll("rect").data(bins.filter(b => b.own.length)).join("rect")
    .attr("x", b => x(b.t0) + 0.5).attr("width", bw)
    .attr("y", b => stripY - 2 - yUp(b.own.length)).attr("height", b => yUp(b.own.length))
    .attr("rx", 1).style("fill", "var(--flow-own)")
    .on("mousemove", (event, b) => showTip(binTip(b), event)).on("mouseleave", hideTip);
  svg.append("g").selectAll("rect").data(bins.filter(b => b.other.length)).join("rect")
    .attr("x", b => x(b.t0) + 0.5).attr("width", bw)
    .attr("y", stripY + stripH + 2).attr("height", b => yDown(b.other.length))
    .attr("rx", 1).style("fill", "var(--flow-other)")
    .on("mousemove", (event, b) => showTip(binTip(b), event)).on("mouseleave", hideTip);

  // Hit targets: each bin with any reaction gets an invisible target as wide as
  // the bin over its whole half, so a thin bar is still easy to hover.
  const hitW = x(BIN) - x(0);
  const live = bins.filter(b => b.own.length || b.other.length);
  [[4, upH - 6], [stripY + stripH + 2, downH - 2]].forEach(([y0, h]) => {
    svg.append("g").attr("class", "hit").selectAll("rect").data(live).join("rect")
      .attr("x", b => x(b.t0 + BIN / 2) - hitW / 2).attr("width", hitW)
      .attr("y", y0).attr("height", h).style("fill", "transparent")
      .on("mousemove", (event, b) => showTip(binTip(b), event)).on("mouseleave", hideTip);
  });

  // Speeches as bands, in the speaker's faction colour; a click opens the text.
  const count = (sp, f) => sp.reactions.filter(r => r.flow === f).length;
  svg.append("g").selectAll("rect").data(day.speeches).join("rect").attr("class", "band")
    .attr("x", sp => x(sp.t0)).attr("width", sp => Math.max(1.5, x(sp.t0 + sp.dur) - x(sp.t0)))
    .attr("y", stripY).attr("height", stripH)
    .style("fill", sp => sp.faction ? factionColour(sp.faction) : "var(--neutral)")
    .style("stroke", sp => sp.uid === state.eloSpeech ? "var(--text-primary)" : "var(--surface-1)")
    .style("stroke-width", sp => sp.uid === state.eloSpeech ? 2 : 0.5).style("cursor", "pointer")
    .on("mousemove", (event, sp) => showTip(
      `<strong>${esc(sp.speaker)}</strong> (${esc(sp.faction || S.noFaction)})<br>${esc(sp.type)}<br>` +
      `${clock(sp.t0)} · ${fmt(sp.dur / 60, 0)} perc<br>${S.ownN(count(sp, "own"))} · ${S.otherN(count(sp, "other"))}`, event))
    .on("mouseleave", hideTip)
    .on("click", (event, sp) => pickSpeech(day, sp.uid, S, true));
  // Closing applause: a faint tick at the end of the speech it followed.
  const closings = day.speeches.filter(sp => sp.reactions.some(r => r.closing));
  svg.append("g").selectAll("line").data(closings).join("line")
    .attr("x1", sp => x(sp.t0 + sp.dur)).attr("x2", sp => x(sp.t0 + sp.dur))
    .attr("y1", stripY - 5).attr("y2", stripY).style("stroke", "var(--text-muted)").style("stroke-width", 1)
    .style("pointer-events", "none");

  const axis = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${upH + stripH + downH + 2})`)
    .call(d3.axisBottom(x).tickValues(hours).tickFormat(t => S.hour(t / 3600)).tickSize(4));
  axis.select(".domain").remove();
  svg.append("text").attr("x", m.l).attr("y", H - 2).style("font-size", "10.5px")
    .style("fill", "var(--text-muted)").text(S.axis);

  document.getElementById("elo-note").textContent = S.note(BIN / 60);
  const factions = [...new Set(day.speeches.map(sp => sp.faction).filter(Boolean))];
  document.getElementById("elo-legend").innerHTML =
    `<span><i class="swatch" style="background:var(--flow-own)"></i>${S.own}</span>` +
    `<span><i class="swatch" style="background:var(--flow-other)"></i>${S.other}</span>` +
    factions.map(f => `<span><i class="swatch" style="background:${factionColour(f)}"></i>${esc(f)}</span>`).join("") +
    `<span style="color:var(--text-muted)">${S.closing}</span>`;
  return { svg, x, top: 4, bottom: upH + stripH + downH };
}

function drawTranscript(day, S) {
  const sp = day.speeches.find(x => x.uid === state.eloSpeech) || day.speeches[0];
  const own = sp.reactions.filter(r => r.flow === "own").length, other = sp.reactions.filter(r => r.flow === "other").length;
  document.getElementById("elo-speech-head").innerHTML =
    S.head(esc(sp.speaker), esc(sp.faction || S.noFaction), esc(sp.type), esc(sp.agenda)) +
    `<br><span class="note" style="margin:0">${S.meta(clock(sp.t0), fmt(sp.dur / 60, 0), own, other)}</span>`;
  const bySentence = d3.group(sp.reactions, r => r.s);
  // The export leaves some directions inside sentences; mute the ones that are
  // this speech's recorded reactions, so they don't read as the speaker's words.
  const spans = new Set(sp.reactions.map(r => esc(r.span.trim())));
  const muteDirections = html => html.replace(/\(([^()]*)\)/g, (whole, inner) =>
    spans.has(inner.trim()) ? `<span class="inline-dir">${whole}</span>` : whole);
  const note = r => {
    const cls = (r.flow === "own" ? "own" : r.flow === "other" ? "other" : "") +
      (r.hostile && r.hostile.length ? " hostile" : "");
    const body = r.who && r.quote
      ? `${glyph(r.kinds)} <span class="who">${esc(r.who)}:</span> <span class="bubble">${esc(r.quote)}</span>`
      : `${glyph(r.kinds)} ${esc(r.span)}`;
    const tag = r.hostile && r.hostile.length
      ? ` <span class="hostile-tag" title="${S.hostileTitle(r.hostile.join(", "))}">${S.hostileTag}</span>` : "";
    return `<div class="rnote ${cls}" title="(${esc(r.span)})">${body}${tag}</div>`;
  };
  const rows = [
    `<div class="bench-h side gov">${S.gov}</div><div class="bench-h">${S.speech}</div><div class="bench-h side">${S.opp}</div>`
  ];
  sp.sentences.forEach((sentence, i) => {
    const rs = bySentence.get(i) || [];
    // Mark where a heckle cut the sentence: each cut is a verbatim prefix.
    const cuts = [...new Set(rs.filter(r => r.cut).map(r => r.cut.length))].sort((a, b) => a - b);
    let text = "", at = 0;
    cuts.forEach(n => { text += esc(sentence.slice(at, n)) + `<span class="cut" title="${S.cutTitle}">⟋</span>`; at = n; });
    text += esc(sentence.slice(at));
    text = muteDirections(text);
    const gov = rs.filter(r => r.bench === "government").map(note).join("");
    const opp = rs.filter(r => r.bench === "opposition").map(note).join("");
    const mid = rs.filter(r => r.bench !== "government" && r.bench !== "opposition")
      .map(r => note(r).replace('class="rnote', 'class="rnote center')).join("");
    rows.push(`<div class="gov">${gov}</div><div><div class="say${rs.length ? " reacted" : ""}">${text}</div>${mid}</div><div class="opp">${opp}</div>`);
  });
  document.getElementById("elo-transcript").innerHTML = rows.join("");
}

function drawDayTable(day, S) {
  const count = (sp, f) => sp.reactions.filter(r => r.flow === f).length;
  const table = d3.select("#elo-table").html("");
  table.append("thead").append("tr").selectAll("th").data(S.tableHead).join("th").text(d => d).style("cursor", "default");
  table.append("tbody").selectAll("tr").data(day.speeches).join("tr").style("cursor", "pointer")
    .html(sp => `<td class="num">${clock(sp.t0)}</td><td>${esc(sp.speaker)}</td><td>${esc(sp.faction || S.noFaction)}</td>` +
      `<td>${esc(sp.type)}</td><td class="num">${count(sp, "own")}</td><td class="num">${count(sp, "other")}</td>`)
    .on("click", (event, sp) => pickSpeech(day, sp.uid, S, true));
}
