/* Sonification of the "Élő parlament" tab: a sitting day, or one speech, as music.
 *
 * The base layer is the virtue vocabulary (one note per mention, a pitch per
 * virtue: high and bright when affirming, two octaves lower and dark when
 * accusing) over a drone that holds a chord per BERTopic topic. The room's
 * reactions play on top as instruments, panned to the benches they came from
 * (government left, opposition right, unknown in the middle).
 *
 * Every mapping here is an artistic choice, not a measurement: the pitches, the
 * chords, the instruments and the default length are listed in
 * CHANGES_SUMMARY.md (Task 16). The times are the same even-pace estimates the
 * seismograph uses.
 *
 * Tone.js is loaded only when the reader first presses play, so the page
 * stays light. `buildEvents` is pure (no Tone, no DOM) and is tested under node.
 */

const TONE_SRC = "./vendor/tone.min.js";

/** Layers in the order the mapping table lists them. */
export const LAYERS = [
  "virtue_affirming", "virtue_accusing", "drone",
  "applause", "laugh_with", "support",
  "heckle", "heckle_hostile", "laugh_at", "noise",
  "bell", "closing", "pulse"
];

/** Muted until the reader turns them on: the courtesy applause after almost
 * every speech would drown the day, and the sentence pulse is a metronome. */
export const DEFAULT_OFF = new Set(["closing", "pulse"]);

/** A pitch class per virtue: together they make the white-key scale without B,
 * so any two notes sit consonantly over the drone. */
export const VIRTUE_PITCH = {
  prudence: "D", justice: "F", courage: "A",
  temperance: "C", truthfulness: "E", magnanimity: "G"
};
const OCTAVE = { affirming: 5, accusing: 3 };

/** Eight drone chords in the same scale; a topic gets `CHORDS[id % 8]`, so
 * topics 0 and 8 share a chord. No topic, no drone. */
export const CHORDS = [
  ["D2", "A2", "F3"], ["F2", "C3", "A3"], ["C2", "G2", "E3"], ["A1", "E2", "C3"],
  ["G2", "D3", "B3"], ["E2", "B2", "G3"], ["D2", "A2", "E3"], ["F2", "C3", "E3", "A3"]
];

/** In day mode a topic change shorter than this many seconds of music keeps
 * the previous chord, so the drone doesn't stutter through short speeches. */
export const MIN_DRONE_S = 0.6;

const PAN = { government: -0.6, opposition: 0.6 };

/** Which sound layers one reaction plays on.
 *
 * The seismograph's lanes, plus three that it leaves out: the courtesy
 * applause at a speech's end (`closing`), the chair's bell, and applause whose
 * bench is unknown (it has no lane, but applause sounds the same either way).
 *
 * @example
 * reactionLayers({ kinds: ["applause"], lanes: [], closing: true })  // ["closing"]
 * reactionLayers({ kinds: ["heckling", "noise"], lanes: ["heckle", "noise"], closing: false })
 * // ["heckle", "noise"]
 */
export function reactionLayers(r) {
  if (r.closing) return ["closing"];
  const out = [...(r.lanes || [])];
  if (r.kinds.includes("bell")) out.push("bell");
  if (!out.length && r.kinds.includes("applause")) out.push("applause");
  return out;
}

/** The piece as a sorted list of timed events; pure, so it is testable.
 *
 * Day mode (`mode: "day"`) squeezes the sitting into `seconds` of music: an
 * event at sitting time t plays at t × seconds / end. Speech mode plays one
 * sentence per `beat` seconds: virtue notes on the beat, reactions half a beat
 * later. Events carry `time` (seconds of music) and `layer`; the two
 * underscore layers drive the display and make no sound.
 *
 * Demands: `day.speeches` with `t0`, `dur`, `topic`, `virtues`
 * (`[sentence, virtue, pole, t]`) and `reactions`; for speech mode, `speech`.
 * Guarantees: every time is in [0, total]; events are sorted by time.
 */
