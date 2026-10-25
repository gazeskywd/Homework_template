/*
 * Ostraca — a memo pile for films  (p5.js + matter.js)
 *
 * Record:  after a film, break a vessel. Each piece holds one thing you'll remember.
 * Leave:   the pieces fall onto a pile. Newest land on top.
 * Store:   Decade / Director slides the stones over into neat columns, like type into
 *          a type case. Strata slides them back to where they lay in the pile.
 * Wear:    the deeper and older a fragment is, the more dirt covers it.
 * Unearth: pick up the brush and rub a buried fragment until the writing shows again.
 * Recall:  tap a fragment. The film's pieces fly back into their vessel, then it breaks
 *          open into fragments laid side by side. The one under your finger grows.
 * Edit:    rewrite a fragment in place.
 * Delete:  rub in circles over a fragment to grind it. Cracks spread with each turn;
 *          after about three turns it shatters and sinks into the pile as sand.
 *          Let go halfway and the cracks slowly close again.
 */

const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Sleeping = Matter.Sleeping;

let engine; // 엔진 객체

/* ---------- Look ---------- */
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'; // for the text boxes
const CANVAS_FONT = "Helvetica"; // p5 quotes names with spaces, so one family name is safest
const BG = "#E6E6E1";
const INK = "#141414";
const MUTE = "#63635E";
const ACCENT = "#8A3FD8";
const PAPER = "#F3F3EF";
const SOIL = "#B9B2A4";
const SOIL_DARK = "#7B7365";
const STROKE = 1.5;
const PALETTE = [
  "#8A3FD8",
  "#FF6B1A",
  "#7D7A1C",
  "#FF5CB0",
  "#3AA6DD",
  "#E5262A",
  "#EDE03A",
  "#4B2723",
  "#2D5BA8",
  "#5CC8B0",
  "#F2CFC0",
  "#A79AF2",
];

/* ---------- Rules ---------- */
const DAY = 864e5;
const WEAR_DAYS = 330; // time alone: left this long, a fragment is mostly buried
const DEPTH_WEAR = 0.045; // each film piled on top adds this much dirt
const BRUSH_PX = 480; // finger travel needed to brush a fully buried fragment clean
const MAX_PIECES = 8;
const STORE_KEY = "ostraca.p5.v3";

const VTYPES = ["plate", "jar", "bowl", "tile"];
const PROMPTS = [
  {
    kind: "What stays",
    q: "Six months from now, what will you still remember?",
  },
  { kind: "A scene", q: "A scene you can still see." },
  { kind: "A line", q: "Something someone said, in your own words." },
  { kind: "A colour", q: "A colour, a light, a texture." },
  { kind: "A feeling", q: "How it left you feeling." },
  { kind: "A sound", q: "A sound or a piece of music." },
  { kind: "A detail", q: "A small detail you noticed." },
  { kind: "A fragment", q: "Anything else worth keeping." },
];

/* ---------- Demo pile, so the app opens already full ---------- */
const SEED = [
  {
    t: "Past Lives",
    d: "Celine Song",
    y: 2023,
    w: "2026-10-18",
    l: 1,
    m: [
      [
        0,
        "Two people on a street corner at dawn, saying nothing and everything.",
      ],
      [1, "The taxi pulling away. His face in the window."],
      [4, "Like meeting someone I almost was."],
    ],
  },
  {
    t: "Perfect Days",
    d: "Wim Wenders",
    y: 2023,
    w: "2026-09-27",
    l: 1,
    m: [
      [0, "His face at the wheel at the end, laughing and crying at once."],
      [3, "Leaf shadows on everything."],
      [5, "A cassette every morning on the drive."],
      [1, "Photographing the same tree every lunch."],
    ],
  },
  {
    t: "Drive My Car",
    d: "Ryusuke Hamaguchi",
    y: 2021,
    w: "2026-08-10",
    l: 2,
    m: [
      [0, "Two hands holding cigarettes up through the sunroof."],
      [3, "A red car on grey roads."],
      [1, "Rehearsing lines along with a tape in the car."],
    ],
  },
  {
    t: "Aftersun",
    d: "Charlotte Wells",
    y: 2022,
    w: "2026-06-02",
    l: 1,
    m: [
      [0, "The dance under strobe lights, cutting in and out."],
      [4, "I only understood it on the bus home."],
      [3, "Turquoise pool, faded like a camcorder tape."],
    ],
  },
  {
    t: "Evil Does Not Exist",
    d: "Ryusuke Hamaguchi",
    y: 2023,
    w: "2026-03-14",
    l: 2,
    m: [
      [0, "Spring water carried down the hill in tanks."],
      [4, "The ending. I still don't know."],
    ],
  },
  {
    t: "Decision to Leave",
    d: "Park Chan-wook",
    y: 2022,
    w: "2025-12-20",
    l: 1,
    m: [
      [3, "A dress that was blue and green at the same time."],
      [0, "The tide coming in over the hole on the beach."],
      [2, "He said he was finished. He wasn't."],
    ],
  },
  {
    t: "In the Mood for Love",
    d: "Wong Kar-wai",
    y: 2000,
    w: "2025-09-07",
    l: 1,
    m: [
      [3, "Red curtains in a narrow corridor."],
      [1, "Walking to the noodle stall in slow motion."],
      [0, "Whispering a secret into a hole in a wall."],
      [5, "The same waltz every time they pass."],
    ],
  },
  {
    t: "Burning",
    d: "Lee Chang-dong",
    y: 2018,
    w: "2025-06-21",
    l: 2,
    m: [
      [1, "She dances alone at dusk against the sky."],
      [6, "Greenhouses nobody would miss."],
      [4, "Uneasy for days."],
    ],
  },
  {
    t: "Chungking Express",
    d: "Wong Kar-wai",
    y: 1994,
    w: "2025-03-02",
    l: 1,
    m: [
      [6, "Tins of pineapple, all with the same expiry date."],
      [5, "One song on repeat, loud."],
      [0, "She tidies his flat while he's out."],
    ],
  },
  {
    t: "Paterson",
    d: "Jim Jarmusch",
    y: 2016,
    w: "2024-11-16",
    l: 2,
    m: [
      [0, "A poem about a box of matches."],
      [6, "A blank notebook, given as a gift."],
    ],
  },
  {
    t: "Moonlight",
    d: "Barry Jenkins",
    y: 2016,
    w: "2024-07-04",
    l: 1,
    m: [
      [1, "Learning to float, a hand under his head in the sea."],
      [3, "Skin that looks blue in the moonlight."],
      [4, "Tender."],
    ],
  },
  {
    t: "Poetry",
    d: "Lee Chang-dong",
    y: 2010,
    w: "2024-03-09",
    l: 2,
    m: [
      [0, "She finally writes a poem and isn't there to read it."],
      [3, "Apricots fallen on the path."],
    ],
  },
  {
    t: "Columbus",
    d: "Kogonada",
    y: 2017,
    w: "2024-01-13",
    l: 1,
    m: [
      [1, "Two people framed by buildings, always a little apart."],
      [3, "Concrete, glass, late-afternoon light."],
    ],
  },
  {
    t: "The Green Ray",
    d: "Éric Rohmer",
    y: 1986,
    w: "2025-08-03",
    c: "#3E9B5A",
    l: 1,
    m: [
      [0, "The very last second of the sunset turns green, and she cries out."],
      [6, "Green playing cards lying face down on the street."],
      [1, "Crying alone on a rock while everyone else is on holiday."],
      [4, "Lonely, then suddenly hopeful."],
    ],
  },
  {
    t: "Dead Ringers",
    d: "David Cronenberg",
    y: 1988,
    w: "2024-10-19",
    c: "#A3192E",
    l: 2,
    m: [
      [3, "Surgeons in blood-red gowns, like a ceremony."],
      [6, "Strange metal instruments laid out on a cloth."],
      [0, "Two of them, and I kept losing track of which one was which."],
    ],
  },
  // watched today
  {
    t: "Farewell My Concubine",
    d: "Chen Kaige",
    y: 1993,
    w: "2026-10-25T13:00:00",
    c: "#E5262A",
    l: 1,
    m: [
      [
        0,
        "The sword at the very end, on an empty stage. Fifty years in one gesture.",
      ],
      [
        1,
        "A boy made to repeat one line until he finally says it the way they want.",
      ],
      [3, "White face paint, red smudged around the eyes."],
      [4, "Couldn't say anything for a while after."],
    ],
  },
  {
    t: "Ghost in the Shell",
    d: "Mamoru Oshii",
    y: 1995,
    w: "2026-10-25T17:00:00",
    c: "#2D5BA8",
    l: 2,
    m: [
      [0, "The long, wordless ride through the city in the rain."],
      [5, "That chanting choir rising over the canals."],
      [6, "Mannequins in shop windows, looking back at her."],
    ],
  },
  {
    t: "Eureka",
    d: "Shinji Aoyama",
    y: 2000,
    w: "2026-10-25T21:00:00",
    c: "#EDE03A",
    l: 1,
    m: [
      [0, "Right at the end, the colour comes back. I actually gasped."],
      [3, "Almost four hours in faded sepia."],
      [
        1,
        "The old bus rolling along with the three of them, going nowhere in particular.",
      ],
      [4, "Quiet, like the morning after a long cry."],
    ],
  },
];

/* ---------- State ---------- */
let films = [];
let view = "pile"; // 'pile' | 'recall' | 'make'
let mode = "strata"; // 'strata' | 'decade' | 'director'
let brushOn = false;
let S = 1; // overall size scale for the screen
let stones = new Map(); // shard id -> { sid, fid, body, local, w, h, gfx, gfxKey, disp, anim, home }
let sandBodies = [];
let walls = [];
let bins = []; // column labels and dividers while sorted
let pourQueue = [];
let particles = [];
let chunks = []; // pieces of a fragment that was just ground down
const GRIND_TURNS = 3; // full circles needed to grind a fragment away
let buttons = [];
let toastMsg = "",
  toastUntil = 0;
let resetArmedUntil = 0;
let nextPeek = 0;
let headerH = 76;
let settlingUntil = 0; // after sliding back into the pile, physics resumes at this time
let scrollX = 0,
  maxScroll = 0; // sideways scroll through the columns
const camX = () => (mode === "strata" ? 0 : scrollX);
// vertical camera for the pile: 0 shows the floor; negative values look up the pile.
// It follows the top of the pile (the newest films) until you scroll yourself.
let scrollY = 0,
  followTop = true,
  pileTopSm = null;
// columns get their own vertical scroll when a column grows taller than the screen
let binY = 0,
  binMin = 0,
  binFollow = true;
const camY = () => (mode === "strata" ? scrollY : binY);
const ptr = {
  x: -999,
  y: -999,
  down: false,
  sx: 0,
  sy: 0,
  moved: 0,
  lastX: 0,
  lastY: 0,
  downBtn: null,
  seen: false,
  type: "mouse",
};

let rc = null; // recall state
let mk = null; // make state
let inTitle, inDir, inYear, taWrite, taEdit;

/* ======================================================================
   p5
   ====================================================================== */
function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.elt.style.touchAction = "none";
  cnv.elt.style.display = "block";
  document.body.style.backgroundColor = BG;
  rectMode(CORNER);
  textFont(CANVAS_FONT);

  // Matter setting
  engine = Engine.create();
  engine.enableSleeping = true; // settled stones stop costing anything
  engine.positionIterations = 10;
  engine.velocityIterations = 8;

  films = loadData() || seed();
  makeFields();
  computeScale();
  buildWalls();
  pourIn();

  cnv.elt.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  cnv.elt.addEventListener("contextmenu", (e) => e.preventDefault());
}

