/*
  소과제1 : Dynamic Balance
  ----------------------------------------------------
  - 시소 막대 5개(A~E, 사다리꼴): 스케치의 좌표/각도 그대로 항상 고정
    (Matter 물리로 실제 회전하지 않음 - isStatic 계속 유지). 공이 닿으면
    "회전"하는 게 아니라, 고정점을 축으로 아주 작게 "끄덕이는" 애니메이션만
    추가됨 (스프링-댐퍼로 계산, 순수 시각 효과).
  - 모빌(곡선 팔 + 원 4개)도 마찬가지로 물리 체인이 아니라 직접 계산.
    마지막 막대(E)가 끄덕일 때 그 힘을 로드로 전달받아 모빌도 살짝 흔들림.
  - 공은 여러 개가 시간차 + 랜덤 위치로, 5초 동안만 떨어짐. 막대는 항상
    고정된 지형이라 공이 그 위를 굴러 내려가는 핀볼/파칭코 방식.
  - 도형은 스트로크 없이 채우기만.

  ※ 1300x920 디자인 좌표계로 좌표를 잡고, 실제 창 크기에 맞춰
     X() / Y() / S() 로 스케일링합니다.
*/

const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Body = Matter.Body;
const Vector = Matter.Vector;
const Events = Matter.Events;

const DESIGN_W = 1300;
const DESIGN_H = 920;

let engine;
let s, ox, oy;

let planks = []; // A,B,C,D,E
let balls = [];
let nextSpawnAt = 0;

// ── 공 떨어뜨리기 설정 ─────────────────────────────────────────────────
const BALL_TOTAL = 40; // 총 몇 개를 떨어뜨릴지
const BALL_GAP_MIN = 800,
  BALL_GAP_MAX = 1500; // 다음 공까지 간격(ms). 한꺼번에 몰리지 않게 하나씩
const MAX_PILE = 14; // 바닥에 쌓여 있을 수 있는 공 수 (넘으면 가장 오래된 공부터 부드럽게 사라짐)
const POOL_HEIGHT = 70; // 바닥에서 이 높이(디자인 단위)까지를 '쌓이는 자리'로 봄
const IDLE_MS = 3500; // 이만큼 거의 안 움직이면 '멈춘 공'으로 봄
const FADE_MS = 700; // 사라지는 데 걸리는 시간
let ballsSpawned = 0;

// ── 물리 진행 (프레임 속도와 무관하게 실제 시간 기준) ───────────────────────
const GRAVITY = 1.0; // 중력 세기. 1이 기본값(처음부터 그대로). 더 빨리 떨어지게 하려면 올리기
const STEP_MS = 1000 / 60 / 8; // 물리를 한 번에 진행시키는 시간(고정, ≈2.08ms)
const TICK_MS = 1000 / 60; // 막대 끄덕임/모빌 흔들림 계산 주기(60Hz)
// ── 흔들림 세기 ────────────────────────────────────────────────────────
// 모빌 몸통, 가지 마디, 곁가지가 전부 이 값 하나에 비례해서 흔들림.
// 1 = 이전 버전의 흔들림 / 작을수록 덜 흔들림 (0이면 안 흔들림)
const SWAY = 0.5;
const KICK = 0.04; // 공이 막대를 가장 세게 칠 때 막대가 끄덕이는 정도
let physicsAcc = 0,
  tickAcc = 0;
let showFps = false; // F 키로 켜고 끔
let floorTopY = 0; // 바닥선 y(px) - 받침대 E 밑면에 맞춰 setup에서 정해짐
// 참고 작품(Contango)의 구슬에서 직접 잰 색 (빛 받은 부분 기준)
// 떨어지는 공과 모빌에 매달린 원이 모두 이 팔레트 하나를 씀
const PALETTE = {
  BLUE: [16, 74, 172], // 코발트 블루
  RED: [214, 68, 12], // 버밀리언
  YEL: [236, 180, 12], // 황금빛 노랑
  ORANGE: [232, 146, 52], // 수채화 살구 주황
  DARK: [34, 30, 30], // 검정
  STEEL: [190, 184, 198], // 은빛 라일락 회색
};
const ballColors = [
  PALETTE.BLUE,
  PALETTE.RED,
  PALETTE.YEL,
  PALETTE.ORANGE,
  PALETTE.DARK,
  PALETTE.STEEL,
];

// ---------- 모빌 (물리 체인 없이 직접 계산) ----------
const BEAM_LEN = 670;
const BEAM_W = 5; // 몸통 곡선과 아래 로드의 굵기를 똑같이
const TWIG_W = 1.5; // 모든 잔가지(가지, 하위 가지, 몸통 곁가지)의 굵기를 똑같이
const REST_ANGLE = (-8.0 * Math.PI) / 180;
let pivotWorldFixed;
let beamAngle;
let beamAngVel;