export function buildEvents(mode, day, speech, { seconds = 180, beat = 0.4, end } = {}) {
  const ev = [];
  const reaction = (r, time, unit) => reactionLayers(r).forEach(layer => ev.push({
    time, layer, pan: PAN[r.bench] ?? 0, w: r.w,
    dur: layer === "applause" ? unit * 0.9 * r.w : layer === "noise" ? unit * 1.3 * r.w : undefined
  }));
  const virtue = ([s, key, pole], time) => ev.push({
    time, layer: `virtue_${pole}`, virtue: key, s,
    note: `${VIRTUE_PITCH[key]}${OCTAVE[pole]}`
  });
  let total;
  if (mode === "day") {
    const last = end ?? Math.max(...day.speeches.map(sp => sp.t0 + sp.dur));
    const k = seconds / last;
    total = seconds;
    const speeches = day.speeches.slice().sort((a, b) => a.t0 - b.t0);
    speeches.forEach(sp => {
      ev.push({ time: sp.t0 * k, layer: "_speech", uid: sp.uid });
      sp.virtues.forEach(m => virtue(m, Math.min(total, m[3] * k)));
      sp.reactions.forEach(r => reaction(r, Math.min(total, r.t * k), 0.35));
    });
    // Drone segments: consecutive speeches on the same topic share one chord,
    // held through the gaps between them; a topic too brief to hear is merged
    // into the chord before it.
    const segs = [];
    speeches.forEach(sp => {
      const id = sp.topic ? sp.topic.id : null, at = sp.t0 * k;
      const cur = segs[segs.length - 1];
      if (cur && cur.id === id) return;
      if (cur) cur.end = at;
      segs.push({ id, start: at, end: total, name: sp.topic ? sp.topic.name : null });
    });
    const merged = [];
    segs.forEach(seg => {
      const prev = merged[merged.length - 1];
      if (prev && (seg.end - seg.start < MIN_DRONE_S || seg.id === prev.id)) prev.end = seg.end;
      else merged.push(seg);
    });
    merged.filter(seg => seg.id !== null).forEach(seg => ev.push({
      time: seg.start, layer: "drone", dur: seg.end - seg.start,
      chord: CHORDS[seg.id % CHORDS.length], topic: seg.id
    }));
  } else {
    const n = speech.sentences.length;
    total = n * beat + 1.5;
    if (speech.topic) ev.push({
      time: 0, layer: "drone", dur: n * beat + 0.5,
      chord: CHORDS[speech.topic.id % CHORDS.length], topic: speech.topic.id
    });
    for (let i = 0; i < n; i++) {
      ev.push({ time: i * beat, layer: "_sentence", s: i });
      ev.push({ time: i * beat, layer: "pulse", s: i });
    }
    speech.virtues.forEach(m => virtue(m, m[0] * beat));
    speech.reactions.forEach(r => reaction(r, (r.s + 0.5) * beat, beat));
  }
  ev.sort((a, b) => a.time - b.time);
  return { events: ev, total };
}

/** Event counts per sound layer (the underscore layers are left out). */
export function layerCounts(events) {
  const out = Object.fromEntries(LAYERS.map(l => [l, 0]));
  events.forEach(e => { if (e.layer in out) out[e.layer] += 1; });
  return out;
}

/* ------------------------------------------------------------------ audio */

let tonePromise = null;
function loadTone() {
  if (window.Tone) return Promise.resolve(window.Tone);
  tonePromise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TONE_SRC;
    s.onload = () => resolve(window.Tone);
    s.onerror = () => { tonePromise = null; reject(new Error("Tone.js did not load")); };
    document.head.appendChild(s);
  });
  return tonePromise;
}

/* Channel levels in dB, balanced by measured peaks in an offline render (not
 * by ear): the virtue melody on top, the reactions under it, the drone low. */
const VOLUME_DB = {
  virtue_affirming: -9, virtue_accusing: -8, drone: -22,
  applause: -8, laugh_with: -19, support: -8,
  heckle: -12, heckle_hostile: -13, laugh_at: -11, noise: -3,
  bell: -24, closing: -26, pulse: -20
};