function draw() {
  buttons = [];
  if (view === "pile") {
    stepPhysics();
    drawPile();
  } else if (view === "recall") {
    drawRecall();
  } else if (view === "make") {
    drawMake();
  }
  drawToast();
  if (brushOn && view === "pile" && ptr.seen) drawBrush(ptr.x, ptr.y);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeScale();
  buildWalls();
  if (mode !== "strata") arrangeBins(false);
}

function mouseWheel(e) {
  if (view === "pile" && mode === "strata" && camTop() < 0) {
    scrollY = constrain(scrollY + e.deltaY, camTop(), 0);
    followTop = false;
    return false;
  }
  if (view === "pile" && mode !== "strata" && (maxScroll > 0 || binMin < 0)) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY))
      scrollX = constrain(scrollX + e.deltaX, 0, maxScroll);
    else if (binMin < 0) {
      binY = constrain(binY + e.deltaY, binMin, 0);
      binFollow = false;
    } else scrollX = constrain(scrollX + e.deltaY, 0, maxScroll);
    return false;
  }
}

function keyPressed() {
  if (keyCode === ESCAPE) {
    if (view === "recall") closeRecall();
    else if (view === "make") closeMake();
    else if (brushOn) setBrush(false);
  }
}

/* ======================================================================
   Data  (named saveData/loadData: p5 already has its own save(), which downloads the canvas)
   ====================================================================== */
function loadData() {
  try {
    const s = localStorage.getItem(STORE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}
function saveData() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(films));
  } catch (e) {
    /* keep working in memory */
  }
}
function seed() {
  return SEED.map(filmFromSpec);
}

function filmFromSpec(spec, idx) {
  const r = rng(spec.t);
  const vtype = VTYPES[idx % VTYPES.length];
  const n = spec.m.length + spec.l;
  const pieces = [vesselShape(vtype)];
  let guard = 0;
  while (pieces.length < n && guard++ < 300) {
    pieces.sort((a, b) => area(b) - area(a));
    const c = centroid(pieces[0]);
    crack(pieces, [c[0] + (r() - 0.5) * 40, c[1] + (r() - 0.5) * 40], r);
  }
  pieces.sort((a, b) => area(b) - area(a));
  const watched = Date.parse(
    spec.w.includes("T") ? spec.w : spec.w + "T21:00:00",
  );
  const id = "f" + hash(spec.t).toString(36);
  return {
    id,
    title: spec.t,
    director: spec.d,
    year: spec.y,
    watched,
    color: spec.c || PALETTE[idx % PALETTE.length],
    vtype,
    sand: 0,
    shards: spec.m.map(([k, text], i) => ({
      id: id + "s" + i,
      text,
      kind: PROMPTS[k].kind,
      vpoly: roundP(pieces[i]),
      seen: watched,
      brush: 0,
    })),
    lost: pieces.slice(spec.m.length).map(roundP),
  };
}

const byNewest = () =>
  films.filter((f) => f.shards.length).sort((a, b) => b.watched - a.watched);
const byOldest = () => byNewest().reverse();
function findShard(sid) {
  for (const f of films) {
    const s = f.shards.find((x) => x.id === sid);
    if (s) return [f, s];
  }
  return [null, null];
}

function depthWear(f) {
  const i = byNewest().indexOf(f);
  return Math.min(0.55, Math.max(0, i) * DEPTH_WEAR);
}
function wear(f, s) {
  const t = constrain((Date.now() - s.seen) / (WEAR_DAYS * DAY), 0, 1) * 0.55;
  return constrain(t + depthWear(f) - (s.brush || 0), 0, 0.95);
}
function cleanse(f, s) {
  s.seen = Date.now();
  s.brush = depthWear(f);
}

/* ======================================================================
   Stones and the physics pile
   ====================================================================== */
function computeScale() {
  S = constrain(
    Math.min(width / 1000, height / 760),
    width < 620 ? 0.5 : 0.62,
    1.1,
  );
  headerH = width < 620 ? 100 : width < 860 ? 112 : 76;
}

function floorY() {
  return height - 30;
}

function buildWalls() {
  walls.forEach((w) => Composite.remove(engine.world, w));
  const T = 200;
  walls = [
    Bodies.rectangle(width / 2, floorY() + T / 2, width * 3, T, {
      isStatic: true,
      friction: 1,
    }),
    Bodies.rectangle(12 - T / 2, -height * 19, T, height * 40, {
      isStatic: true,
    }),
    Bodies.rectangle(width - 12 + T / 2, -height * 19, T, height * 40, {
      isStatic: true,
    }),
  ];
  Composite.add(engine.world, walls);
  wakeAll();
}

function wakeAll() {
  stones.forEach((st) => Sleeping.set(st.body, false));
  sandBodies.forEach((g) => Sleeping.set(g, false));
}

function shardSize(s) {
  const r = rng(s.id + "size");
  const len = s.text.length;
  const w = constrain(100 + len * 1.45 + r() * 24, 112, 260) * S;
  // roughly how many lines the memo needs at 12px, so long memos get taller stones
  const lines = Math.ceil((len * 6.3 * S) / (w * 0.74));
  const h = Math.min(Math.max(58 + r() * 18, lines * 15 + 30), 190) * S;
  return [w, h];
}

function makeStone(f, s, x, y) {
  const [w, h] = shardSize(s);
  const r = rng(s.id + "shape");
  const pts = chunky(r).map(([u, v]) => ({
    x: (u - 0.5) * w,
    y: (v - 0.5) * h,
  }));
  const body = Bodies.fromVertices(x, y, [hull(pts)], {
    friction: 0.9,
    frictionStatic: 1,
    restitution: 0.02,
    density: 0.002,
  });
  // outline relative to the body's centre, before any rotation
  const local = body.vertices.map((v) => ({
    x: v.x - body.position.x,
    y: v.y - body.position.y,
  }));
  Body.setAngle(body, (r() - 0.5) * 0.35);
  const dr = rng(s.id + "dirt");
  return {
    sid: s.id,
    fid: f.id,
    body,
    local,
    w,
    h,
    dots: Array.from({ length: 80 }, () => [
      (dr() - 0.5) * w,
      (dr() - 0.5) * h,
      0.8 + dr() * 1.6,
    ]),
    gfx: null,
    gfxKey: "",
    flash: 0,
    disp: { x, y, a: body.angle, kx: 1, ky: 1 },
    anim: null,
    home: null,
  };
}

function addStone(st) {
  st.born = frameCount;
  stones.set(st.sid, st);
  Composite.add(engine.world, st.body);
}
function removeStone(sid) {
  const st = stones.get(sid);
  if (!st) return;
  Composite.remove(engine.world, st.body);
  stones.delete(sid);
  wakeAll();
}

function pileTop() {
  let top = floorY();
  stones.forEach((st) => {
    const b = st.body;
    // ignore stones still falling (a stone that just appeared hasn't started moving yet)
    if (frameCount - (st.born || 0) < 60) return;
    if (Math.hypot(b.velocity.x, b.velocity.y) < 1.5)
      top = Math.min(top, b.bounds.min.y);
  });
  return top;
}
// anything dropped onto the pile starts just above it, never inside it
const dropY = () => Math.min(-80, pileTop() - 160);
// the highest the camera goes: the pile's top sits just under the intro text
const camTop = () =>
  Math.min(0, (pileTopSm === null ? pileTop() : pileTopSm) - (headerH + 110));

function addSand(n, x) {
  const y0 = dropY();
  for (let i = 0; i < n; i++) {
    if (sandBodies.length > 120) return;
    const g = Bodies.circle(
      x + random(-60, 60),
      y0 + 60 - random(80),
      random(2.2, 3.6) * S,
      { friction: 0.6, restitution: 0, density: 0.001 },
    );
    sandBodies.push(g);
    Composite.add(engine.world, g);
  }
}

// On opening, the stones fall in one by one, oldest film first, so the newest land on top.
function pourIn() {
  let total = 0;
  byOldest().forEach((f) => {
    total += f.sand || 0;
  });
  addSand(Math.min(total * 10, 120), width / 2);
  let t = frameCount + 10;
  byOldest().forEach((f) =>
    f.shards.forEach((s) => {
      pourQueue.push({
        stone: makeStone(
          f,
          s,
          width / 2 + random(-width * 0.26, width * 0.26),
          -80 - random(60),
        ),
        at: t,
      });
      t += 5;
    }),
  );
}

// Same pile, already settled (kept for reference; not used on open).
function prewarm() {
  let total = 0;
  byOldest().forEach((f) => {
    total += f.sand || 0;
  });
  addSand(Math.min(total * 10, 120), width / 2);
  for (let i = 0; i < 40; i++) Engine.update(engine, 1000 / 60);
  byOldest().forEach((f) =>
    f.shards.forEach((s) => {
      addStone(
        makeStone(f, s, width / 2 + random(-width * 0.26, width * 0.26), -80),
      );
      for (let i = 0; i < 16; i++) Engine.update(engine, 1000 / 60);
    }),
  );
  for (let i = 0; i < 260; i++) Engine.update(engine, 1000 / 60);
}

function stepPhysics() {
  while (pourQueue.length && pourQueue[0].at <= frameCount) {
    const st = pourQueue.shift().stone;
    const y = dropY() - random(60);
    Body.setPosition(st.body, { x: st.body.position.x, y });
    st.disp.y = y;
    addStone(st);
  }
  // camera: follow the top of the pile, smoothly
  const pt = pileTop();
  pileTopSm = pileTopSm === null ? pt : pileTopSm + (pt - pileTopSm) * 0.05;
  if (mode === "strata") {
    if (followTop) scrollY += (camTop() - scrollY) * 0.08;
    scrollY = constrain(scrollY, camTop(), 0);
  } else {
    if (binFollow) binY += (binMin - binY) * 0.08;
    binY = constrain(binY, binMin, 0);
  }

  // now and then, one buried fragment twitches as if something is down there
  // drawn only: it doesn't push the stone, so nothing around it moves
  if (
    mode === "strata" &&
    !brushOn &&
    millis() > nextPeek &&
    pourQueue.length === 0
  ) {
    nextPeek = millis() + 6500;
    const deep = [];
    stones.forEach((st) => {
      const [f, s] = findShard(st.sid);
      if (f && wear(f, s) > 0.55) deep.push(st);
    });
    if (deep.length) {
      const st = random(deep);
      st.peek = millis();
      for (let k = 0; k < 6; k++)
        particles.push({
          x: st.disp.x + random(-20, 20),
          y: st.disp.y - camY() - st.h * 0.3,
          vx: random(-1, 1),
          vy: random(-2.2, -0.8),
          life: 1,
          c: random() < 0.5 ? SOIL : SOIL_DARK,
          r: random(2, 3.5),
        });
    }
  }
  if (mode === "strata" && millis() > settlingUntil)
    Engine.update(engine, 1000 / 60);
}

