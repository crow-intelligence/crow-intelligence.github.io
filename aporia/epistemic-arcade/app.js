/* ---------------------------------------------------------------------------
 * The Epistemic Arcade — frontend (vanilla ES2020+, no build step).
 *
 * Loads telemetry_{alpha,beta}.json, drives the six-step scrollytelling
 * narrative (intro → demo → 10k → 250k → 1M → chart), animates Tetris
 * replays in an autonomous ~15fps loop, ghosts is_epistemic_action frames,
 * applies a "CRT-reboot" fade between checkpoint swaps, and renders the
 * final Chart.js line chart comparing the agents' epistemic rates.
 *
 * The web/ folder is self-contained: serve it with web/ as the document root
 * and the relative data/*.json fetches resolve correctly. See web/README.md.
 * --------------------------------------------------------------------------- */

const TELEMETRY_URLS = {
  alpha: "data/telemetry_alpha.json",
  beta: "data/telemetry_beta.json",
};

const COLORS = {
  pageBg: "#111111",
  canvasBg: "#000000",
  textMain: "#e0e0e0",
  textDim: "#8a8a8a",
  green: "#39ff14",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  yellow: "#ffff00",
  blue: "#0000ff",
};

const PIECE_COLOR = {
  I: COLORS.cyan,
  O: COLORS.yellow,
  T: COLORS.magenta,
  S: COLORS.green,
  Z: "#ff5555",
  J: COLORS.blue,
  L: "#ff9900",
};

const FPS_DEFAULT = 15;
const CRT_FADE_MS = 400;
const CRT_HOLD_MS = 220;
const GHOST_QUEUE_LEN = 2;
const GHOST_ALPHA = 0.3;
const CELL_PX = 20;
const BOARD_ROWS = 20;
const BOARD_COLS = 10;

const T_ORIENTATIONS = [
  // Each orientation is a list of (row, col) offsets, normalised to top-left
  [[0, 1], [1, 0], [1, 1], [1, 2]], // pointing up
  [[0, 0], [1, 0], [1, 1], [2, 0]], // pointing right
  [[0, 0], [0, 1], [0, 2], [1, 1]], // pointing down
  [[0, 1], [1, 0], [1, 1], [2, 1]], // pointing left
];

/* ---------------------------------------------------------------------------
 * Module state
 * --------------------------------------------------------------------------- */

const state = {
  telemetry: { alpha: null, beta: null },
  // currentGame[agent] = { frames, epoch, decodedCache }
  currentGame: { alpha: null, beta: null },
  frameIdx: { alpha: 0, beta: 0 },
  ghostQueue: { alpha: [], beta: [] },
  prevDecoded: { alpha: null, beta: null },
  activeStep: null, // 1..6 or null
  currentEpoch: null, // tracks the loaded epoch so we only CRT-reboot on swap
  transitionToken: 0, // bumped on each setStep; lets stale awaits bail out
  lastTickMs: 0,
  fps: FPS_DEFAULT,
  chart: null,
  // Step 1 synthetic state
  tBlockOrientation: 0,
  tBlockLastChangeMs: 0,
};

/* ---------------------------------------------------------------------------
 * Decode the 200-char string into a 20x10 int grid (per spec §3).
 * Cached per game-frame string so the render loop is O(1) after first decode.
 * --------------------------------------------------------------------------- */

const decoderCache = new Map();

function decodeBoard(boardString) {
  const cached = decoderCache.get(boardString);
  if (cached) return cached;
  const grid = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowString = boardString.substring(row * BOARD_COLS, (row + 1) * BOARD_COLS);
    grid.push(rowString.split("").map(Number));
  }
  decoderCache.set(boardString, grid);
  return grid;
}

/* ---------------------------------------------------------------------------
 * Canvas rendering
 * --------------------------------------------------------------------------- */