/** The instruments, each into its own channel, all through one reverb. */
function makeRig(Tone, out) {
  const reverb = new Tone.Reverb({ decay: 2.6, wet: 0.22 }).connect(out);
  const ch = Object.fromEntries(LAYERS.map(l => [l, new Tone.Channel({ volume: VOLUME_DB[l] }).connect(reverb)]));
  const lowpass = (f, layer) => new Tone.Filter(f, "lowpass").connect(ch[layer]);
  const inst = {
    pluck: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.003, decay: 0.25, sustain: 0.08, release: 0.9 }
    }).connect(ch.virtue_affirming),
    dark: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 28 },
      envelope: { attack: 0.03, decay: 0.5, sustain: 0.25, release: 1.2 }
    }).connect(lowpass(700, "virtue_accusing")),
    pad: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fattriangle", count: 3, spread: 18 },
      envelope: { attack: 1.2, decay: 0.5, sustain: 0.8, release: 2.5 }
    }).connect(lowpass(1200, "drone")),
    applause: new Tone.NoiseSynth({
      noise: { type: "pink" }, envelope: { attack: 0.06, decay: 0.2, sustain: 0.7, release: 0.5 }
    }).connect(new Tone.Filter({ type: "bandpass", frequency: 2500, Q: 0.6 }).connect(ch.applause)),
    xylo: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.15 }
    }).connect(ch.laugh_with),
    wood: new Tone.MembraneSynth({
      pitchDecay: 0.008, octaves: 2, envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.05 }
    }).connect(ch.support),
    snare: new Tone.NoiseSynth({
      noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.03 }
    }).connect(new Tone.Filter(1800, "highpass").connect(ch.heckle)),
    brass: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" }, envelope: { attack: 0.025, decay: 0.25, sustain: 0.35, release: 0.35 }
    }).connect(lowpass(1100, "heckle_hostile")),
    glide: new Tone.Synth({
      oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.2 }
    }).connect(lowpass(1500, "laugh_at")),
    rumble: new Tone.NoiseSynth({
      noise: { type: "brown" }, envelope: { attack: 0.35, decay: 0.3, sustain: 0.8, release: 0.9 }
    }).connect(lowpass(380, "noise")),
    bell: new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1.4, release: 0.3 },
      harmonicity: 5.1, modulationIndex: 16, resonance: 3200, octaves: 1.5
    }).connect(ch.bell),
    cymbal: new Tone.MetalSynth({
      envelope: { attack: 0.02, decay: 1.8, release: 0.6 },
      harmonicity: 8, modulationIndex: 40, resonance: 6000, octaves: 1
    }).connect(ch.closing),
    tick: new Tone.MembraneSynth({
      pitchDecay: 0.01, octaves: 1.5, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 }
    }).connect(ch.pulse)
  };
  // A monophonic instrument refuses two notes at the same instant; nudge the
  // second one by 5 ms.
  const last = {};
  const at = (name, time) => (last[name] = Math.max(time, (last[name] ?? -1) + 0.005));
  const fire = (e, time) => {
    const i = inst;
    if (e.pan !== undefined) ch[e.layer].pan.setValueAtTime(e.pan, time);
    switch (e.layer) {
      case "virtue_affirming": i.pluck.triggerAttackRelease(e.note, 0.35, time, 0.8); break;
      case "virtue_accusing": i.dark.triggerAttackRelease(e.note, 0.6, time, 0.8); break;
      case "drone": i.pad.triggerAttackRelease(e.chord, Math.max(0.3, e.dur), time, 0.5); break;
      case "applause": i.applause.triggerAttackRelease(e.dur, at("applause", time), Math.min(1, 0.5 + 0.15 * e.w)); break;
      case "laugh_with": ["C6", "E6", "G6", "A6"].forEach((n, k) => i.xylo.triggerAttackRelease(n, 0.08, time + k * 0.045, 0.7)); break;
      case "support": i.wood.triggerAttackRelease("E5", 0.05, at("wood", time), 0.9); break;
      case "heckle": i.snare.triggerAttackRelease(0.06, at("snare", time), 0.9); break;
      case "heckle_hostile": i.brass.triggerAttackRelease(["E2", "F2"], 0.32, time, 0.8); break;
      case "laugh_at": {
        const t = at("glide", time);
        i.glide.triggerAttackRelease(440, 0.42, t, 0.7);
        i.glide.frequency.exponentialRampToValueAtTime(196, t + 0.4);
        break;
      }
      case "noise": i.rumble.triggerAttackRelease(e.dur, at("rumble", time), 0.9); break;
      case "bell": i.bell.triggerAttackRelease(260, 0.3, at("bell", time), 0.5); break;
      case "closing": i.cymbal.triggerAttackRelease(400, 0.5, at("cymbal", time), 0.3); break;
      case "pulse": i.tick.triggerAttackRelease("C2", 0.05, at("tick", time), 0.5); break;
    }
  };
  const silence = time => {
    ["pluck", "dark", "pad", "xylo", "brass"].forEach(n => inst[n].releaseAll(time));
    ["applause", "snare", "rumble", "glide"].forEach(n => inst[n].triggerRelease(time));
  };
  const nodes = [reverb, ...Object.values(ch), ...Object.values(inst)];
  return { ready: reverb.ready, fire, silence, dispose: () => nodes.forEach(n => n.dispose()) };
}