// ---------- 모빌 가지 (Calder 레퍼런스 느낌) ----------
// - 곡선 몸통 위 불규칙한 위치(t=0~1)에서 가지가 뻗어나감 (간격 균일하지 않게 일부는 몰려 있음)
// - 가지 끝에서 다시 가지가 갈라지는 계층 구조(children)
// - 끝에는 크기가 제각각인 원만 달림 (size 6 ~ 55)
// - bend: 막대를 살짝 휘게 (0이면 곧은 막대)
// dx, dy는 디자인 단위 벡터이며 몸통이 기울면 함께 회전함
const { RED, BLUE, YEL, ORANGE, DARK, STEEL } = PALETTE;

const BRANCHES = [
  // 몸통 시작점 근처에 짧게 솟은 안테나
  { t: 0.035, dx: -46, dy: -38, size: 8, col: DARK },
  // 왼쪽 끝: 스케치의 갈고리 두 개 (빨강 / 파랑) - 길이/휘어짐/붙는 위치를 다르게
  {
    t: 0.012,
    dx: -58,
    dy: 92,
    bend: 22,
    size: 26,
    col: RED,
    beads: [{ at: 0.55, size: 4.5, col: STEEL }],
  },
  { t: 0.085, dx: 26, dy: 52, bend: -10, size: 20, col: BLUE },
  // 위로 휘어 올라가는 노랑 (스케치)
  {
    t: 0.19,
    dx: -50,
    dy: -120,
    bend: 26,
    size: 30,
    col: YEL,
    beads: [{ at: 0.45, size: 4.5, col: DARK }],
  },
  // 몸통을 가로지르는 긴 막대 (한쪽은 길고 크게, 반대쪽은 짧고 작게 = 균형추)
  {
    t: 0.41,
    dx: 100,
    dy: -125,
    size: 22,
    col: RED,
    beads: [
      { at: 0.4, size: 5, col: STEEL },
      { at: 0.72, size: 4.5, col: BLUE },
    ],
    children: [{ dx: 42, dy: -16, size: 11, col: DARK }],
  },
  { t: 0.41, dx: -38, dy: 78, size: 17, col: BLUE },
  // 바로 옆에 바짝 붙은 짧은 가지
  { t: 0.47, dx: 8, dy: 46, size: 12, col: ORANGE },
  // 오른쪽으로 길게 내려가다 끝에서 아령처럼 두 갈래
  {
    t: 0.72,
    dx: 20,
    dy: 185,
    bend: -22,
    beads: [
      { at: 0.3, size: 5, col: RED },
      { at: 0.6, size: 5, col: DARK },
    ],
    children: [
      { dx: -48, dy: 30, size: 16, col: DARK },
      { dx: 44, dy: 24, size: 13, col: ORANGE },
    ],
  },
  { t: 0.62, dx: 6, dy: 85, size: 15, col: STEEL },
  {
    t: 0.86,
    dx: 14,
    dy: -80,
    bend: 20,
    size: 15,
    col: DARK,
    beads: [{ at: 0.6, size: 4, col: STEEL }],
  },
  // 팔 끝의 큰 빨간 원
  { t: 1.0, dx: 4, dy: 40, size: 55, col: RED },
];

// 몸통 곡선에 군데군데 솟은 아주 짧은 곁가지 + 작은 구슬 (왼쪽 사진의 S자 철사처럼)
// side: 1 = 위쪽, -1 = 아래쪽 / 위치는 일부러 불규칙하게, 두 개는 바짝 붙여둠
const BEAM_PERCHES = [
  { t: 0.14, len: 24, side: 1, size: 6, col: DARK },
  { t: 0.27, len: 34, side: 1, size: 7.5, col: ORANGE },
  { t: 0.33, len: 18, side: -1, size: 5, col: BLUE },
  { t: 0.54, len: 28, side: 1, size: 6, col: STEEL },
  { t: 0.575, len: 14, side: 1, size: 4.5, col: DARK },
  { t: 0.67, len: 26, side: -1, size: 6.5, col: BLUE },
  { t: 0.79, len: 22, side: 1, size: 6, col: DARK },
  { t: 0.92, len: 20, side: -1, size: 6, col: RED },
];

// ── 가지 = 여러 마디로 이어진 철사 ─────────────────────────────────────────
// 각 마디(관절)마다 따로 스프링이 달려 있어서, 몸통이 흔들리면 바깥쪽 마디일수록
// 늦게 / 다르게 휘어짐 (전에는 가지 전체가 곧은 막대 하나로 통째로 움직였음)
const JOINT_GAIN = 0.7; // 부모가 돌 때 이 마디가 뒤처지는 정도 (클수록 크게 흔들림)
const JOINT_GAIN_STEP = 0.18; // 바깥 마디일수록 더 크게
const JOINT_DAMP = 0.3; // 마디의 울림이 잦아드는 정도 (클수록 빨리 멈춤, 작을수록 오래 출렁)
const PERCH_GAIN = 1.6; // 몸통에 솟은 곁가지가 따라 흔들리는 정도
const JOINT_MAX = 0.22; // 마디 하나가 꺾일 수 있는 최대 각도(rad)