/* ---------- Sorting: slide the existing stones into columns and back ---------- */
function setMode(m) {
  if (m === mode) return;
  const from = mode;
  mode = m;
  if (m === "strata") {
    // columns were drawn shifted by the scroll; bring that into the stones' positions first
    stones.forEach((st) => {
      st.disp.x -= scrollX;
      st.disp.y += scrollY - binY;
    });
    scrollX = 0;
    maxScroll = 0;
    binY = 0;
    binMin = 0;
    // slide every stone back to where it lay in the pile, then let physics take over again
    let i = 0,
      longest = 0;
    stones.forEach((st) => {
      const to = st.home || { x: st.disp.x, y: st.disp.y, a: st.disp.a };
      startAnim(st, { x: to.x, y: to.y, a: to.a, kx: 1, ky: 1 }, i * 10);
      longest = Math.max(longest, i * 10 + 850);
      i++;
    });
    bins = [];
    settlingUntil = millis() + longest;
    setTimeout(() => {
      if (mode !== "strata") return;
      stones.forEach((st) => {
        st.anim = null;
        Body.setPosition(st.body, { x: st.disp.x, y: st.disp.y });
        Body.setAngle(st.body, st.disp.a);
        Body.setVelocity(st.body, { x: 0, y: 0 });
        Body.setAngularVelocity(st.body, 0);
        Composite.add(engine.world, st.body);
      });
      wakeAll();
    }, longest + 30);
  } else {
    if (from === "strata") {
      // remember the pile, take the stones out of the physics world
      stones.forEach((st) => {
        st.home = {
          x: st.body.position.x,
          y: st.body.position.y,
          a: st.body.angle,
        };
        Composite.remove(engine.world, st.body);
      });
      pourQueue.forEach((q) => {
        q.stone.home = null;
      });
      stones.forEach((st) => {
        st.disp.y -= scrollY;
      });
    } else {
      stones.forEach((st) => {
        st.disp.x -= scrollX;
        st.disp.y -= binY;
      });
    }
    scrollX = 0;
    binY = 0;
    binFollow = false; // columns start at the floor, where every stack begins
    arrangeBins(true);
  }
}

const decadeOf = (f) => Math.floor(f.year / 10) * 10;

function arrangeBins(animate) {
  const groups = new Map();
  const films0 = byOldest();
  if (mode === "decade" && films0.length) {
    // every decade from the oldest film to the newest, empty ones included
    const lo = Math.min(...films0.map(decadeOf)),
      hi = Math.max(...films0.map(decadeOf));
    for (let d = lo; d <= hi; d += 10) groups.set(`${d}s`, []);
    films0.forEach((f) => groups.get(`${decadeOf(f)}s`).push(f));
  } else {
    films0.forEach((f) => {
      if (!groups.has(f.director)) groups.set(f.director, []);
      groups.get(f.director).push(f);
    });
  }
  const list = [...groups.entries()].map(([key, fs]) => ({
    key,
    fs,
    count: fs.reduce((a, f) => a + f.shards.length, 0),
  }));
  if (mode === "director")
    list.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  // fixed-width columns; when they don't fit, the row scrolls sideways
  const left = 16,
    gap = width < 600 ? 10 : 18,
    n = Math.max(1, list.length);
  const fitW = (width - 32 - gap * (n - 1)) / n;
  const colW = Math.max(fitW, constrain(width / 4.4, 190, 270));
  maxScroll = Math.max(0, left * 2 + n * colW + (n - 1) * gap - width);
  scrollX = constrain(scrollX, 0, maxScroll);
  const top = headerH + (width < 620 ? 96 : 70);
  const availH = floorY() - top - 40;
  const maxC = Math.max(1, ...list.map((b) => b.count));
  const bh = constrain(availH / maxC / 0.92, 24, 54);
  const step = bh * 0.92;
  // a column taller than the screen scrolls up and down
  binMin = -Math.max(0, maxC * step + bh * 0.08 + 6 - availH);
  binY = constrain(binY, binMin, 0);

  bins = [];
  let i = 0;
  list.forEach((b, j) => {
    const x0 = left + j * (colW + gap);
    bins.push({ x: x0, w: colW, key: b.key, count: b.count, top, gap });
    let k = 0;
    b.fs.forEach((f) =>
      f.shards.forEach((s) => {
        const st = stones.get(s.id);
        if (!st) return;
        const r = rng(s.id + "bin");
        const w = colW * (0.55 + r() * 0.4);
        const target = {
          x: x0 + colW / 2 + (r() - 0.5) * (colW - w) * 0.7,
          y: floorY() - bh / 2 - 2 - k * step,
          a: (r() - 0.5) * 0.06,
          kx: w / st.w,
          ky: bh / st.h,
        };
        if (animate) startAnim(st, target, i * 10);
        else {
          st.anim = null;
          Object.assign(st.disp, target);
        }
        k++;
        i++;
      }),
    );
  });
}

function startAnim(st, to, delay) {
  const from = { ...st.disp };
  // turn the short way round
  from.a = to.a + ((((from.a - to.a) % TWO_PI) + 3 * PI) % TWO_PI) - PI;
  st.anim = { from, to, t0: millis() + delay, dur: 820 };
}

function updateDisp(st) {
  if (st.anim) {
    const { from, to, t0, dur } = st.anim;
    const e = easeInOut(constrain((millis() - t0) / dur, 0, 1));
    st.disp.x = lerp(from.x, to.x, e);
    st.disp.y = lerp(from.y, to.y, e);
    st.disp.a = lerp(from.a, to.a, e);
    st.disp.kx = lerp(from.kx, to.kx, e);
    st.disp.ky = lerp(from.ky, to.ky, e);
    if (e >= 1 && mode !== "strata") st.anim = null;
  } else if (mode === "strata") {
    st.disp.x = st.body.position.x;
    st.disp.y = st.body.position.y;
    st.disp.a = st.body.angle;
    st.disp.kx = 1;
    st.disp.ky = 1;
  }
}

// Which stone is under a point (topmost first)?
function stoneAt(x, y) {
  const list = [...stones.values()];
  for (let i = list.length - 1; i >= 0; i--) {
    const st = list[i],
      d = st.disp;
    const dx = x - d.x,
      dy = y - d.y;
    const c = Math.cos(-d.a),
      s = Math.sin(-d.a);
    const lx = (dx * c - dy * s) / d.kx,
      ly = (dx * s + dy * c) / d.ky;
    if (
      inside(
        st.local.map((p) => [p.x, p.y]),
        [lx, ly],
      )
    )
      return st;
  }
  return null;
}

/* ======================================================================
   Drawing: pile
   ====================================================================== */
function drawPile() {
  background(BG);

  // short concept line, under everything
  noStroke();
  fill(MUTE);
  textStyle(NORMAL);
  const ls = 14 * Math.max(S, 0.85);
  textSize(ls);
  textAlign(LEFT, TOP);
  const lede =
    "Not a review. A record of what stays. Newest on top, older ones buried deeper. Brush to unearth, tap to recall.";
  let ly = headerH + 16;
  if (width < 620) {
    const fs = byNewest();
    const n = fs.reduce((a, f) => a + f.shards.length, 0);
    fill(INK);
    textStyle(BOLD);
    text(`${plural(fs.length, "film")} · ${plural(n, "fragment")}`, 16, ly);
    ly += ls * 1.6;
    fill(MUTE);
    textStyle(NORMAL);
  }
  wrapLines(lede, Math.min(width - 32, 620), ls, 3).forEach((l, i) =>
    text(l, 16, ly + i * ls * 1.35),
  );

  // columns while sorted (shifted by the sideways scroll)
  push();
  translate(-camX(), 0);
  bins.forEach((b, j) => {
    stroke(INK);
    strokeWeight(STROKE);
    line(b.x, b.top, b.x + b.w, b.top);
    if (j > 0) line(b.x - b.gap / 2, b.top, b.x - b.gap / 2, floorY());
    noStroke();
    fill(INK);
    textStyle(BOLD);
    textSize(13);
    textAlign(LEFT, TOP);
    text(fitText(b.key, b.w - 40), b.x + 2, b.top + 9);
    fill(MUTE);
    textStyle(NORMAL);
    textAlign(RIGHT, TOP);
    text(String(b.count), b.x + b.w - 2, b.top + 9);
  });

  pop();

  // sand, stones and the floor scroll with the camera
  push();
  const clipped = mode !== "strata" && bins.length;
  if (clipped) {
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(
      0,
      bins[0].top + 30,
      width,
      floorY() - bins[0].top - 30,
    );
    drawingContext.clip();
  }
  translate(-camX(), -camY());
  noStroke();
  sandBodies.forEach((g, i) => {
    fill(i % 3 ? SOIL : SOIL_DARK);
    circle(g.position.x, g.position.y, g.circleRadius * 2);
  });
  stones.forEach((st) => {
    updateDisp(st);
    drawStone(st);
  });
  if (clipped) drawingContext.restore();
  pop();
  stroke(INK);
  strokeWeight(STROKE);
  line(0, floorY() - camY(), width, floorY() - camY());

  // footer stays put
  noStroke();
  fill(BG);
  rect(0, floorY(), width, height - floorY());
  stroke(INK);
  strokeWeight(STROKE);
  line(0, floorY(), width, floorY());
  noStroke();
  fill(MUTE);
  textStyle(NORMAL);
  textSize(12);
  textAlign(LEFT, CENTER);
  const resetLabel =
    millis() < resetArmedUntil ? "Tap again to reset" : "Reset demo pile";
  text(resetLabel, 16, floorY() + 15);
  buttons.push({
    id: "reset",
    x: 8,
    y: floorY() + 2,
    w: textWidth(resetLabel) + 16,
    h: 28,
  });

  // how deep you are in the pile, when it's taller than the screen
  const ct = mode === "strata" ? camTop() : binMin;
  if (ct < -4) {
    const x = width - 8,
      y0 = (mode === "strata" ? headerH : bins[0].top + 30) + 14,
      y1 = floorY() - 14;
    const span = y1 - y0;
    const vis = span / (span - ct);
    const thumb = Math.max(36, span * vis);
    const at = y0 + (span - thumb) * (1 - camY() / ct);
    stroke(SOIL);
    strokeWeight(3);
    line(x, y0, x, y1);
    stroke(INK);
    line(x, at, x, at + thumb);
    noStroke();
    textSize(12);
    textAlign(RIGHT, CENTER);
    fill(MUTE);
    const hint =
      mode !== "strata" || scrollY > ct * 0.98 + 2
        ? ""
        : "Scroll down to dig deeper";
    if (hint && width - 16 - textWidth(hint) > 16 + textWidth(resetLabel) + 24)
      text(hint, width - 16, floorY() + 15);
  }

  // scroll position, when the columns run past the screen
  if (mode !== "strata" && maxScroll > 0) {
    textSize(12);
    const resetEnd = 16 + textWidth(resetLabel);
    const tx0 = Math.max(width * 0.55, resetEnd + 24),
      tx1 = width - 16,
      ty = floorY() + 15;
    const span = tx1 - tx0,
      vis = width / (width + maxScroll);
    const thumb = Math.max(30, span * vis);
    const at = tx0 + (span - thumb) * (scrollX / maxScroll);
    textAlign(RIGHT, CENTER);
    fill(MUTE);
    textSize(12);
    const hint = "Drag sideways for more";
    if (tx0 - 12 - textWidth(hint) > resetEnd + 16) text(hint, tx0 - 12, ty); // only when there's room

    stroke(SOIL);
    strokeWeight(3);
    line(tx0, ty, tx1, ty);
    stroke(INK);
    line(at, ty, at + thumb, ty);
    noStroke();
  }

  drawParticles();
  drawChunks();
  drawHeader();
}