function setupCanvas(canvas) {
  // The board is drawn in fixed board-pixel units (BOARD_COLS*CELL_PX wide);
  // the canvas may be displayed at any size (responsive on mobile). Contain-fit
  // the 1:2 board into the space one of the two side-by-side cells gets inside
  // the .agent-pair flex row — constrained by BOTH width and height so it never
  // overflows the CRT frame. Then scale the context so the fixed board-pixel
  // drawing code fills the (possibly downscaled) canvas exactly.
  const dpr = window.devicePixelRatio || 1;
  const boardW = BOARD_COLS * CELL_PX;
  const boardH = BOARD_ROWS * CELL_PX;

  let availW = boardW;
  let availH = boardH;
  const pair = canvas.closest(".agent-pair");
  if (pair && pair.clientWidth > 0 && pair.clientHeight > 0) {
    const cs = getComputedStyle(pair);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const gap = parseFloat(cs.columnGap) || 0;
    availW = (pair.clientWidth - padX - gap) / 2;
    // Reserve room under the canvas for the agent's figcaption label.
    const caption = canvas.parentElement.querySelector("figcaption");
    const capH = caption ? caption.offsetHeight + 10 : 0;
    availH = pair.clientHeight - padY - capH;
  }

  const scale = Math.min(availW / boardW, availH / boardH);
  const cssW = Math.max(1, Math.round(boardW * scale));
  const cssH = Math.max(1, Math.round(boardH * scale));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0); // clear any prior scale before re-fitting
  ctx.scale(canvas.width / boardW, canvas.height / boardH);
  return ctx;
}

function clearBoard(ctx) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, BOARD_COLS * CELL_PX, BOARD_ROWS * CELL_PX);
  ctx.restore();
}

function drawCell(ctx, r, c, color, glow = true) {
  if (glow) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = color;
  const pad = 1;
  ctx.fillRect(c * CELL_PX + pad, r * CELL_PX + pad, CELL_PX - 2 * pad, CELL_PX - 2 * pad);
}

function drawDecodedBoard(ctx, decoded, color) {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (decoded[r][c]) drawCell(ctx, r, c, color);
    }
  }
}

function drawGhosts(ctx, queue) {
  if (!queue.length) return;
  ctx.save();
  ctx.globalAlpha = GHOST_ALPHA;
  for (const ghost of queue) {
    // ghost.cells is a list of [r, c] tuples plus a color
    ctx.shadowBlur = 8;
    ctx.shadowColor = ghost.color;
    ctx.fillStyle = ghost.color;
    for (const [r, c] of ghost.cells) {
      const pad = 1;
      ctx.fillRect(c * CELL_PX + pad, r * CELL_PX + pad, CELL_PX - 2 * pad, CELL_PX - 2 * pad);
    }
  }
  ctx.restore();
}