// 정지 상태의 곡선(bend 포함)을 K등분한 구간 벡터 (디자인 단위)
function restSegments(dx, dy, bend, K) {
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len,
    ny = dx / len;
  const c1 = { x: dx * 0.33 + nx * bend, y: dy * 0.33 + ny * bend };
  const c2 = { x: dx * 0.66 + nx * bend * 0.7, y: dy * 0.66 + ny * bend * 0.7 };
  const at = (u) => {
    const v = 1 - u;
    return {
      x: 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * dx,
      y: 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * dy,
    };
  };
  const segs = [];
  let prev = { x: 0, y: 0 };
  for (let i = 1; i <= K; i++) {
    const p = at(i / K);
    segs.push({ x: p.x - prev.x, y: p.y - prev.y });
    prev = p;
  }
  return segs;
}

function initBranchNode(node) {
  const len = Math.hypot(node.dx, node.dy);
  // 길수록 마디가 많음. 짧고 곧은 가지는 마디 1개
  const K = len < 55 && !node.bend ? 1 : len < 110 ? 2 : len < 160 ? 3 : 4;
  node.rest = restSegments(node.dx, node.dy, node.bend || 0, K);
  node.joints = [];
  for (let i = 0; i < K; i++) {
    node.joints.push({
      swing: 0,
      vel: 0,
      // 바깥 마디일수록 물렁하고, 마디마다 고유 진동수/감쇠가 조금씩 다름
      k: (0.055 - i * 0.008) * (0.8 + Math.random() * 0.4),
      c: JOINT_DAMP * (0.85 + Math.random() * 0.3),
      gain: (JOINT_GAIN + i * JOINT_GAIN_STEP) * (0.75 + Math.random() * 0.5),
    });
  }
  if (node.children) node.children.forEach(initBranchNode);
}
BRANCHES.forEach(initBranchNode);

// 몸통에 솟은 짧은 곁가지도 각자 따로 흔들리게
function initPerch(pc) {
  pc.swing = 0;
  pc.vel = 0;
  pc.k = 0.06 * (0.8 + Math.random() * 0.4);
  pc.c = JOINT_DAMP * (0.85 + Math.random() * 0.3);
  pc.gain = PERCH_GAIN * (0.75 + Math.random() * 0.5);
}
BEAM_PERCHES.forEach(initPerch);

function X(x) {
  return ox + x * s;
}
function Y(y) {
  return oy + y * s;
}
function S(v) {
  return v * s;
}