// Each stone is drawn once into its own small image and redrawn only when its dirt
// level or text changes. Drawing an image per frame is far cheaper than redrawing
// the text, the clipping and the dirt every frame.
function stoneImage(st, f, s, w, withText) {
  const key = `${Math.round(w * 30)}|${withText ? s.text : ""}|${f.color}`;
  if (st.gfx && st.gfxKey === key) return st.gfx;
  const xs = st.local.map((p) => p.x),
    ys = st.local.map((p) => p.y);
  const ox = -Math.min(...xs) + 2,
    oy = -Math.min(...ys) + 2;
  const gw = Math.ceil(Math.max(...xs) + ox + 2),
    gh = Math.ceil(Math.max(...ys) + oy + 2);
  if (!st.gfx || st.gfx.width !== gw || st.gfx.height !== gh) {
    if (st.gfx) st.gfx.remove();
    st.gfx = createGraphics(gw, gh);
    st.gfx.textFont(CANVAS_FONT);
  }
  const g = st.gfx;
  g.clear();
  g.noStroke();
  g.fill(lerpColor(color(f.color), color(SOIL), w * 0.55));
  g.beginShape();
  st.local.forEach((p) => g.vertex(p.x + ox, p.y + oy));
  g.endShape(CLOSE);

  const ctx = g.drawingContext;
  ctx.save();
  ctx.beginPath();
  st.local.forEach((p, i) =>
    i ? ctx.lineTo(p.x + ox, p.y + oy) : ctx.moveTo(p.x + ox, p.y + oy),
  );
  ctx.closePath();
  ctx.clip();
  g.push();
  g.translate(ox, oy);
  if (withText) {
    const ink = color(inkOn(f.color));
    ink.setAlpha(255 * (1 - w * 0.5));
    g.fill(ink);
    const size = Math.max(9, 12 * S); // stays readable on phones
    g.textStyle(NORMAL);
    g.textSize(size);
    g.textAlign(LEFT, TOP);
    const lines = wrapLinesIn(
      g,
      s.text,
      st.w * 0.74,
      Math.max(3, Math.floor((st.h * 0.8) / (size * 1.22))),
    );
    const lh = size * 1.22;
    const y0 = -(lines.length * lh) / 2;
    lines.forEach((l, i) => g.text(l, -st.w * 0.37, y0 + i * lh));
  }
  if (w > 0.01) {
    const soil = color(SOIL);
    soil.setAlpha(255 * Math.min(1, w * 1.02));
    g.fill(soil);
    g.rect(-st.w, -st.h, st.w * 2, st.h * 2);
    const dk = color(SOIL_DARK);
    dk.setAlpha(255 * Math.min(1, w * 1.1));
    g.fill(dk);
    const n = Math.round(st.dots.length * Math.min(1, w * 1.3));
    for (let i = 0; i < n; i++) {
      const [x, y, r] = st.dots[i];
      g.circle(x, y, r * 2);
    }
  }
  g.pop();
  ctx.restore();
  st.gfxKey = key;
  st.ox = ox;
  st.oy = oy;
  return g;
}

function drawStone(st) {
  const [f, s] = findShard(st.sid);
  if (!f) return;
  const w = wear(f, s);
  const strata = mode === "strata";
  const g = stoneImage(st, f, s, w, strata);
  const d = st.disp;

  push();
  translate(d.x, d.y);
  let shiver = 0;
  if (st.peek) {
    const pt = (millis() - st.peek) / 700;
    if (pt < 1) shiver = Math.sin(pt * PI * 6) * 0.045 * (1 - pt);
    else st.peek = 0;
  }
  rotate(d.a + shiver);
  push();
  scale(d.kx, d.ky);
  image(g, -st.ox, -st.oy);
  // just unearthed: a bright flash
  if (st.flash) {
    const a = 1 - (millis() - st.flash) / 700;
    if (a > 0) {
      const c = color(PAPER);
      c.setAlpha(230 * a);
      fill(c);
      noStroke();
      beginShape();
      st.local.forEach((p) => vertex(p.x, p.y));
      endShape(CLOSE);
    } else st.flash = 0;
  }
  pop();
  // in the columns, each stone shows its film title instead of the memo
  if (!strata) {
    const ink = color(inkOn(f.color));
    ink.setAlpha(255 * (1 - w * 0.6));
    noStroke();
    fill(ink);
    textStyle(BOLD);
    textSize(constrain(st.h * d.ky * 0.32, 9, 12));
    textAlign(CENTER, CENTER);
    text(fitText(f.title, st.w * d.kx * 0.78), 0, 1);
  }
  pop();
}

function drawHeader() {
  if (width < 620) {
    drawPhoneHeader();
    return;
  }
  noStroke();
  fill(BG);
  rect(0, 0, width, headerH);
  stroke(INK);
  strokeWeight(STROKE);
  line(16, headerH, width - 16, headerH);
  noStroke();

  // brand
  fill(ACCENT);
  beginShape();
  vertex(18, 24);
  vertex(32, 26);
  vertex(34, 37);
  vertex(28, 46);
  vertex(16, 43);
  endShape(CLOSE);
  fill(INK);
  textStyle(BOLD);
  textSize(26);
  textAlign(LEFT, CENTER);
  text("Ostraca", 42, 36);
  const bw = textWidth("Ostraca");
  if (width >= 980) {
    fill(MUTE);
    textStyle(NORMAL);
    textSize(13);
    text("What films leave behind", 54 + bw, 38);
  }

  // actions on the right
  const h = 44;
  let x = width - 16;
  const y1 = 14;
  x =
    buttonRight(
      "new",
      width < 420 ? "+ Film" : "+ After a film",
      x,
      y1,
      h,
      "accent",
    ) - 8;
  x =
    buttonRight(
      "brush",
      brushOn ? "Done" : "Brush",
      x,
      y1,
      h,
      brushOn ? "ink" : "ghost",
    ) - 18;

  // sorting
  const segY = width < 860 ? 62 : y1;
  const segs = [
    ["strata", "Strata"],
    ["decade", "Decade"],
    ["director", "Director"],
  ];
  textStyle(BOLD);
  textSize(14);
  const segW = segs.map(([, label]) => textWidth(label) + 34);
  const segTotal = segW.reduce((a, b) => a + b, 0);
  const segH = h - 4;
  const narrow = width < 620;
  let sx = (width < 860 ? width - 16 : x) - segTotal;
  if (narrow) {
    // phones: the three buttons share the full width of their own row
    const full = width - 32;
    segs.forEach((_, i) => {
      segW[i] = full / segs.length;
    });
    sx = 16;
  }
  const segSum = segW.reduce((a, b) => a + b, 0);
  let cx = sx;
  segs.forEach(([m, label], i) => {
    noStroke();
    if (mode === m) {
      fill(INK);
      rect(cx, segY, segW[i], segH);
    }
    fill(mode === m ? BG : INK);
    textAlign(CENTER, CENTER);
    text(label, cx + segW[i] / 2, segY + segH / 2 + 1);
    buttons.push({ id: "mode:" + m, x: cx, y: segY, w: segW[i], h: segH });
    cx += segW[i];
  });
  // one outline and single dividers, so every line has the same weight
  noFill();
  stroke(INK);
  strokeWeight(STROKE);
  rect(sx, segY, segSum, segH);
  cx = sx;
  for (let i = 0; i < segs.length - 1; i++) {
    cx += segW[i];
    line(cx, segY, cx, segY + segH);
  }
  noStroke();

  // stats
  const fs = byNewest();
  const n = fs.reduce((a, f) => a + f.shards.length, 0);
  fill(MUTE);
  textStyle(NORMAL);
  textSize(13);
  if (narrow) {
    /* drawn above the intro line instead */
  } else if (width < 860) {
    textAlign(LEFT, CENTER);
    text(
      `${plural(fs.length, "film")} · ${plural(n, "fragment")}`,
      16,
      segY + (h - 4) / 2,
    );
  } else {
    textAlign(RIGHT, CENTER);
    text(
      `${plural(fs.length, "film")} · ${plural(n, "fragment")}`,
      sx - 14,
      y1 + h / 2,
    );
  }
}

// Phones: a lighter header. Compact buttons, and the sorting as text tabs.
function drawPhoneHeader() {
  noStroke();
  fill(BG);
  rect(0, 0, width, headerH);

  fill(ACCENT);
  beginShape();
  vertex(16, 20);
  vertex(28, 22);
  vertex(30, 31);
  vertex(25, 39);
  vertex(15, 36);
  endShape(CLOSE);
  fill(INK);
  textStyle(BOLD);
  textSize(22);
  textAlign(LEFT, CENTER);
  text("Ostraca", 38, 30);

  textStyle(BOLD);
  textSize(14);
  let x = width - 16;
  const add = width < 420 ? "+ Film" : "+ After a film";
  const aw = textWidth(add) + 24;
  drawButton("new", add, x - aw, 12, aw, 36, "accent");
  x -= aw + 6;
  const bl = brushOn ? "Done" : "Brush";
  const bw = textWidth(bl) + 24;
  drawButton("brush", bl, x - bw, 12, bw, 36, brushOn ? "ink" : "ghost");

  // sorting as tabs: the active one is dark with a rule under it
  const ty = 76;
  let tx = 16;
  [
    ["strata", "Strata"],
    ["decade", "Decade"],
    ["director", "Director"],
  ].forEach(([m, label]) => {
    const on = mode === m;
    textSize(14);
    textStyle(on ? BOLD : NORMAL);
    textAlign(LEFT, CENTER);
    fill(on ? INK : MUTE);
    noStroke();
    text(label, tx, ty);
    const w = textWidth(label);
    if (on) {
      stroke(INK);
      strokeWeight(STROKE);
      line(tx, ty + 12, tx + w, ty + 12);
      noStroke();
    }
    buttons.push({ id: "mode:" + m, x: tx - 8, y: ty - 20, w: w + 16, h: 40 });
    tx += w + 26;
  });

  stroke(INK);
  strokeWeight(STROKE);
  line(16, headerH, width - 16, headerH);
  noStroke();
}

// Draws a button whose right edge is at x; returns its left edge.
function buttonRight(id, label, x, y, h, style, joined) {
  textStyle(BOLD);
  textSize(14);
  const w = textWidth(label) + 34;
  drawButton(id, label, x - w, y, w, h, style);
  return joined ? x - w + STROKE : x - w;
}

function drawButton(id, label, x, y, w, h, style, disabled) {
  push();
  strokeWeight(STROKE);
  const a = disabled ? 80 : 255;
  if (style === "accent") {
    const c = color(ACCENT);
    c.setAlpha(a);
    fill(c);
    stroke(c);
  } else if (style === "ink") {
    const c = color(INK);
    c.setAlpha(a);
    fill(c);
    stroke(c);
  } else {
    noFill();
    const c = color(INK);
    c.setAlpha(a);
    stroke(c);
  }
  rect(x, y, w, h);
  noStroke();
  if (style === "accent") fill(255, a);
  else if (style === "ink") {
    const c = color(BG);
    c.setAlpha(a);
    fill(c);
  } else {
    const c = color(INK);
    c.setAlpha(a);
    fill(c);
  }
  textStyle(BOLD);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2 + 1);
  pop();
  if (!disabled) buttons.push({ id, x, y, w, h });
}

/* ---------- Brush ---------- */
function setBrush(on) {
  brushOn = on;
  ptr.seen = ptr.type === "mouse";
  if (on) toast("Rub a buried fragment to brush the dirt away.");
  else saveData();
  document.querySelector("canvas").style.cursor = on ? "none" : "default";
}

function drawBrush(x, y) {
  push();
  translate(x, y);
  rotate(-0.62);
  noStroke();
  // bristles: the tip sits right under the finger
  fill("#C9A96E");
  beginShape();
  vertex(-11, 0);
  vertex(11, 0);
  vertex(9, -26);
  vertex(-9, -26);
  endShape(CLOSE);
  stroke("#7B5E2E");
  strokeWeight(1.2);
  for (let i = -6; i <= 6; i += 4) line(i, -3, i * 0.85, -22);
  noStroke();
  fill(INK);
  rect(-10, -36, 20, 11); // ferrule
  fill(ACCENT);
  rect(-5, -72, 10, 37); // handle
  pop();
}