function diffCells(curr, prev) {
  // Cells that changed (in either direction) between two boards.
  if (!prev) return [];
  const out = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if ((curr[r][c] | 0) !== (prev[r][c] | 0)) out.push([r, c]);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Step 1 synthetic: a single T-block rotating
 * --------------------------------------------------------------------------- */

function drawSpinningT(ctx, orientation) {
  clearBoard(ctx);
  const offsets = T_ORIENTATIONS[orientation % T_ORIENTATIONS.length];
  // Centre the piece's 3x3 bbox roughly in the 10x20 board.
  const anchorR = Math.floor(BOARD_ROWS / 2) - 2;
  const anchorC = Math.floor(BOARD_COLS / 2) - 2;
  for (const [dr, dc] of offsets) {
    drawCell(ctx, anchorR + dr, anchorC + dc, COLORS.magenta);
  }
}

/* ---------------------------------------------------------------------------
 * Step 2 synthetic: a static "completed" board snapshot + INSERT COIN overlay
 * --------------------------------------------------------------------------- */

function drawCompletedBoard(ctx, agent) {
  // Use the final frame of the highest-reward sample at epoch 1_000_000 as a
  // representative "completed" board: it's full of locked stack.
  const samples = state.telemetry[agent]?.sample_games?.filter(
    (g) => g.metadata.epoch === 1_000_000,
  );
  const game = samples?.[0];
  if (!game || !game.game_frames.length) {
    clearBoard(ctx);
    return;
  }
  const frame = game.game_frames[game.game_frames.length - 1];
  const decoded = decodeBoard(frame.board_state);
  clearBoard(ctx);
  drawDecodedBoard(ctx, decoded, COLORS.green);
}

/* ---------------------------------------------------------------------------
 * Live Tetris playback for one agent
 * --------------------------------------------------------------------------- */

function loadGameForEpoch(agent, epoch) {
  const telemetry = state.telemetry[agent];
  if (!telemetry) return;
  const samples = telemetry.sample_games.filter((g) => g.metadata.epoch === epoch);
  if (!samples.length) {
    console.warn(`No sample games for ${agent} epoch ${epoch}`);
    state.currentGame[agent] = null;
    return;
  }
  // Already sorted descending by reward; first match is the top sample.
  const game = samples[0];
  state.currentGame[agent] = {
    epoch,
    frames: game.game_frames,
    metadata: game.metadata,
  };
  state.frameIdx[agent] = 0;
  state.ghostQueue[agent] = [];
  state.prevDecoded[agent] = null;
}

function tickAgent(ctx, agent, advance, withGhosting) {
  const game = state.currentGame[agent];
  if (!game) {
    clearBoard(ctx);
    return;
  }
  const frames = game.frames;
  if (advance) {
    state.frameIdx[agent] = (state.frameIdx[agent] + 1) % frames.length;
  }
  const frame = frames[state.frameIdx[agent]];
  const decoded = decodeBoard(frame.board_state);
  const pieceColor = PIECE_COLOR[frame.current_piece] || COLORS.green;

  // Decay existing ghosts: drop any that have already shown the max number of
  // frames. A simple FIFO with cap GHOST_QUEUE_LEN means we just pop the oldest
  // when we push a new one below.
  const ghosts = state.ghostQueue[agent];

  clearBoard(ctx);
  // Render ghosts under the live frame, then draw the board over them.
  if (withGhosting) drawGhosts(ctx, ghosts);
  drawDecodedBoard(ctx, decoded, pieceColor);

  // Manage ghost queue
  if (advance) {
    // Age ghosts: each entry has a `framesLeft` counter
    state.ghostQueue[agent] = ghosts
      .map((g) => ({ ...g, framesLeft: g.framesLeft - 1 }))
      .filter((g) => g.framesLeft > 0);

    if (withGhosting && frame.is_epistemic_action) {
      const changed = diffCells(decoded, state.prevDecoded[agent]);
      if (changed.length) {
        // Push the cells that just changed as a ghost; show them for the next
        // GHOST_QUEUE_LEN frames.
        state.ghostQueue[agent].push({
          cells: changed,
          color: COLORS.cyan,
          framesLeft: GHOST_QUEUE_LEN,
        });
      }
    }
    state.prevDecoded[agent] = decoded;
  }
}

/* ---------------------------------------------------------------------------
 * The animation loop. requestAnimationFrame at the browser's native rate;
 * we advance the per-agent frame index only every (1000/fps) ms.
 * --------------------------------------------------------------------------- */

let ctxAlpha;
let ctxBeta;
let canvasAlpha;
let canvasBeta;

function tick(nowMs) {
  const step = state.activeStep;

  if (step === 1) {
    // Single T-block rotating; one rotation per 800ms.
    const elapsed = nowMs - state.tBlockLastChangeMs;
    if (elapsed >= 800) {
      state.tBlockOrientation = (state.tBlockOrientation + 1) % 4;
      state.tBlockLastChangeMs = nowMs;
    }
    drawSpinningT(ctxAlpha, state.tBlockOrientation);
    clearBoard(ctxBeta);
  } else if (step === 2) {
    // Static completed board on Alpha; Beta blank (INSERT COIN overlay handled in CSS).
    drawCompletedBoard(ctxAlpha, "alpha");
    clearBoard(ctxBeta);
  } else if (step === 3 || step === 4 || step === 5) {
    // Autonomous playback loop: rAF drives the wall clock, frame index advances
    // every 1000/fps ms independent of scroll position. Index wraps at the end
    // so the games loop seamlessly while the reader stays on the section.
    const advance = nowMs - state.lastTickMs >= 1000 / state.fps;
    const withGhosting = step === 4 || step === 5;
    tickAgent(ctxAlpha, "alpha", advance, withGhosting);
    tickAgent(ctxBeta, "beta", advance, withGhosting);
    if (advance) state.lastTickMs = nowMs;
  } else if (step === 6) {
    // Chart is visible; canvases hidden via CSS.
    clearBoard(ctxAlpha);
    clearBoard(ctxBeta);
  }

  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------------------
 * Step controller: IntersectionObserver swaps the visual state per step.
 * --------------------------------------------------------------------------- */

const EPOCH_BY_STEP = { 3: 10_000, 4: 250_000, 5: 1_000_000 };
const EPOCH_LABEL = {
  10_000: "epoch 10 000",
  250_000: "epoch 250 000",
  1_000_000: "epoch 1 000 000",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setStep(n) {
  if (state.activeStep === n) return;
  state.activeStep = n;
  const token = ++state.transitionToken;

  const agentPair = document.querySelector(".agent-pair");
  const chartWrap = document.querySelector(".chart-wrap");
  const insertCoin = document.querySelector(".insert-coin");
  const epochLabel = document.getElementById("epoch-label");

  if (n === 1) {
    chartWrap.classList.remove("visible");
    agentPair.classList.remove("hidden", "fading");
    insertCoin.classList.remove("visible");
    epochLabel.textContent = "intro";
    canvasBeta.style.opacity = "0";
    canvasAlpha.style.opacity = "1";
    state.currentEpoch = null;
    return;
  }
  if (n === 2) {
    chartWrap.classList.remove("visible");
    agentPair.classList.remove("hidden", "fading");
    insertCoin.classList.add("visible");
    epochLabel.textContent = "demo";
    canvasBeta.style.opacity = "0";
    canvasAlpha.style.opacity = "1";
    state.currentEpoch = null;
    return;
  }
  if (n === 6) {
    insertCoin.classList.remove("visible");
    agentPair.classList.remove("fading");
    agentPair.classList.add("hidden");
    chartWrap.classList.add("visible");
    epochLabel.textContent = "1 M timesteps";
    ensureChart();
    state.currentEpoch = null;
    return;
  }

  // Steps 3, 4, 5: epoch playback with CRT-reboot transition.
  await crtReboot(EPOCH_BY_STEP[n], token);
}

async function crtReboot(epoch, token) {
  const agentPair = document.querySelector(".agent-pair");
  const chartWrap = document.querySelector(".chart-wrap");
  const insertCoin = document.querySelector(".insert-coin");
  const epochLabel = document.getElementById("epoch-label");
  const loadingCheckpoint = document.querySelector(".loading-checkpoint");

  // Already showing this epoch (re-entering the same playback step) — just
  // normalise the chrome and skip the fade so the boards never blink.
  if (state.currentEpoch === epoch) {
    insertCoin.classList.remove("visible");
    chartWrap.classList.remove("visible");
    agentPair.classList.remove("hidden", "fading");
    loadingCheckpoint.classList.remove("visible");
    canvasAlpha.style.opacity = "1";
    canvasBeta.style.opacity = "1";
    return;
  }

  // Reset chrome so the agent pair is the live surface again.
  insertCoin.classList.remove("visible");
  chartWrap.classList.remove("visible");
  agentPair.classList.remove("hidden");
  canvasAlpha.style.opacity = "1";
  canvasBeta.style.opacity = "1";

  // 1. Fade the canvas wrapper to opacity 0 over CRT_FADE_MS; show LOADING text.
  agentPair.classList.add("fading");
  loadingCheckpoint.classList.add("visible");
  epochLabel.textContent = EPOCH_LABEL[epoch];

  // 2. Wait for the fade-out to complete.
  await sleep(CRT_FADE_MS);
  if (token !== state.transitionToken) return;

  // 3. Swap the active dataset, clear canvases, reset frame index + tick clock.
  loadGameForEpoch("alpha", epoch);
  loadGameForEpoch("beta", epoch);
  clearBoard(ctxAlpha);
  clearBoard(ctxBeta);
  state.currentEpoch = epoch;
  state.lastTickMs = performance.now();

  // Hold LOADING briefly so the diegetic reboot reads.
  await sleep(CRT_HOLD_MS);
  if (token !== state.transitionToken) return;

  // 4. Fade canvas back in.
  loadingCheckpoint.classList.remove("visible");
  agentPair.classList.remove("fading");
}

const STEP_SWITCH_MARGIN = 0.1;
const stepRatios = new Map();

function initObserver() {
  const sections = document.querySelectorAll(".step");
  sections.forEach((s) => stepRatios.set(Number(s.dataset.step), 0));

  const observer = new IntersectionObserver(
    (entries) => {
      // Keep a live intersection ratio for every step, not just the ones in
      // this callback batch — so the winner is a global decision.
      for (const e of entries) {
        const n = Number(e.target.dataset.step);
        stepRatios.set(n, e.isIntersecting ? e.intersectionRatio : 0);
      }
      // The active step is whichever dominates the viewport's centre band.
      let winner = null;
      let winnerRatio = 0;
      for (const [n, r] of stepRatios) {
        if (r > winnerRatio) {
          winner = n;
          winnerRatio = r;
        }
      }
      if (winner == null || winner === state.activeStep) return;
      // Hysteresis: switch only once the winner clearly leads the current
      // step, or once the current step has left the band entirely. This stops
      // the epoch transition flapping when scrolling near a section boundary.
      const currentRatio = stepRatios.get(state.activeStep) || 0;
      if (winnerRatio - currentRatio > STEP_SWITCH_MARGIN || currentRatio === 0) {
        setStep(winner);
      }
    },
    {
      // Observe only the middle 30% of the viewport: the active step is the
      // one occupying the centre, which is unambiguous and stable.
      rootMargin: "-35% 0px -35% 0px",
      threshold: Array.from({ length: 21 }, (_, i) => i / 20),
    },
  );
  sections.forEach((s) => observer.observe(s));
}

/* ---------------------------------------------------------------------------
 * Chart (Step 6)
 * --------------------------------------------------------------------------- */

function computeEpistemicRateByEpoch(telemetry) {
  const epochs = [10_000, 250_000, 1_000_000];
  return epochs.map((epoch) => {
    const games = telemetry.sample_games.filter((g) => g.metadata.epoch === epoch);
    const allFrames = games.flatMap((g) => g.game_frames);
    if (!allFrames.length) return 0;
    const eps = allFrames.filter((f) => f.is_epistemic_action).length;
    return (eps / allFrames.length) * 100;
  });
}

function ensureChart() {
  if (state.chart || typeof Chart === "undefined") return;
  const ctx = document.getElementById("chart").getContext("2d");
  const alphaRates = computeEpistemicRateByEpoch(state.telemetry.alpha);
  const betaRates = computeEpistemicRateByEpoch(state.telemetry.beta);

  Chart.defaults.font.family = "'IBM Plex Mono', monospace";
  Chart.defaults.color = COLORS.textMain;

  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["10 K", "250 K", "1 M"],
      datasets: [
        {
          label: "α  Internalist",
          data: alphaRates,
          borderColor: COLORS.textDim,
          backgroundColor: "rgba(138,138,138,0.15)",
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 4,
        },
        {
          label: "β  Extended Mind",
          data: betaRates,
          borderColor: COLORS.green,
          backgroundColor: "rgba(57,255,20,0.15)",
          borderWidth: 3,
          tension: 0.2,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend: {
          labels: { color: COLORS.textMain, font: { family: "VT323", size: 16 } },
        },
        title: {
          display: true,
          text: "epistemic actions  (% of sample frames)",
          color: COLORS.green,
          font: { family: "VT323", size: 22 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "training timesteps", color: COLORS.textDim },
          grid: { color: "#222" },
          ticks: { color: COLORS.textMain },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 25,
          title: { display: true, text: "%", color: COLORS.textDim },
          grid: { color: "#222" },
          ticks: { color: COLORS.textMain },
        },
      },
    },
  });
}

/* ---------------------------------------------------------------------------
 * Boot
 * --------------------------------------------------------------------------- */

async function loadTelemetry() {
  const [alphaRes, betaRes] = await Promise.all([
    fetch(TELEMETRY_URLS.alpha),
    fetch(TELEMETRY_URLS.beta),
  ]);
  if (!alphaRes.ok || !betaRes.ok) {
    throw new Error(`Failed to fetch telemetry (alpha: ${alphaRes.status}, beta: ${betaRes.status})`);
  }
  const [alpha, beta] = await Promise.all([alphaRes.json(), betaRes.json()]);
  state.telemetry.alpha = alpha;
  state.telemetry.beta = beta;
  console.info("telemetry loaded", {
    alpha_samples: alpha.sample_games.length,
    beta_samples: beta.sample_games.length,
    epochs: Object.keys(alpha.aggregate_metrics),
  });
}

function reveal() {
  document.getElementById("loading").classList.add("hidden");
  document.querySelector(".layout").hidden = false;
}

// Re-fit the canvases to their laid-out size on viewport/orientation change.
// rAF-debounced; reassigns the contexts the tick() loop reads.
let resizeRaf = 0;
function handleResize() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    ctxAlpha = setupCanvas(canvasAlpha);
    ctxBeta = setupCanvas(canvasBeta);
  });
}

async function boot() {
  canvasAlpha = document.getElementById("canvas-alpha");
  canvasBeta = document.getElementById("canvas-beta");
  ctxAlpha = setupCanvas(canvasAlpha);
  ctxBeta = setupCanvas(canvasBeta);

  try {
    await loadTelemetry();
  } catch (err) {
    document.getElementById("loading").textContent =
      "Telemetry failed to load. Serve from the project root (see web/README.md).";
    console.error(err);
    return;
  }
  reveal();
  initObserver();
  // Default to step 1 until the observer fires.
  setStep(1);
  state.lastTickMs = performance.now();
  state.tBlockLastChangeMs = performance.now();
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);
  // Re-fit now that .layout is visible and the canvases have a real width.
  handleResize();
  requestAnimationFrame(tick);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