function rotVec(v, ang) {
  const c = Math.cos(ang),
    sn = Math.sin(ang);
  return { x: v.x * c - v.y * sn, y: v.x * sn + v.y * c };
}
function addVec(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}
function subVec(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

// 실제 모빌 팔 곡선(베지어) 위의 t지점(0~1) 좌표를 정확히 계산
function beamCurvePoint(t) {
  const p0 = pivotWorldFixed;
  const p3 = addVec(
    pivotWorldFixed,
    rotVec({ x: S(BEAM_LEN), y: 0 }, beamAngle),
  );
  const c1 = addVec(
    pivotWorldFixed,
    rotVec({ x: S(BEAM_LEN) * 0.25, y: -S(90) }, beamAngle),
  );
  const c2 = addVec(
    pivotWorldFixed,
    rotVec({ x: S(BEAM_LEN) * 0.75, y: -S(90) }, beamAngle),
  );
  const u = 1 - t;
  const x =
    u * u * u * p0.x +
    3 * u * u * t * c1.x +
    3 * u * t * t * c2.x +
    t * t * t * p3.x;
  const y =
    u * u * u * p0.y +
    3 * u * u * t * c1.y +
    3 * u * t * t * c2.y +
    t * t * t * p3.y;
  return { x, y };
}

function pivotToWorld(offDesign) {
  return addVec(
    pivotWorldFixed,
    rotVec({ x: S(offDesign.x), y: S(offDesign.y) }, beamAngle),
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  s = min(width / DESIGN_W, height / DESIGN_H);
  ox = (width - DESIGN_W * s) / 2;
  oy = (height - DESIGN_H * s) / 2;

  engine = Engine.create();
  // 중력은 처음부터 기본값(1)이었음. 세기만 GRAVITY로 조절할 수 있게 함
  const gravityObj = engine.gravity || engine.world.gravity;
  gravityObj.y = 1;
  gravityObj.scale = 0.001 * GRAVITY;

  pivotWorldFixed = { x: X(458), y: Y(300) };
  beamAngle = REST_ANGLE;
  beamAngVel = 0;

  // ---------- Walls (천장 없음, 바닥은 막대들을 만든 뒤에 아래에서 추가) ----------
  let margin = 20;
  Composite.add(engine.world, [
    Bodies.rectangle(margin, height / 2, margin * 2, height, {
      isStatic: true,
    }),
    Bodies.rectangle(width - margin, height / 2, margin * 2, height, {
      isStatic: true,
    }),
  ]);

  // ---------- 시소 막대 5개 (사다리꼴, A~E) - 항상 고정된 지형 ----------
  // P1(고정점)-P2(자유단) 두 끝점으로 직접 막대를 정의
  function makeTaperedPlankSeg(x1, y1, x2, y2, thick, thin) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const cx = (x1 + x2) / 2,
      cy = (y1 + y2) / 2;
    return makeTaperedPlank(cx, cy, len, angleDeg, -1, thick, thin); // pinSide -1 = P1쪽
  }

  function makeTaperedPlank(cx, cy, len, angleDeg, pinSide, thick, thin) {
    const halfLen = len / 2;
    const hNeg = pinSide === -1 ? thin : thick;
    const hPos = pinSide === 1 ? thin : thick;
    const verts = [
      { x: -S(halfLen), y: -S(hNeg / 2) },
      { x: S(halfLen), y: -S(hPos / 2) },
      { x: S(halfLen), y: S(hPos / 2) },
      { x: -S(halfLen), y: S(hNeg / 2) },
    ];
    const b = Bodies.fromVertices(
      X(cx),
      Y(cy),
      [verts],
      {
        friction: 0.9,
        restitution: 0.01,
      },
      true,
    );
    Body.setAngle(b, radians(angleDeg));
    Body.setStatic(b, true); // 항상 고정 (물리적으로 절대 안 돌아감)

    const negMid = Vector.mult(Vector.add(b.vertices[0], b.vertices[3]), 0.5);
    const posMid = Vector.mult(Vector.add(b.vertices[1], b.vertices[2]), 0.5);
    const pinWorldPt = pinSide === -1 ? negMid : posMid;
    const farWorldPt = pinSide === -1 ? posMid : negMid; // 공이 닿아 "끄덕이는" 쪽

    // 킥(끄덕임) 방향을 "항상 far쪽이 아래로 내려가도록" 자동 계산
    const testRel = subVec(farWorldPt, pinWorldPt);
    const testRot = rotVec(testRel, 0.05);
    const testPt = addVec(pinWorldPt, testRot);
    const kickSign = testPt.y > farWorldPt.y ? 1 : -1;

    // 로드 끝: far 끝면 중앙에서 몸체 안쪽으로 30만큼 들어간 중심선 위의 점
    const inX = pinWorldPt.x - farWorldPt.x,
      inY = pinWorldPt.y - farWorldPt.y;
    const inL = Math.hypot(inX, inY) || 1;
    const rodAnchor = {
      x: farWorldPt.x + (inX / inL) * S(30),
      y: farWorldPt.y + (inY / inL) * S(30),
    };

    Composite.add(engine.world, b); // 실제 충돌 계산에 포함시킴 (이게 빠져있었음!)

    return {
      body: b,
      pinWorldPt: { x: pinWorldPt.x, y: pinWorldPt.y },
      farWorldPt: { x: farWorldPt.x, y: farWorldPt.y },
      kickSign,
      rodAnchor, // 로드가 꽂히는 지점 (몸체 안쪽이라 끝이 삐져나오지 않음)
      angleOffset: 0,
      angleVel: 0, // 끄덕임 애니메이션 상태
    };
  }

  // 스케치의 각 막대를 있는 그대로: 서로 떨어진 별개의 조각 (화살표는 순서
  // 표시일 뿐 물리적으로 이어져있지 않음)
  const THICK = 40,
    THIN = 22;
  planks = [
    makeTaperedPlank(760, 340, 200, -25, 1, THICK, THIN), // A (오른쪽 위 -> 왼쪽 아래로 경사, B쪽으로 굴러감)
    makeTaperedPlank(590, 460, 200, 25, -1, THICK, THIN), // B (왼쪽 위 -> 오른쪽 아래로 경사, C쪽으로 굴러감)
    makeTaperedPlank(760, 580, 200, -15, 1, THICK, THIN), // C (D쪽, 왼쪽으로 경사)
    makeTaperedPlank(590, 700, 200, 40, -1, THICK, THIN), // D (C와 대칭, 오른쪽 아래로 경사)
    makeTaperedPlank(600, 820, 420, 15, -1, THICK, THIN), // E (스탠드 받침대처럼 길고 완만하게)
  ];

  // 바닥: 받침대(E) 밑면의 가장 낮은 점에 딱 맞춤 -> 공이 쉬는 선과 받침대가 어긋나지 않음
  const lowestY = Math.max(
    ...planks.flatMap((p) => p.body.vertices.map((v) => v.y)),
  );
  Composite.add(
    engine.world,
    Bodies.rectangle(width / 2, lowestY + 100, width, 200, {
      isStatic: true,
      friction: 0.8,
    }),
  );
  floorTopY = lowestY;

  // E는 길어서 끄덕이면 끝이 크게 움직이므로, 끝이 바닥 아래로 꺼지지 않게 끄덕임 폭을 제한
  // (모빌을 흔드는 힘은 각속도(angleVel)로 전달되므로 영향 없음)
  {
    const Ep = planks[planks.length - 1];
    const reach = Math.max(
      ...Ep.body.vertices.map((v) =>
        Math.hypot(v.x - Ep.pinWorldPt.x, v.y - Ep.pinWorldPt.y),
      ),
    );
    Ep.maxOffset = S(6) / reach;
  }

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      kickIfPlank(pair.bodyA, pair.bodyB);
      kickIfPlank(pair.bodyB, pair.bodyA);
    }
  });

  nextSpawnAt = millis() + random(300, 900);
}