/* ----------------------------------------------------------------- player */

/** Wire up the player and the mapping table; returns the hooks app.js calls.
 *
 * `ctx` supplies the strings (`S`, from `T.sound`), the current day, its
 * metadata, the selected speech and the seismograph's geometry
 * (`{svg, x, top, bottom}`), plus `virtueName(key)`.
 */
export function setupSound(ctx) {
  const S = ctx.S;
  const $ = id => document.getElementById(id);
  const opts = { mode: "day", seconds: 180, bpm: 150, volume: -6 };
  const enabled = Object.fromEntries(LAYERS.map(l => [l, !DEFAULT_OFF.has(l)]));
  let solo = null;
  let piece = { events: [], total: 0 };
  let Tone = null, rig = null, master = null, armed = false, playing = false, frame = null;
  const played = Object.fromEntries(LAYERS.map(l => [l, 0]));
  const audible = layer => (solo ? solo === layer : enabled[layer]);

  ["sound-title", "sound-lede", "sound-note", "mode-label", "length-label", "volume-label"]
    .forEach(k => { $(`elo-${k}`).textContent = S[k.replace(/-(.)/g, (_, c) => c.toUpperCase())]; });
  const playBtn = $("elo-play");
  const modeSw = $("elo-mode");
  Object.entries(S.modes).forEach(([id, label]) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.setAttribute("role", "radio"); btn.textContent = label;
    btn.dataset.mode = id;
    btn.onclick = () => { opts.mode = id; refresh(); };
    modeSw.appendChild(btn);
  });
  const length = $("elo-length"), volume = $("elo-volume");
  length.oninput = () => {
    if (opts.mode === "day") opts.seconds = +length.value * 60; else opts.bpm = +length.value;
    refresh({ keepPlace: true });
  };
  volume.min = -30; volume.max = 0; volume.step = 1; volume.value = opts.volume;
  volume.oninput = () => { opts.volume = +volume.value; if (master) master.volume.rampTo(opts.volume, 0.05); };
  playBtn.onclick = () => (playing ? pause() : play().catch(err => {
    $("elo-now").textContent = S.failed; console.error(err);
  }));

  const describe = what => (typeof what === "function" ? what(ctx.virtueName) : what);
  function drawMapping(counts) {
    const rows = LAYERS.filter(l => opts.mode === "speech" || l !== "pulse").map(l => {
      const on = enabled[l], soloed = solo === l;
      return `<tr><td><input type="checkbox" data-layer="${l}" aria-label="${S.onLabel(S.layers[l])}"${on ? " checked" : ""}></td>` +
        `<td>${S.layers[l]}</td><td>${describe(S.instruments[l])}</td>` +
        `<td class="num">${counts[l].toLocaleString("hu-HU")}</td>` +
        `<td><button type="button" class="solo" data-layer="${l}" aria-pressed="${soloed}">${S.solo}</button></td></tr>`;
    });
    const table = $("elo-mapping");
    table.innerHTML = `<thead><tr>${S.mappingHead.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody>`;
    table.querySelectorAll("input[data-layer]").forEach(box => {
      box.onchange = () => { enabled[box.dataset.layer] = box.checked; };
    });
    table.querySelectorAll("button.solo").forEach(btn => {
      btn.onclick = () => {
        solo = solo === btn.dataset.layer ? null : btn.dataset.layer;
        table.querySelectorAll("button.solo").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.layer === solo)));
      };
    });
  }

  /** Rebuild the piece for the current day, speech, mode and length. */
  function refresh({ keepPlace = false } = {}) {
    const day = ctx.getDay(), meta = ctx.getMeta(), speech = ctx.getSpeech();
    if (!day) return;
    const transport = Tone && Tone.getTransport();
    const place = keepPlace && transport && piece.total ? transport.seconds / piece.total : 0;
    const wasPlaying = playing && keepPlace;
    stop();
    LAYERS.forEach(l => { played[l] = 0; });
    piece = buildEvents(opts.mode, day, speech, {
      seconds: opts.seconds, beat: 60 / opts.bpm, end: meta && meta.end_s
    });
    modeSw.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.mode === opts.mode)));
    if (opts.mode === "day") {
      Object.assign(length, { min: 1, max: 8, step: 1, value: opts.seconds / 60 });
      $("elo-length-out").textContent = S.minutes(opts.seconds / 60);
      $("elo-length-label").textContent = S.lengthLabel;
    } else {
      Object.assign(length, { min: 60, max: 300, step: 10, value: opts.bpm });
      $("elo-length-out").textContent = S.bpm(opts.bpm, Math.round(piece.total));
      $("elo-length-label").textContent = S.tempoLabel;
    }
    $("elo-now").textContent = opts.mode === "day" ? S.dayPiece(Math.round(piece.total / 60))
      : S.speechPiece(speech.speaker, speech.topic ? speech.topic.name : null);
    drawMapping(layerCounts(piece.events));
    if (wasPlaying) play(place * piece.total);
  }

  async function play(from = null) {
    if (!Tone) {
      $("elo-now").textContent = S.loading;
      Tone = await loadTone();
    }
    await Tone.start();
    if (!rig) {
      master = new Tone.Volume(opts.volume).toDestination();
      const limiter = new Tone.Limiter(-3).connect(master);
      rig = makeRig(Tone, limiter);
      await rig.ready;
    }
    const transport = Tone.getTransport();
    if (!armed) {
      transport.cancel(0);
      piece.events.forEach(e => transport.schedule(time => trigger(e, time), e.time));
      armed = true;
    }
    if (from !== null) transport.seconds = from;
    const offset = transport.seconds;
    transport.start();
    // A chord that started before the resume point would stay silent: restart it.
    const held = piece.events.find(e => e.layer === "drone" && e.time < offset - 0.01 && e.time + e.dur > offset);
    if (held && audible("drone")) rig.fire({ ...held, dur: held.time + held.dur - offset }, Tone.now() + 0.05);
    playing = true;
    playBtn.textContent = "⏸"; playBtn.setAttribute("aria-label", S.pause); playBtn.setAttribute("aria-pressed", "true");
    animate();
  }

  function trigger(e, time) {
    if (e.layer === "_speech") {
      Tone.getDraw().schedule(() => nowSpeaking(e.uid), time);
      return;
    }
    if (e.layer === "_sentence") {
      Tone.getDraw().schedule(() => highlight(e.s), time);
      return;
    }
    if (!audible(e.layer)) return;
    played[e.layer] += 1;
    rig.fire(e, time);
  }

  function pause() {
    if (!Tone) return;
    Tone.getTransport().pause();
    rig.silence(Tone.now());
    playing = false;
    playBtn.textContent = "▶"; playBtn.setAttribute("aria-label", S.play); playBtn.setAttribute("aria-pressed", "false");
    cancelAnimationFrame(frame);
  }

  function stop() {
    if (Tone) {
      const transport = Tone.getTransport();
      transport.stop(); transport.cancel(0); transport.seconds = 0;
      if (rig) rig.silence(Tone.now());
    }
    armed = false; playing = false;
    playBtn.textContent = "▶"; playBtn.setAttribute("aria-label", S.play); playBtn.setAttribute("aria-pressed", "false");
    cancelAnimationFrame(frame);
    highlight(null);
    const g = ctx.getGeom();
    if (g) g.svg.selectAll(".playhead").remove();
  }

  function animate() {
    const pos = Tone.getTransport().seconds;
    if (pos >= piece.total) { stop(); return; }
    const g = ctx.getGeom(), meta = ctx.getMeta();
    if (opts.mode === "day" && g && meta) {
      let line = g.svg.select(".playhead");
      if (line.empty()) {
        line = g.svg.append("line").attr("class", "playhead").attr("y1", g.top - 6).attr("y2", g.bottom)
          .style("stroke", "var(--text-primary)").style("stroke-width", 1.5).style("pointer-events", "none");
      }
      const xx = g.x(pos / piece.total * meta.end_s);
      line.attr("x1", xx).attr("x2", xx);
    }
    frame = requestAnimationFrame(animate);
  }

  function nowSpeaking(uid) {
    const sp = ctx.getDay().speeches.find(x => x.uid === uid);
    if (sp) $("elo-now").textContent = S.now(sp.speaker, sp.faction, sp.topic ? sp.topic.name : null);
  }

  let lit = null;
  function highlight(i) {
    if (lit) lit.classList.remove("playing");
    lit = i === null ? null : document.querySelectorAll("#elo-transcript .say")[i] || null;
    if (!lit) return;
    lit.classList.add("playing");
    const sp = ctx.getSpeech();
    $("elo-now").textContent = S.sentenceAt(i + 1, sp.sentences.length, sp.speaker);
    const box = lit.getBoundingClientRect();
    if (box.top < 120 || box.bottom > window.innerHeight - 40) lit.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /** Render the first `seconds` of the piece offline and return its RMS and
   * peak, for the tests: "it makes sound" is measured, not assumed. With
   * `only`, just that layer plays (muted or not); `from` starts the window
   * later in the piece. */
  async function offlineRms(seconds = 15, only = null, from = 0) {
    const T = await loadTone();
    const evs = piece.events.filter(e => e.time >= from && e.time < from + seconds && !e.layer.startsWith("_"))
      .map(e => ({ ...e, time: e.time - from }));
    const buffer = await T.Offline(async ({ transport }) => {
      const limiter = new T.Limiter(-3).toDestination();
      const offRig = makeRig(T, limiter);
      await offRig.ready;
      evs.filter(e => (only ? e.layer === only : audible(e.layer)))
        .forEach(e => transport.schedule(time => offRig.fire(e, time), e.time));
      transport.start(0);
    }, seconds);
    const data = buffer.getChannelData(0);
    let sum = 0, peak = 0;
    for (let k = 0; k < data.length; k++) { sum += data[k] * data[k]; peak = Math.max(peak, Math.abs(data[k])); }
    return { rms: Math.sqrt(sum / data.length), peak, events: evs.filter(e => !only || e.layer === only).length };
  }

  window.__sonification = {
    get mode() { return opts.mode; },
    get playing() { return playing; },
    get total() { return piece.total; },
    get position() { return Tone ? Tone.getTransport().seconds : 0; },
    get scheduled() { return layerCounts(piece.events); },
    get events() { return piece.events; },
    played,
    enabled,
    offlineRms
  };

  return {
    /** A new day was loaded: rebuild the piece (stops playback). */
    dayChanged: () => refresh(),
    /** A speech was picked: only the speech piece depends on it. */
    speechChanged: () => { if (opts.mode === "speech") refresh(); },
    stop
  };
}