function brushAt(x, y, dist) {
  const st = stoneAt(x + camX(), y + camY());
  if (!st) return;
  const [f, s] = findShard(st.sid);
  if (!f || wear(f, s) <= 0.001) return;
  s.brush = (s.brush || 0) + dist / BRUSH_PX;
  for (let i = 0; i < Math.min(3, Math.ceil(dist / 6)); i++) {
    particles.push({
      x: x + random(-16, 16),
      y: y + random(-6, 6),
      vx: random(-1.6, 1.6),
      vy: random(-1.5, 0.5),
      life: 1,
      c: random() < 0.5 ? SOIL : SOIL_DARK,
      r: random(2, 4),
    });
  }
  if (wear(f, s) <= 0.02) {
    cleanse(f, s);
    st.flash = millis();
    if (mode === "strata") {
      Sleeping.set(st.body, false);
      Body.setVelocity(st.body, { x: 0, y: -5 });
      Body.setAngularVelocity(st.body, random(-0.04, 0.04));
    }
    toast(`Unearthed from ${f.title}. Tap it to recall the film.`);
  }
}

function drawParticles() {
  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 0.22;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.025;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    const c = color(p.c);
    c.setAlpha(255 * p.life);
    fill(c);
    rect(p.x, p.y, p.r, p.r);
  }
}

/* ======================================================================
   Recall: the vessel comes back together, then breaks open into fragments
   ====================================================================== */
function recallLayout() {
  const titleSize = constrain(width * 0.062, 34, 84);
  const narrow = width <= 700;
  const top = 64 + titleSize + (narrow ? 62 : 40);
  const bottom = height - (narrow ? 62 : 44);
  const vs = Math.min(width * 0.8, (bottom - top) * 0.95) / 430;
  return {
    titleSize,
    top,
    bottom,
    vs,
    cx: width / 2,
    cy: top + (bottom - top) / 2 - 10,
  };
}

function openRecall(f, sid) {
  const L = recallLayout();
  const tn = tones(f.color, f.shards.length);
  rc = {
    f,
    tn,
    phase: "assemble",
    t0: millis(),
    auto: true,
    from: f.shards.map((s) => {
      const st = stones.get(s.id);
      const bb = bbox(s.vpoly);
      if (!st)
        return { x: random(width), y: height + 100, a: random(-1, 1), k: 0.3 };
      return {
        x: st.disp.x - camX(),
        y: st.disp.y - camY(),
        a: st.disp.a,
        k: constrain((st.w * st.disp.kx) / ((bb.w || 1) * L.vs), 0.15, 2),
      };
    }),
    weights: f.shards.map(() => 0),
    focus: Math.max(
      0,
      f.shards.findIndex((s) => s.id === sid),
    ),
    grind: null,
    editing: -1,
    removing: null,
  };
  view = "recall";
  if (brushOn) setBrush(false);
}

function closeRecall() {
  hideEdit();
  rc = null;
  view = "pile";
}

function breakOpen() {
  if (!rc || (rc.phase !== "assemble" && rc.phase !== "whole")) return;
  rc.phase = "break";
  rc.t0 = millis();
}

function closeUp() {
  if (!rc || rc.phase !== "open") return;
  hideEdit();
  rc.phase = "closing";
  rc.t0 = millis();
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function drawRecall() {
  const f = rc.f;
  const L = recallLayout();
  background(BG);

  // bar
  noStroke();
  fill(INK);
  textStyle(BOLD);
  textSize(15);
  textAlign(LEFT, CENTER);
  text("← Back to the pile", 16, 32);
  buttons.push({
    id: "back",
    x: 6,
    y: 8,
    w: textWidth("← Back to the pile") + 20,
    h: 48,
  });
  if (rc.phase === "open")
    buttonRight("closeup", "Put it back together", width - 16, 10, 44, "ghost");
  stroke(INK);
  strokeWeight(STROKE);
  line(16, 62, width - 16, 62);

  // title + meta
  noStroke();
  fill(INK);
  textStyle(BOLD);
  textSize(L.titleSize);
  textAlign(LEFT, TOP);
  text(fitText(f.title, width - 32), 14, 76);
  fill(MUTE);
  textStyle(NORMAL);
  textSize(14);
  textAlign(RIGHT, BOTTOM);
  const meta = `${f.director}, ${f.year} · watched ${fmtDate(f.watched)} · ${plural(f.shards.length, "fragment")} kept`;
  if (width > 700) text(meta, width - 16, 76 + L.titleSize * 0.95);
  else {
    textAlign(LEFT, TOP);
    wrapLines(meta, width - 32, 14, 2).forEach((l, i) =>
      text(l, 16, 76 + L.titleSize + 6 + i * 18),
    );
  }

  const t = millis() - rc.t0;
  if (rc.phase === "assemble" || rc.phase === "whole") drawVessel(L, t, false);
  else if (rc.phase === "break") {
    drawVessel(L, t, true);
    if (t > 560) {
      rc.phase = "open";
      rc.t0 = millis();
      rc.f.shards.forEach((s) => cleanse(rc.f, s));
      saveData();
    }
  } else if (rc.phase === "open" || rc.phase === "closing") drawPanels(L, t);
  drawChunks();
  drawParticles();
  if (!rc) return; // the last fragment was ground away and recall closed itself

  // hint
  noStroke();
  fill(MUTE);
  textStyle(NORMAL);
  textSize(13);
  textAlign(CENTER, CENTER);
  const hint =
    rc.phase === "open"
      ? "Drag across to look closer · Rub in circles to grind a fragment to sand · Edit to rewrite it"
      : rc.phase === "closing"
        ? ""
        : "Tap the vessel to break it open";
  if (width > 700) text(hint, width / 2, height - 20);
  else {
    const hl = wrapLines(hint, width - 32, 13, 2);
    hl.forEach((l, i) =>
      text(l, width / 2, height - 14 - (hl.length - 1 - i) * 17),
    );
  }
}

function drawVessel(L, t, breaking) {
  const f = rc.f;
  const n = f.shards.length;
  const toScreen = (p) => [
    L.cx + (p[0] - 200) * L.vs,
    L.cy + (p[1] - 200) * L.vs,
  ];

  // missing pieces: dashed outlines
  const lostA = breaking ? 1 - Math.min(1, t / 300) : Math.min(1, t / 900);
  if (lostA > 0) {
    drawingContext.setLineDash([4, 5]);
    noFill();
    const c = color(INK);
    c.setAlpha(255 * lostA);
    stroke(c);
    strokeWeight(STROKE);
    f.lost.forEach((p) => {
      beginShape();
      shrinkPoly(p, 0.96).forEach((q) => vertex(...toScreen(q)));
      endShape(CLOSE);
    });
    drawingContext.setLineDash([]);
  }

  let allIn = true;
  noStroke();
  f.shards.forEach((s, i) => {
    const c = centroid(s.vpoly);
    const [tx, ty] = toScreen(c);
    let x,
      y,
      a,
      k,
      alpha = 255;
    if (!breaking) {
      const e = easeOut(constrain((t - i * 70) / 900, 0, 1));
      if (e < 1) allIn = false;
      const fr = rc.from[i];
      x = lerp(fr.x, tx, e);
      y = lerp(fr.y, ty, e);
      a = lerp(fr.a, 0, e);
      k = lerp(fr.k, 1, e);
    } else {
      const e = easeIn(constrain((t - i * 25) / 520, 0, 1));
      x = tx + (tx - L.cx) * 1.6 * e;
      y = ty + (ty - L.cy) * 1.6 * e + e * 120;
      a = e * (i % 2 ? 0.5 : -0.5);
      k = 1;
      alpha = 255 * (1 - e);
    }
    const col = color(rc.tn[i]);
    col.setAlpha(alpha);
    fill(col);
    push();
    translate(x, y);
    rotate(a);
    scale(k);
    beginShape();
    shrinkPoly(s.vpoly, 0.975).forEach((p) =>
      vertex((p[0] - c[0]) * L.vs, (p[1] - c[1]) * L.vs),
    );
    endShape(CLOSE);
    pop();
  });

  if (!breaking) {
    if (allIn && rc.phase === "assemble") {
      rc.phase = "whole";
      rc.wholeAt = millis();
    }
    if (rc.phase === "whole" && rc.auto && millis() - rc.wholeAt > 800)
      breakOpen();
    fill(MUTE);
    textStyle(NORMAL);
    textSize(13);
    textAlign(CENTER, TOP);
    const cap = f.lost.length
      ? `${plural(n, "piece")} kept · ${f.lost.length} missing`
      : `${plural(n, "piece")} kept · nothing missing`;
    text(cap, L.cx, L.cy + 215 * L.vs);
    buttons.push({
      id: "vessel",
      x: L.cx - 210 * L.vs,
      y: L.cy - 210 * L.vs,
      w: 420 * L.vs,
      h: 420 * L.vs,
    });
  }
}

function panelRects(L) {
  const x0 = 16,
    x1 = width - 16,
    gap = 4;
  const ws = rc.weights;
  const sum = ws.reduce((a, b) => a + b, 0) || 1;
  const free = x1 - x0 - gap * (ws.length - 1);
  let x = x0;
  return ws.map((w) => {
    const pw = (free * w) / sum;
    const r = { x, y: L.top, w: pw, h: L.bottom - L.top };
    x += pw + gap;
    return r;
  });
}

function focusTargets() {
  const n = rc.f.shards.length;
  return rc.f.shards.map((_, i) => {
    if (rc.removing && rc.removing.i === i) return 0.0001;
    if (rc.phase === "closing") return 0.0001;
    const d = i + 0.5 - rc.focusP;
    return 1 + (n > 1 ? 3.2 : 0) * Math.exp(-(d * d) / 0.5);
  });
}

function drawPanels(L, t) {
  const f = rc.f;
  if (rc.focusP === undefined) rc.focusP = rc.focus + 0.5;
  const targets = focusTargets();
  const speed = rc.phase === "open" && t < 900 ? 0.12 : 0.18;
  rc.weights = rc.weights.map((w, i) =>
    rc.editing >= 0 ? w : w + (targets[i] - w) * speed,
  );
  const rects = panelRects(L);
  rc.rects = rects;

  // which panel is in focus
  let best = 0;
  rc.weights.forEach((w, i) => {
    if (w > rc.weights[best]) best = i;
  });
  rc.focus = best;

  const tw = Math.min(width * 0.42, 520);
  const baseSize = constrain(width * 0.027, 20, 36);
  f.shards.forEach((s, i) => {
    const r = rects[i];
    if (r.w < 2) return;
    if (rc.removing && rc.removing.i === i) return; // already in pieces
    const tone = rc.tn[i];
    const g = rc.grind && rc.grind.i === i ? rc.grind : null;
    const gp = g ? g.prog : 0;
    const ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    // grinding makes the whole fragment shudder
    push();
    if (gp > 0) translate(random(-1, 1) * gp * 5, random(-1, 1) * gp * 3);
    noStroke();
    fill(tone);
    rect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);

    const ink = color(inkOn(tone));
    fill(ink);
    textStyle(BOLD);
    textSize(11);
    textAlign(LEFT, TOP);
    text(s.kind.toUpperCase(), r.x + 18, r.y + 20);

    if (rc.editing !== i) {
      const a = (i === best ? 255 : 120) * (1 - gp * 0.6);
      ink.setAlpha(a);
      fill(ink);
      const size =
        s.text.length > 220
          ? baseSize * 0.62
          : s.text.length > 120
            ? baseSize * 0.78
            : baseSize;
      textStyle(NORMAL);
      textSize(size);
      const lines = wrapLines(
        s.text,
        tw,
        size,
        Math.floor((r.h - 80) / (size * 1.1)),
      );
      const lh = size * 1.1;
      lines.forEach((l, j) =>
        text(l, r.x + 18, r.y + r.h - 22 - (lines.length - j) * lh),
      );
    }

    // Edit button on the panel in focus
    if (
      i === best &&
      rc.phase === "open" &&
      rc.editing < 0 &&
      r.w > 140 &&
      !rc.removing
    ) {
      push();
      stroke(inkOn(tone));
      strokeWeight(STROKE);
      noFill();
      textStyle(BOLD);
      textSize(13);
      const bw = textWidth("Edit") + 28;
      rect(r.x + r.w - bw - 12, r.y + 12, bw, 36);
      noStroke();
      fill(inkOn(tone));
      textAlign(CENTER, CENTER);
      text("Edit", r.x + r.w - bw / 2 - 12, r.y + 30);
      pop();
      buttons.push({
        id: "edit",
        x: r.x + r.w - bw - 12,
        y: r.y + 12,
        w: bw,
        h: 36,
      });
    }

    // Edit mode: Save / Cancel under the text box
    if (rc.editing === i) {
      const bx = r.x + 18,
        by = r.y + 70 + Math.min(220, r.h - 150) + 12;
      drawButton("ed:save", "Save", bx, by, 76, 40, "ink");
      drawButton("ed:cancel", "Cancel", bx + 84, by, 90, 40, "ghost");
    }

    // grinding: cracks spread from where you rub, dust piles up at the bottom
    if (gp > 0) {
      const dim = color(INK);
      dim.setAlpha(110 * gp);
      noStroke();
      fill(dim);
      rect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
      stroke(inkOn(tone));
      strokeWeight(STROKE);
      noFill();
      g.cracks.forEach((c) => {
        const n = Math.ceil(c.length * Math.min(1, gp * 1.5 + 0.08));
        beginShape();
        for (let k = 0; k < n; k++) vertex(g.cx + c[k][0], g.cy + c[k][1]);
        endShape();
      });
      noStroke();
      const hh = 56 * gp;
      fill(SOIL);
      rect(r.x, r.y + r.h - hh, r.w, hh + 6);
      fill(SOIL_DARK);
      for (let yy = r.y + r.h - hh + 3; yy < r.y + r.h; yy += 6)
        for (let xx = r.x + ((yy / 6) % 2) * 3; xx < r.x + r.w; xx += 6)
          circle(xx, yy, 1.8);
    }
    pop();
    ctx.restore();
  });

  if (rc.phase === "closing" && t > 450) {
    rc.phase = "assemble";
    rc.t0 = millis();
    rc.auto = false;
    rc.focusP = undefined;
    rc.from = rc.f.shards.map(() => ({
      x: random(width),
      y: height + 120,
      a: random(-1.5, 1.5),
      k: 0.6,
    }));
  }
  if (rc.grind) {
    const g = rc.grind;
    if (g.prog >= 1) {
      shatter(g.i);
      rc.grind = null;
    } else if (!g.active) {
      // let go too early: the cracks slowly close up again
      g.prog -= 0.012;
      if (g.prog <= 0) rc.grind = null;
    } else if (!g.hinted && g.prog < 0.02 && millis() - g.t0 > 700) {
      g.hinted = true;
      toast("Rub in circles to grind it down.");
    }
  }
  if (rc.removing && millis() - rc.removing.t0 > 650) finishGrind();
}