// mover(공)가 target(막대)에 닿으면 그 막대에 작은 "끄덕임" 충격을 줌
function kickIfPlank(mover, target) {
  const p = planks.find((pl) => pl.body === target);
  if (!p) return;
  if (mover.isStatic) return; // 공만 트리거 (막대끼리는 무시)
  // 부딪히는 속도(px/ms)에 비례해서 끄덕임: 위에서 떨어져 세게 부딪힐 때는 크게,
  // 바닥에 쌓인 공들이 살짝 스치는 정도(느린 접촉)에는 거의 안 흔들림
  const prev = mover.positionPrev || mover.position;
  const v =
    Math.hypot(mover.position.x - prev.x, mover.position.y - prev.y) / STEP_MS;
  const impact = constrain((v - 0.05) / 0.4, 0, 1);
  p.angleVel += KICK * impact * p.kickSign; // 항상 far쪽이 아래로 살짝 눌리는 방향으로
}

function spawnBall() {
  // 막대 사이 가장 좁은 통로(B~C)가 61.6이라, 지름 40 이하로 두어야 병목이 안 생김
  const r = random(11, 20);
  const bx = X(random(700, 820));
  const by = Y(-80);
  const col = random(ballColors);
  const b = Bodies.circle(bx, by, S(r), {
    density: 0.005,
    friction: 0.6,
    restitution: 0.05,
  });
  b.renderColor = col;
  b.spawnedAt = millis();
  b.refX = bx;
  b.refY = by; // 마지막으로 '움직였다'고 인정된 위치
  b.idleSince = millis(); // 그 위치에서 가만히 있기 시작한 시각
  b.fading = false;
  b.fadeStart = 0;
  Composite.add(engine.world, b);
  balls.push(b);
}

// 공이 많이 떨어져도 바닥에 쌓인 공이 받침대 위로 차올라 정체되지 않도록 정리
//  1) 바닥 근처(쌓이는 자리)보다 높은 곳에서 멈춘 공 = 막대/더미 위에 걸린 공 -> 흐름을 막으니 사라짐
//  2) 바닥에 쌓인 공이 MAX_PILE을 넘으면 가장 오래된 (멈춘) 공부터 사라짐
function cullBalls(now) {
  const poolY = floorTopY - S(POOL_HEIGHT);
  // '멈춘 공' 판정: 엔진 속도값(버전마다 단위가 다름) 대신 실제 위치 변화로 판단
  // -> 마지막 기준 위치에서 2px 넘게 움직였으면 새 기준으로 삼고, 아니면 계속 가만히 있는 것
  for (const b of balls) {
    if (b.fading) continue;
    if (Math.hypot(b.position.x - b.refX, b.position.y - b.refY) > S(2)) {
      b.refX = b.position.x;
      b.refY = b.position.y;
      b.idleSince = now;
    }
  }
  const isSettled = (b) => now - b.idleSince > IDLE_MS;
  for (const b of balls) {
    if (!b.fading && isSettled(b) && b.position.y < poolY) {
      b.fading = true;
      b.fadeStart = now;
    }
  }
  const pile = balls
    .filter((b) => !b.fading && b.position.y >= poolY)
    .sort((a, b) => a.spawnedAt - b.spawnedAt);
  let excess = pile.length - MAX_PILE;
  for (const b of pile) {
    if (excess <= 0) break;
    if (isSettled(b)) {
      b.fading = true;
      b.fadeStart = now;
      excess--;
    }
  }
}