function startGrind(i, x, y) {
  const r = rc.rects[i];
  const cracks = [];
  for (let k = 0; k < 9; k++) {
    let a = (k / 9) * TWO_PI + random(-0.3, 0.3),
      px = 0,
      py = 0;
    const pts = [[0, 0]];
    const segs = 6 + Math.floor(random(4));
    for (let j = 0; j < segs; j++) {
      a += random(-0.5, 0.5);
      const len = random(18, 46) * (r.h / 600 + 0.6);
      px += Math.cos(a) * len;
      py += Math.sin(a) * len;
      pts.push([px, py]);
    }
    cracks.push(pts);
  }
  const keep = rc.grind && rc.grind.i === i ? rc.grind.prog : 0;
  rc.grind = {
    i,
    cx: x,
    cy: y,
    pts: [[x, y]],
    lastAng: null,
    prog: keep,
    active: true,
    t0: millis(),
    hinted: false,
    cracks: keep ? rc.grind.cracks : cracks,
  };
}

function rubGrind(x, y) {
  const g = rc.grind;
  g.pts.push([x, y]);
  if (g.pts.length > 24) g.pts.shift();
  // the centre of the circle is wherever the finger has been circling lately
  let cx = 0,
    cy = 0;
  g.pts.forEach((p) => {
    cx += p[0];
    cy += p[1];
  });
  cx /= g.pts.length;
  cy /= g.pts.length;
  const rad = Math.hypot(x - cx, y - cy);
  if (rad < 10) {
    g.lastAng = null;
    return;
  }
  const ang = Math.atan2(y - cy, x - cx);
  if (g.lastAng !== null) {
    let d = ang - g.lastAng;
    if (d > PI) d -= TWO_PI;
    if (d < -PI) d += TWO_PI;
    g.prog = Math.min(1, g.prog + Math.abs(d) / (TWO_PI * GRIND_TURNS));
    for (let k = 0; k < Math.min(3, Math.ceil(Math.abs(d) * 6)); k++) {
      particles.push({
        x: x + random(-10, 10),
        y: y + random(-6, 6),
        vx: random(-1.4, 1.4),
        vy: random(-1.2, 0.6),
        life: 1,
        c: random() < 0.5 ? SOIL : SOIL_DARK,
        r: random(2, 4),
      });
    }
  }
  g.lastAng = ang;
}

// The fragment breaks into pieces that fall away; then it sinks into the pile as sand.
function shatter(i) {
  const r = rc.rects[i];
  const tone = rc.tn[i];
  const cols = 6,
    rows = 8;
  const cw = r.w / cols,
    ch = r.h / rows;
  for (let a = 0; a < cols; a++)
    for (let b = 0; b < rows; b++) {
      const x = r.x + a * cw + cw / 2,
        y = r.y + b * ch + ch / 2;
      chunks.push({
        x,
        y,
        w: cw * random(0.6, 1),
        h: ch * random(0.6, 1),
        vx: (x - (r.x + r.w / 2)) * 0.03 + random(-1.5, 1.5),
        vy: random(-5, -1),
        a: 0,
        va: random(-0.12, 0.12),
        c: random() < 0.25 ? SOIL : tone,
      });
    }
  grind(i);
}

function drawChunks() {
  noStroke();
  for (let k = chunks.length - 1; k >= 0; k--) {
    const c = chunks[k];
    c.vy += 0.45;
    c.x += c.vx;
    c.y += c.vy;
    c.a += c.va;
    if (c.y > height + 80) {
      chunks.splice(k, 1);
      continue;
    }
    push();
    translate(c.x, c.y);
    rotate(c.a);
    fill(c.c);
    beginShape();
    vertex(-c.w / 2, -c.h / 2);
    vertex(c.w / 2, -c.h * 0.3);
    vertex(c.w * 0.4, c.h / 2);
    vertex(-c.w / 2, c.h * 0.4);
    endShape(CLOSE);
    pop();
  }
}

function setFocusFromPointer(x, y) {
  if (!rc || rc.phase !== "open" || rc.editing >= 0 || !rc.rects) return;
  const L = recallLayout();
  if (y < L.top || y > L.bottom) return;
  if (hitButton(x, y) === "edit") return; // hold still while reaching for Edit
  for (let i = 0; i < rc.rects.length; i++) {
    const r = rc.rects[i];
    if (x >= r.x && x <= r.x + r.w + 4) {
      rc.focusP = i + 0.5;
      return;
    }
  }
}

function panelAt(x, y) {
  if (!rc || !rc.rects) return -1;
  return rc.rects.findIndex(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
  );
}

// Ground to sand: the piece leaves the vessel and sinks into the pile as grains.
function grind(i) {
  if (!rc || rc.removing) return;
  rc.removing = { i, t0: millis() };
  toast("Ground to sand. It sinks into the pile.");
}
function finishGrind() {
  const f = rc.f;
  const i = rc.removing.i;
  rc.removing = null;
  const [s] = f.shards.splice(i, 1);
  rc.weights.splice(i, 1);
  rc.tn.splice(i, 1);
  rc.from.splice(i, 1);
  f.lost.push(s.vpoly);
  f.sand = (f.sand || 0) + 1;
  const st = stones.get(s.id);
  const x = st ? st.disp.x : width / 2;
  if (st && st.gfx) st.gfx.remove();
  removeStone(s.id);
  addSand(14, x);
  saveData();
  if (mode !== "strata") arrangeBins(false);
  if (!f.shards.length) {
    films = films.filter((x) => x !== f);
    saveData();
    closeRecall();
    toast(`Nothing left of ${f.title}. It's gone from the pile.`);
  } else {
    rc.focusP = Math.min(i, f.shards.length - 1) + 0.5;
  }
}

/* ---------- Editing a fragment ---------- */
function startEdit() {
  if (!rc || rc.phase !== "open") return;
  const i = rc.focus;
  const r = rc.rects[i];
  const s = rc.f.shards[i];
  rc.editing = i;
  const tone = rc.tn[i];
  taEdit.value(s.text);
  taEdit.position(r.x + 18, r.y + 70);
  taEdit.size(
    Math.min(r.w - 36, Math.min(width * 0.42, 520)),
    Math.min(220, r.h - 150),
  );
  taEdit.style("color", inkOn(tone));
  taEdit.style("border", `1.5px dashed ${inkOn(tone)}`);
  taEdit.style("font-size", `${constrain(width * 0.024, 18, 30)}px`);
  taEdit.show();
  taEdit.elt.focus();
}
function hideEdit() {
  taEdit.hide();
  if (rc) rc.editing = -1;
}
function saveEdit() {
  const v = taEdit.value().trim();
  if (!v) {
    toast("A fragment needs some words. Hold it instead to let it go.");
    return;
  }
  const f = rc.f,
    s = f.shards[rc.editing];
  s.text = v;
  saveData();
  // rebuild its stone so its size fits the new words
  const old = stones.get(s.id);
  if (old) {
    const ns = makeStone(f, s, old.body.position.x, old.body.position.y);
    Body.setAngle(ns.body, old.body.angle);
    ns.home = old.home;
    Object.assign(ns.disp, old.disp);
    if (old.gfx) old.gfx.remove();
    const inWorld = mode === "strata";
    removeStone(s.id);
    stones.set(s.id, ns);
    if (inWorld) Composite.add(engine.world, ns.body);
    else arrangeBins(false);
  }
  hideEdit();
  toast("Rewritten.");
}

/* ======================================================================
   Make: after a film
   ====================================================================== */
function makeFields() {
  const field = (el, size) => {
    el.style("position", "absolute");
    el.style("font-family", FONT);
    el.style("font-size", size + "px");
    el.style("font-weight", "500");
    el.style("color", INK);
    el.style("background", "transparent");
    el.style("border", "none");
    el.style("border-bottom", `1.5px solid ${INK}`);
    el.style("border-radius", "0");
    el.style("outline", "none");
    el.style("padding", "6px 0");
    el.style("box-sizing", "border-box");
    el.style("user-select", "text");
    el.style("-webkit-user-select", "text");
    el.hide();
    return el;
  };
  inTitle = field(createInput(""), 26);
  inTitle.attribute("placeholder", "Past Lives");
  inDir = field(createInput(""), 26);
  inDir.attribute("placeholder", "Celine Song");
  inYear = field(createInput(""), 26);
  inYear.attribute("placeholder", "2023");
  inYear.attribute("inputmode", "numeric");
  inYear.attribute("maxlength", "4");
  [inTitle, inDir, inYear].forEach((el) =>
    el.elt.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitFilm();
      }
    }),
  );

  taWrite = field(createElement("textarea"), 22);
  taWrite.attribute("rows", "3");
  taWrite.style("border", `1.5px solid ${INK}`);
  taWrite.style("background", PAPER);
  taWrite.style("padding", "12px");
  taWrite.style("resize", "none");

  taEdit = field(createElement("textarea"), 26);
  taEdit.style("padding", "10px");
  taEdit.style("resize", "none");
  taEdit.style("line-height", "1.15");
  taEdit.style("z-index", "5");
}