function clampSpeed(body, maxSpeed) {
  const v = body.velocity;
  const speed = Math.hypot(v.x, v.y);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    Body.setVelocity(body, { x: v.x * scale, y: v.y * scale });
  }
}

// 막대들의 "끄덕임" 스프링 업데이트 (아주 작은 범위로 제한)
function updatePlankWobble() {
  const k = 0.05,
    c = 0.25;
  for (const p of planks) {
    p.angleVel += -k * p.angleOffset - c * p.angleVel;
    p.angleVel = constrain(p.angleVel, -0.06, 0.06);
    p.angleOffset += p.angleVel;
    p.angleOffset = constrain(p.angleOffset, -0.12, 0.12); // 아주 작은 각도만 허용 (계산용)
  }
}

// 모빌 스프링-댐퍼: 마지막 막대(E)의 끄덕임 속도를 입력으로 받음
function updateMobile() {
  const E = planks[planks.length - 1];
  const driveTorque = E.angleVel * 0.3 * SWAY;
  const k = 0.02,
    c = 0.18;
  beamAngVel += driveTorque - k * (beamAngle - REST_ANGLE) - c * beamAngVel;
  beamAngVel = constrain(beamAngVel, -0.015, 0.015);
  beamAngle += beamAngVel;
  beamAngle = constrain(beamAngle, REST_ANGLE - 0.15, REST_ANGLE + 0.15);

  // 가지들은 몸통이 흔들리면 마디마다 다르게 늦게 따라 흔들림
  for (const br of BRANCHES) updateBranchNode(br, beamAngVel);
  for (const pc of BEAM_PERCHES) {
    pc.vel += -pc.k * pc.swing - pc.c * pc.vel - beamAngVel * pc.gain;
    pc.vel = constrain(pc.vel, -0.03, 0.03);
    pc.swing += pc.vel;
    pc.swing = constrain(pc.swing, -0.4, 0.4);
  }
}

// parentAngVel: 이 가지가 붙은 곳(몸통 또는 부모 가지 끝)의 현재 각속도
// 마디를 지날 때마다 그 마디까지 누적된 각속도를 다음 마디가 받음 -> 채찍처럼 뒤로 갈수록 늦게 반응
function updateBranchNode(node, parentAngVel) {
  let carried = parentAngVel;
  for (const j of node.joints) {
    j.vel += -j.k * j.swing - j.c * j.vel - carried * j.gain;
    j.vel = constrain(j.vel, -0.03, 0.03);
    j.swing += j.vel;
    j.swing = constrain(j.swing, -JOINT_MAX, JOINT_MAX);
    carried += j.vel;
  }
  if (node.children)
    node.children.forEach((ch) => updateBranchNode(ch, carried));
}

function draw() {
  const now = millis();
  if (ballsSpawned < BALL_TOTAL && now > nextSpawnAt) {
    spawnBall();
    ballsSpawned++;
    nextSpawnAt = now + random(BALL_GAP_MIN, BALL_GAP_MAX);
  }

  // 물리를 '실제로 지난 시간'만큼 진행: 브라우저가 60프레임을 못 채워도 공이 떨어지는 속도는 그대로
  // (예전엔 프레임마다 고정량만 진행해서, FPS가 떨어지면 모든 게 슬로모션처럼 느려졌음)
  const frameMs = Math.min(deltaTime || 16.7, 100);
  physicsAcc += frameMs;
  let steps = 0;
  while (physicsAcc >= STEP_MS && steps < 60) {
    Engine.update(engine, STEP_MS);
    for (const b of balls) clampSpeed(b, S(16));
    physicsAcc -= STEP_MS;
    steps++;
  }
  if (steps === 60) physicsAcc = 0; // 너무 밀렸으면 따라잡기를 포기 (끝없이 밀리는 것 방지)

  // 막대 끄덕임, 모빌/가지 흔들림도 60Hz 기준으로 진행 (프레임이 느려도 같은 속도)
  tickAcc += frameMs;
  let ticks = 0;
  while (tickAcc >= TICK_MS && ticks < 6) {
    updatePlankWobble();
    updateMobile();
    tickAcc -= TICK_MS;
    ticks++;
  }
  if (ticks === 6) tickAcc = 0;

  background(243, 236, 222); // 살짝 베이지

  cullBalls(now);
  balls = balls.filter((b) => {
    const gone =
      b.position.y > height + 100 || (b.fading && now - b.fadeStart > FADE_MS);
    if (gone) Composite.remove(engine.world, b);
    return !gone;
  });

  // ---- 모빌 ----
  const E = planks[planks.length - 1];
  const rodBottom = kickedPoint(E, E.rodAnchor); // 몸체 안쪽 지점 -> E가 위에 덮여서 완벽히 겹쳐 보임
  // 로드: 곡선의 몸통(pivot, = ring)에서 정확히 시작해서 막대까지 이어짐
  stroke(20);
  strokeWeight(S(BEAM_W));
  noFill();
  line(pivotWorldFixed.x, pivotWorldFixed.y, rodBottom.x, rodBottom.y);

  // 곡선 모빌 팔 (몸통)
  drawCurvedBeamProc(
    pivotWorldFixed,
    beamAngle,
    BEAM_LEN,
    S(90),
    S(BEAM_W),
    color(20),
  );
  drawJoint(pivotWorldFixed, S(11), color(20));

  // 몸통에 솟은 짧은 곁가지 + 구슬
  for (const pc of BEAM_PERCHES) {
    const p = beamCurvePoint(pc.t);
    const pa = beamCurvePoint(Math.max(0, pc.t - 0.003));
    const pb = beamCurvePoint(Math.min(1, pc.t + 0.003));
    const tx = pb.x - pa.x,
      ty = pb.y - pa.y;
    const tl = Math.hypot(tx, ty) || 1;
    const v = rotVec(
      {
        x: (ty / tl) * pc.side * S(pc.len),
        y: (-tx / tl) * pc.side * S(pc.len),
      },
      pc.swing,
    );
    const tip = { x: p.x + v.x, y: p.y + v.y };
    stroke(20);
    strokeWeight(S(TWIG_W));
    noFill();
    line(p.x, p.y, tip.x, tip.y);
    drawCircleAt(tip, S(pc.size), color(pc.col[0], pc.col[1], pc.col[2]));
  }

  // 가지들: 몸통 위 불규칙한 지점에서 뻗어나가고, 끝에서 다시 갈라짐
  for (const br of BRANCHES) {
    renderBranchNode(beamCurvePoint(br.t), br, beamAngle, 0);
  }

  // ---- 시소 막대들 (고정된 모양 + 작은 끄덕임만 시각적으로 추가) ----
  for (const p of planks) {
    drawWobblePlank(p, color(30));
  }

  // ---- FPS (F 키) ----
  if (showFps) {
    push();
    noStroke();
    fill(20);
    textSize(14);
    text(Math.round(frameRate()) + " fps", 12, 22);
    pop();
  }

  // ---- 공들 ----
  for (const b of balls) {
    const c = b.renderColor || [220, 60, 40];
    const alpha = b.fading
      ? 255 * Math.max(0, 1 - (now - b.fadeStart) / FADE_MS)
      : 255;
    drawCircleBody(b, color(c[0], c[1], c[2], alpha));
  }
}