function openMake() {
  if (brushOn) setBrush(false);
  mk = { step: 1 };
  inTitle.value("");
  inDir.value("");
  inYear.value("");
  view = "make";
  layoutFields();
  inTitle.show();
  inDir.show();
  inYear.show();
  inTitle.elt.focus();
}

function closeMake() {
  [inTitle, inDir, inYear, taWrite].forEach((el) => el.hide());
  mk = null;
  view = "pile";
}

function formLayout() {
  const w = Math.min(width - 32, 640);
  const x = (width - w) / 2;
  const y = Math.max(110, height * 0.2);
  return { x, w, y };
}

function layoutFields() {
  const F = formLayout();
  inTitle.position(F.x, F.y + 130);
  inTitle.size(F.w, 46);
  const w1 = F.w * 0.64;
  inDir.position(F.x, F.y + 230);
  inDir.size(w1, 46);
  inYear.position(F.x + w1 + 20, F.y + 230);
  inYear.size(F.w - w1 - 20, 46);
}

function submitFilm() {
  if (!mk || mk.step !== 1) return;
  const title = inTitle.value().trim();
  if (!title) {
    inTitle.elt.focus();
    toast("Add the film title first.");
    return;
  }
  const newest = byNewest()[0];
  const col = newest
    ? PALETTE[
        (PALETTE.indexOf(newest.color) + 5 + Math.floor(random(3))) %
          PALETTE.length
      ]
    : PALETTE[0];
  const vtype = random(VTYPES);
  mk.film = {
    title,
    director: inDir.value().trim() || "Unknown director",
    year: parseInt(inYear.value(), 10) || new Date().getFullYear(),
    color: col,
    vtype,
  };
  mk.pieces = [vesselShape(vtype)];
  mk.step = 2;
  [inTitle, inDir, inYear].forEach((el) => {
    el.elt.blur();
    el.hide();
  });
}

function makeLayout() {
  const landscape = width > height * 1.05;
  if (landscape) {
    const vs = Math.min(width * 0.46, height - 170) / 440;
    return {
      landscape,
      vs,
      cx: 16 + width * 0.28,
      cy: 64 + (height - 64) / 2,
      sx: width * 0.57,
      sw: width * 0.43 - 24,
      sy: Math.max(120, height * 0.24),
    };
  }
  const vs = Math.min(width - 32, height * 0.42) / 440;
  const cy = 74 + 220 * vs;
  return {
    landscape,
    vs,
    cx: width / 2,
    cy,
    sx: 16,
    sw: width - 32,
    sy: cy + 220 * vs + 24,
  };
}
const toVessel = (L, x, y) => [
  (x - L.cx) / L.vs + 200,
  (y - L.cy) / L.vs + 200,
];
const fromVessel = (L, p) => [
  L.cx + (p[0] - 200) * L.vs,
  L.cy + (p[1] - 200) * L.vs,
];

function drawMake() {
  background(BG);
  // bar
  noStroke();
  fill(INK);
  textStyle(BOLD);
  textSize(15);
  textAlign(LEFT, CENTER);
  text("Cancel", 16, 32);
  buttons.push({ id: "mk:cancel", x: 6, y: 8, w: 80, h: 48 });
  fill(MUTE);
  textStyle(NORMAL);
  textAlign(RIGHT, CENTER);
  text(`${mk.step} / 3`, width - 16, 32);
  stroke(INK);
  strokeWeight(STROKE);
  line(16, 62, width - 16, 62);
  noStroke();

  if (mk.step === 1) {
    const F = formLayout();
    fill(MUTE);
    textStyle(BOLD);
    textSize(12);
    textAlign(LEFT, TOP);
    text("AFTER A FILM", F.x, F.y);
    fill(INK);
    textSize(constrain(width * 0.042, 30, 54));
    text("What did you just watch?", F.x, F.y + 26);
    fill(MUTE);
    textSize(12);
    text("TITLE", F.x, F.y + 112);
    text("DIRECTOR", F.x, F.y + 212);
    text("YEAR", F.x + F.w * 0.64 + 20, F.y + 212);
    drawButton("mk:continue", "Continue", F.x, F.y + 310, 130, 46, "ink");
    return;
  }

  const L = makeLayout();
  const f = mk.film;
  const n = mk.pieces.length;

  // the vessel and its pieces
  const fallT = mk.done ? constrain((millis() - mk.doneAt) / 750, 0, 1) : 0;
  mk.pieces.forEach((pc, i) => {
    const c = centroid(pc);
    const k = n > 1 ? 0.045 : 0;
    const moved = pc.map(([x, y]) => [
      x + (c[0] - 200) * k,
      y + (c[1] - 200) * k,
    ]);
    const mc = centroid(moved);
    const [mx, my] = fromVessel(L, mc);
    const fe = easeIn(constrain(fallT * 1.3 - i * 0.05, 0, 1));
    // the piece being written on grows a little; the others step back
    if (!mk.sc) mk.sc = [];
    const target = mk.step === 3 && !mk.done ? (i === mk.i ? 1.12 : 0.9) : 1;
    mk.sc[i] =
      mk.sc[i] === undefined ? 1 : mk.sc[i] + (target - mk.sc[i]) * 0.14;
    const sc = mk.sc[i];
    const lift = (sc - 1) * 0.9; // the grown piece also eases away from the centre
    push();
    translate(mx + (mx - L.cx) * lift, my + (my - L.cy) * lift + fe * height);
    rotate(fe * (i % 2 ? 0.8 : -0.8));
    scale(sc);
    const col = color(f.color);
    const written = mk.step === 3 && (mk.texts[i] || "").trim();
    if (mk.step === 3 && i !== mk.i && !written)
      col.setAlpha(map(sc, 0.9, 1.12, 70, 255, true));
    fill(col);
    stroke(BG);
    strokeWeight(3 / sc);
    strokeJoin(ROUND);
    beginShape();
    moved.forEach((p) => vertex((p[0] - mc[0]) * L.vs, (p[1] - mc[1]) * L.vs));
    endShape(CLOSE);
    if (written && i !== mk.i) {
      noStroke();
      fill(inkOn(f.color));
      textStyle(BOLD);
      textSize(12 / sc);
      textAlign(CENTER, CENTER);
      text(written.length > 16 ? written.slice(0, 15) + "…" : written, 0, 0);
    }
    pop();
  });

  if (mk.done) {
    if (fallT >= 1) finishMake();
    return;
  }

  // side panel
  let y = L.sy;
  const x = L.sx,
    w = L.sw;
  noStroke();
  textAlign(LEFT, TOP);
  if (mk.step === 2) {
    fill(MUTE);
    textStyle(BOLD);
    textSize(12);
    text(`${f.title} · ${f.director}, ${f.year}`.toUpperCase(), x, y);
    y += 26;
    fill(INK);
    textSize(constrain(width * 0.036, 26, 48));
    const qs = textSize();
    wrapLines(
      "Six months from now, what will you still remember?",
      w,
      qs,
      4,
    ).forEach((l) => {
      text(l, x, y);
      y += qs * 1.05;
    });
    y += 14;
    fill(MUTE);
    textStyle(NORMAL);
    textSize(15);
    wrapLines(
      "Tap the vessel to break it. Each piece holds one thing you'll keep.",
      w,
      15,
      3,
    ).forEach((l) => {
      text(l, x, y);
      y += 21;
    });
    y += 10;
    text(
      n < 2
        ? "Still whole. Tap to break it."
        : `${n} pieces · ${n} things to keep`,
      x,
      y,
    );
    y += 36;
    drawButton("mk:restart", "Start over", x, y, 120, 46, "ghost");
    drawButton(
      "mk:write",
      "Write on the pieces →",
      x + 130,
      y,
      200,
      46,
      "ink",
      n < 2,
    );
  } else if (mk.step === 3) {
    const P = PROMPTS[Math.min(mk.i, PROMPTS.length - 1)];
    fill(MUTE);
    textStyle(BOLD);
    textSize(12);
    text(`PIECE ${mk.i + 1} OF ${n} · ${P.kind.toUpperCase()}`, x, y);
    y += 26;
    fill(INK);
    textSize(constrain(width * 0.028, 22, 36));
    const qs = textSize();
    wrapLines(P.q, w, qs, 3).forEach((l) => {
      text(l, x, y);
      y += qs * 1.08;
    });
    y += 14;
    if (mk.taY !== Math.round(y) || mk.taX !== Math.round(x)) {
      mk.taY = Math.round(y);
      mk.taX = Math.round(x);
      taWrite.position(x, y);
      taWrite.size(w, 140);
    }
    y += 152;
    fill(MUTE);
    textStyle(NORMAL);
    textSize(14);
    text("Tap any piece to jump to it.", x, y);
    y += 30;
    drawButton("mk:skip", "Leave blank", x, y, 130, 46, "ghost");
    drawButton(
      "mk:next",
      mk.i === n - 1 ? "Leave it on the pile" : "Next piece",
      x + 140,
      y,
      mk.i === n - 1 ? 190 : 130,
      46,
      "ink",
    );
  }
}

function startWriting() {
  mk.pieces.sort((a, b) => area(b) - area(a));
  mk.sc = [];
  mk.texts = mk.pieces.map(() => "");
  mk.i = 0;
  mk.step = 3;
  showPiece();
}
function showPiece() {
  const P = PROMPTS[Math.min(mk.i, PROMPTS.length - 1)];
  taWrite.value(mk.texts[mk.i]);
  taWrite.attribute("placeholder", P.kind);
  mk.taY = null;
  taWrite.show();
  taWrite.elt.focus();
}
function storeText() {
  if (mk && mk.texts) mk.texts[mk.i] = taWrite.value();
}
function advance() {
  if (mk.i < mk.pieces.length - 1) {
    mk.i++;
    showPiece();
  } else finishWriting();
}
function finishWriting() {
  storeText();
  if (!mk.texts.some((t) => t.trim())) {
    toast(
      "Write on at least one piece. An empty vessel leaves nothing behind.",
    );
    return;
  }
  taWrite.elt.blur();
  taWrite.hide();
  mk.done = true;
  mk.doneAt = millis();
}
function finishMake() {
  const f = mk.film,
    id = "f" + Math.random().toString(36).slice(2, 10),
    now = Date.now();
  const film = {
    id,
    title: f.title,
    director: f.director,
    year: f.year,
    watched: now,
    color: f.color,
    vtype: f.vtype,
    sand: 0,
    shards: [],
    lost: [],
  };
  mk.pieces.forEach((pc, i) => {
    const t = mk.texts[i].trim();
    if (t)
      film.shards.push({
        id: id + "s" + i,
        text: t,
        kind: PROMPTS[Math.min(i, PROMPTS.length - 1)].kind,
        vpoly: roundP(pc),
        seen: now,
        brush: 0,
      });
    else film.lost.push(roundP(pc));
  });
  // everything already there sinks a little deeper
  films.forEach((x) =>
    x.shards.forEach((s) => {
      s.brush = Math.max(0, (s.brush || 0) - 0.02);
    }),
  );
  films.push(film);
  saveData();
  closeMake();
  const drop = () => {
    let t = frameCount + 4;
    film.shards.forEach((s) => {
      pourQueue.push({
        stone: makeStone(
          film,
          s,
          width / 2 + random(-width * 0.18, width * 0.18),
          -80 - random(60),
        ),
        at: t,
      });
      t += 8;
    });
  };
  followTop = true;
  if (mode !== "strata") {
    setMode("strata");
    setTimeout(drop, 1000);
  } else drop();
  toast(
    `${plural(film.shards.length, "fragment")} of ${film.title} left on the pile.`,
  );
}

/* ======================================================================
   Input
   ====================================================================== */