// F 키: 왼쪽 위에 현재 FPS 표시 (60에 가까우면 정상, 많이 낮으면 화면이 느려서 슬로모션처럼 보이는 것)
function keyPressed() {
  if (key === "f" || key === "F") showFps = !showFps;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// pin 점을 축으로 angleOffset만큼 회전시킨 점 (순수 시각 효과)
function kickedPoint(p, worldPt) {
  const rel = subVec(worldPt, p.pinWorldPt);
  // 그릴 때만 폭을 제한 (E처럼 긴 막대의 끝이 바닥 아래로 꺼지지 않게). 계산 값은 그대로 둠
  const lim = p.maxOffset !== undefined ? p.maxOffset : 0.12;
  const rotated = rotVec(rel, constrain(p.angleOffset, -lim, lim));
  return addVec(p.pinWorldPt, rotated);
}

// ---------- 그리기 헬퍼 ----------
// 곡선 몸통의 한 지점(from)에서 원(to)까지, Calder 모빌처럼 동그랗게
// 루프를 그리며 뻗어나가는 가지
function drawBranch(from, to, bend) {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  // 루프의 정점(peak): from에서 진행방향에 수직으로 bend만큼 튀어나온 지점
  const nx = -dy / (dist || 1),
    ny = dx / (dist || 1);
  const peak = {
    x: from.x + dx * 0.35 + nx * bend,
    y: from.y + dy * 0.35 + ny * bend,
  };
  const c1 = { x: from.x + nx * bend * 0.7, y: from.y + ny * bend * 0.7 };
  const c2 = { x: peak.x + dx * 0.15, y: peak.y + dy * 0.15 };
  push();
  noFill();
  bezier(from.x, from.y, c1.x, c1.y, c2.x, c2.y, peak.x, peak.y);
  bezier(
    peak.x,
    peak.y,
    peak.x + dx * 0.25,
    peak.y + dy * 0.25,
    to.x - dx * 0.1,
    to.y - dy * 0.1,
    to.x,
    to.y,
  );
  pop();
}

function drawCurvedBeamProc(pivot, angle, len, bulge, weight, col) {
  const p0 = pivot;
  const p3 = addVec(pivot, rotVec({ x: S(len), y: 0 }, angle));
  const c1 = addVec(pivot, rotVec({ x: S(len) * 0.25, y: -bulge }, angle));
  const c2 = addVec(pivot, rotVec({ x: S(len) * 0.75, y: -bulge }, angle));
  push();
  noFill();
  stroke(col);
  strokeWeight(weight);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  bezier(p0.x, p0.y, c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
  pop();
}

function drawWobblePlank(p, col) {
  push();
  noStroke();
  fill(col);
  beginShape();
  for (const v of p.body.vertices) {
    const kv = kickedPoint(p, v);
    vertex(kv.x, kv.y);
  }
  endShape(CLOSE);
  pop();
}

function drawJoint(pos, r, col) {
  push();
  noStroke();
  fill(col);
  ellipse(pos.x, pos.y, r * 2, r * 2);
  pop();
}

// 마디마다 각자 꺾인 상태의 점들 (몸통 각도 baseAngle에서 시작, 마디마다 swing이 누적됨)
function branchPoints(from, node, baseAngle) {
  const pts = [from];
  let ang = baseAngle,
    p = from;
  for (let i = 0; i < node.rest.length; i++) {
    ang += node.joints[i].swing;
    p = addVec(p, rotVec({ x: S(node.rest[i].x), y: S(node.rest[i].y) }, ang));
    pts.push(p);
  }
  return { pts, endAngle: ang };
}

// 마디 점들을 부드러운 곡선(Catmull-Rom)으로 촘촘히 샘플링. 점이 2개면 그대로 직선
function smoothWire(pts) {
  const n = pts.length;
  if (n < 3) return pts;
  const out = [],
    STEPS = 8;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < STEPS; k++) {
      const t = k / STEPS,
        t2 = t * t,
        t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(pts[n - 1]);
  return out;
}

function drawWire(dense) {
  push();
  noFill();
  strokeJoin(ROUND);
  strokeCap(ROUND);
  beginShape();
  for (const p of dense) vertex(p.x, p.y);
  endShape();
  pop();
}

// 철사 위 u지점(0~1, 길이 기준) 좌표 - 구슬을 철사에 정확히 꿰기 위해 사용
function pointAlong(dense, u) {
  let total = 0;
  for (let i = 1; i < dense.length; i++)
    total += Math.hypot(
      dense[i].x - dense[i - 1].x,
      dense[i].y - dense[i - 1].y,
    );
  let target = total * u,
    acc = 0;
  for (let i = 1; i < dense.length; i++) {
    const seg = Math.hypot(
      dense[i].x - dense[i - 1].x,
      dense[i].y - dense[i - 1].y,
    );
    if (acc + seg >= target && seg > 0) {
      const f = (target - acc) / seg;
      return {
        x: dense[i - 1].x + (dense[i].x - dense[i - 1].x) * f,
        y: dense[i - 1].y + (dense[i].y - dense[i - 1].y) * f,
      };
    }
    acc += seg;
  }
  return dense[dense.length - 1];
}

// 가지 하나(와 그 끝에서 갈라진 하위 가지들)를 재귀적으로 그림
function renderBranchNode(from, node, baseAngle, depth) {
  const { pts, endAngle } = branchPoints(from, node, baseAngle);
  const dense = smoothWire(pts);
  stroke(20);
  strokeWeight(S(TWIG_W));
  noFill();
  drawWire(dense);
  if (node.beads) {
    for (const bd of node.beads) {
      drawCircleAt(
        pointAlong(dense, bd.at),
        S(bd.size),
        color(bd.col[0], bd.col[1], bd.col[2]),
      );
    }
  }
  const tip = pts[pts.length - 1];
  if (node.children) {
    for (const ch of node.children)
      renderBranchNode(tip, ch, endAngle, depth + 1);
  }
  if (node.size) {
    drawCircleAt(
      tip,
      S(node.size),
      color(node.col[0], node.col[1], node.col[2]),
    );
  }
}

function drawEllipseAt(pos, w, h, rotDeg, col) {
  push();
  translate(pos.x, pos.y);
  rotate(radians(rotDeg));
  noStroke();
  fill(col);
  ellipse(0, 0, w, h);
  pop();
}

function drawTriangleAt(pos, size, rotDeg, col) {
  push();
  translate(pos.x, pos.y);
  rotate(radians(rotDeg));
  noStroke();
  fill(col);
  triangle(-size * 0.6, size * 0.5, size * 0.6, size * 0.5, 0, -size * 0.6);
  pop();
}

function drawCircleAt(pos, r, col) {
  push();
  noStroke();
  fill(col);
  ellipse(pos.x, pos.y, r * 2, r * 2);
  pop();
}

function drawCircleBody(body, fillCol) {
  push();
  translate(body.position.x, body.position.y);
  noStroke();
  fill(fillCol);
  ellipse(0, 0, body.circleRadius * 2, body.circleRadius * 2);
  pop();
}