function hitButton(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

function onDown(e) {
  const x = e.clientX,
    y = e.clientY;
  Object.assign(ptr, {
    x,
    y,
    sx: x,
    sy: y,
    lastX: x,
    lastY: y,
    down: true,
    moved: 0,
    type: e.pointerType,
    seen: true,
  });
  ptr.downBtn = hitButton(x, y);
  if (ptr.downBtn) return;

  if (view === "pile" && brushOn) e.preventDefault();

  if (
    view === "recall" &&
    rc &&
    rc.phase === "open" &&
    rc.editing < 0 &&
    !rc.removing
  ) {
    setFocusFromPointer(x, y);
    const i = panelAt(x, y);
    if (i >= 0) startGrind(i, x, y);
  }

  if (view === "make" && mk && !mk.done) {
    const L = makeLayout();
    const p = toVessel(L, x, y);
    if (mk.step === 2) {
      if (mk.pieces.length >= MAX_PIECES) {
        toast("Eight pieces is as far as one film goes.");
        return;
      }
      crack(mk.pieces, p, Math.random);
    } else if (mk.step === 3) {
      const i = mk.pieces.findIndex((pc) => inside(pc, p));
      if (i >= 0 && i !== mk.i) {
        storeText();
        mk.i = i;
        showPiece();
      }
    }
  }
}

function onMove(e) {
  const x = e.clientX,
    y = e.clientY;
  const dist = Math.hypot(x - ptr.lastX, y - ptr.lastY);
  if (
    view === "pile" &&
    mode !== "strata" &&
    !brushOn &&
    ptr.down &&
    !ptr.downBtn
  ) {
    scrollX = constrain(scrollX - (x - ptr.lastX), 0, maxScroll);
    const dy = y - ptr.lastY;
    if (dy && binMin < 0) {
      binY = constrain(binY - dy, binMin, 0);
      binFollow = false;
    }
  }
  if (
    view === "pile" &&
    mode === "strata" &&
    !brushOn &&
    ptr.down &&
    !ptr.downBtn
  ) {
    const dy = y - ptr.lastY;
    if (Math.abs(dy) > 0) {
      scrollY = constrain(scrollY - dy, camTop(), 0);
      followTop = false;
    }
  }
  ptr.x = x;
  ptr.y = y;
  if (e.pointerType === "mouse") ptr.seen = true;
  if (ptr.down) ptr.moved += dist;
  ptr.lastX = x;
  ptr.lastY = y;

  if (view === "pile" && brushOn && ptr.down && !ptr.downBtn && dist > 1)
    brushAt(x, y, dist);

  if (view === "recall" && rc) {
    const g = rc.grind && rc.grind.active ? rc.grind : null;
    // once a fragment is cracking, stay on it; otherwise follow the finger across panels
    if (!(g && g.prog > 0.06) && (ptr.down || e.pointerType === "mouse"))
      setFocusFromPointer(x, y);
    if (g && ptr.down && !rc.removing) {
      const i = panelAt(x, y);
      if (i >= 0 && i !== g.i && g.prog < 0.06) startGrind(i, x, y);
      else rubGrind(x, y);
    }
  }
}

function onUp(e) {
  if (!ptr.down) return;
  ptr.down = false;
  const x = e.clientX,
    y = e.clientY;
  if (rc && rc.grind) rc.grind.active = false;
  if (e.pointerType !== "mouse" && brushOn) ptr.seen = false;
  if (brushOn) saveData();

  const up = hitButton(x, y);
  if (ptr.downBtn) {
    if (up === ptr.downBtn) onButton(up);
    ptr.downBtn = null;
    return;
  }

  if (view === "pile" && ptr.moved < 10) {
    const st = stoneAt(x + camX(), y + camY());
    if (!st) return;
    const [f, s] = findShard(st.sid);
    if (!f) return;
    const w = wear(f, s);
    if (brushOn && w > 0.15) {
      toast("Still buried. Keep brushing.");
      return;
    }
    if (!brushOn && w > 0.6) {
      toast("Buried too deep to read. Pick up the brush and rub it first.");
      return;
    }
    openRecall(f, s.id);
  }
}

function onButton(id) {
  if (id.startsWith("mode:")) {
    setMode(id.slice(5));
    return;
  }
  switch (id) {
    case "brush":
      setBrush(!brushOn);
      break;
    case "new":
      openMake();
      break;
    case "reset":
      if (millis() < resetArmedUntil) {
        resetArmedUntil = 0;
        films = seed();
        saveData();
        stones.forEach((st) => {
          Composite.remove(engine.world, st.body);
          if (st.gfx) st.gfx.remove();
        });
        stones.clear();
        sandBodies.forEach((g) => Composite.remove(engine.world, g));
        sandBodies = [];
        pourQueue = [];
        bins = [];
        mode = "strata";
        scrollX = 0;
        maxScroll = 0;
        scrollY = 0;
        followTop = true;
        pileTopSm = null;
        pourIn();
        toast("The demo pile is back.");
      } else resetArmedUntil = millis() + 3000;
      break;
    case "back":
      closeRecall();
      break;
    case "closeup":
      closeUp();
      break;
    case "vessel":
      breakOpen();
      break;
    case "edit":
      startEdit();
      break;
    case "ed:save":
      saveEdit();
      break;
    case "ed:cancel":
      hideEdit();
      break;
    case "mk:cancel":
      closeMake();
      break;
    case "mk:continue":
      submitFilm();
      break;
    case "mk:restart":
      mk.pieces = [vesselShape(mk.film.vtype)];
      break;
    case "mk:write":
      startWriting();
      break;
    case "mk:skip":
      taWrite.value("");
      storeText();
      advance();
      break;
    case "mk:next":
      storeText();
      advance();
      break;
  }
}

/* ======================================================================
   Toast
   ====================================================================== */
function toast(msg) {
  toastMsg = msg;
  toastUntil = millis() + 2800;
}
function drawToast() {
  if (millis() > toastUntil) return;
  const a = constrain((toastUntil - millis()) / 300, 0, 1);
  textStyle(NORMAL);
  textSize(14);
  const w = Math.min(textWidth(toastMsg) + 36, width - 32);
  const x = (width - w) / 2,
    y = height - 76;
  noStroke();
  const c = color(INK);
  c.setAlpha(255 * a);
  fill(c);
  rect(x, y, w, 44);
  const tc = color(BG);
  tc.setAlpha(255 * a);
  fill(tc);
  textAlign(CENTER, CENTER);
  text(fitText(toastMsg, w - 24), width / 2, y + 23);
}

/* ======================================================================
   Helpers: text, colour, geometry
   ====================================================================== */
const wrapCache = new Map();
function wrapLines(str, maxW, size, maxLines) {
  const key = `${str}|${Math.round(maxW)}|${size}|${maxLines}|${textStyle()}`;
  if (wrapCache.has(key)) return wrapCache.get(key);
  textSize(size);
  const lines = wrapWith((t) => textWidth(t), str, maxW, maxLines);
  if (wrapCache.size > 2000) wrapCache.clear();
  wrapCache.set(key, lines);
  return lines;
}
// same, measured on an offscreen graphics (its text size is already set)
function wrapLinesIn(g, str, maxW, maxLines) {
  return wrapWith((t) => g.textWidth(t), str, maxW, maxLines);
}
function wrapWith(measure, str, maxW, maxLines) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (measure(test) <= maxW || !cur) cur = test;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (last.length > 1 && measure(last + "…") > maxW)
      last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return lines;
}
function fitText(str, maxW) {
  if (textWidth(str) <= maxW) return str;
  let s = str;
  while (s.length > 1 && textWidth(s + "…") > maxW) s = s.slice(0, -1);
  return s + "…";
}
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

function hash(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function rng(seedVal) {
  let a = typeof seedVal === "string" ? hash(seedVal) : seedVal;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hexRgb = (h) => {
  h = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
function mixHex(a, b, t) {
  const A = hexRgb(a),
    B = hexRgb(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
}
function lum(h) {
  const [r, g, b] = hexRgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const inkOn = (h) => (lum(h) > 0.2 ? INK : PAPER);
function tones(base, n) {
  const steps = [0, 0.3, -0.24, 0.52, -0.4, 0.16, 0.68, -0.12];
  return Array.from({ length: n }, (_, i) => {
    const t = steps[i % steps.length];
    return t >= 0 ? mixHex(base, "#FFFFFF", t) : mixHex(base, INK, -t);
  });
}

// Vessels live in a 400 × 400 space.
function vesselShape(type) {
  const pts = [];
  if (type === "plate")
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push([200 + 168 * Math.cos(a), 200 + 168 * Math.sin(a)]);
    }
  else if (type === "jar")
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push([200 + 126 * Math.cos(a), 200 + 178 * Math.sin(a)]);
    }
  else if (type === "bowl") {
    for (let i = 0; i <= 32; i++) {
      const a = Math.PI - (i / 32) * Math.PI;
      pts.push([200 + 175 * Math.cos(a), 105 + 190 * Math.sin(a)]);
    }
  } else {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2,
        c = Math.cos(a),
        s = Math.sin(a);
      pts.push([
        200 + 160 * Math.sign(c) * Math.sqrt(Math.abs(c)),
        200 + 160 * Math.sign(s) * Math.sqrt(Math.abs(s)),
      ]);
    }
  }
  return pts;
}
function splitPoly(poly, p, ang) {
  const dx = Math.cos(ang),
    dy = Math.sin(ang);
  const side = (q) => (q[0] - p[0]) * dy - (q[1] - p[1]) * dx;
  const A = [],
    B = [];
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i],
      n = poly[(i + 1) % poly.length],
      sc = side(c),
      sn = side(n);
    if (sc >= 0) A.push(c);
    if (sc <= 0) B.push(c);
    if ((sc > 0 && sn < 0) || (sc < 0 && sn > 0)) {
      const t = sc / (sc - sn);
      const q = [c[0] + (n[0] - c[0]) * t, c[1] + (n[1] - c[1]) * t];
      A.push(q);
      B.push(q);
    }
  }
  return [A, B];
}
function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i],
      [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}
function centroid(poly) {
  let x = 0,
    y = 0;
  poly.forEach((p) => {
    x += p[0];
    y += p[1];
  });
  return [x / poly.length, y / poly.length];
}
function bbox(poly) {
  const xs = poly.map((p) => p[0]),
    ys = poly.map((p) => p[1]);
  return {
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}
function inside(poly, [x, y]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      c = !c;
  }
  return c;
}
function crack(pieces, p, r) {
  const i = pieces.findIndex((pc) => inside(pc, p));
  if (i < 0) return false;
  for (let k = 0; k < 10; k++) {
    const [A, B] = splitPoly(pieces[i], p, r() * Math.PI);
    if (A.length > 2 && B.length > 2 && area(A) > 1800 && area(B) > 1800) {
      pieces.splice(i, 1, A, B);
      return true;
    }
  }
  return false;
}
const roundP = (poly) =>
  poly.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
function shrinkPoly(poly, k) {
  const c = centroid(poly);
  return poly.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
}

// A chunky stone outline (unit box), readable enough to hold a line of text.
function chunky(r) {
  return [
    [r() * 0.12, r() * 0.28],
    [0.3 + r() * 0.3, r() * 0.1],
    [0.86 + r() * 0.14, r() * 0.2],
    [1, 0.38 + r() * 0.24],
    [0.86 + r() * 0.14, 0.82 + r() * 0.18],
    [0.38 + r() * 0.24, 0.9 + r() * 0.1],
    [r() * 0.14, 0.8 + r() * 0.2],
    [0, 0.34 + r() * 0.3],
  ];
}
function hull(pts) {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [],
    upper = [];
  for (const q of p) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0
    )
      lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0
    )
      upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
