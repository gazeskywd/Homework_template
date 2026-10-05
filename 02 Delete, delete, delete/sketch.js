// =====================================================
// Delete, Delete, Delete — Stars
// 01 TOUCH (Tap) → 02 TIME (Hold) → 03 RELATION (Drag)
// 화면의 별을 모두 지우면 다음 단계로 넘어간다
// =====================================================

const Engine = Matter.Engine;
const Composite = Matter.Composite;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;

let stars = [];
let meteors = [];
let dusts = [];
let rings = [];
let constellations = [];

// 단계별 설정
const LEVELS = [
  {
    num: "01",
    title: "TOUCH",
    copy: "Tap to burst.",
    hint: "tap a star",
    count: 28,
  },
  {
    num: "02",
    title: "TIME",
    copy: "Hold to let it fade.",
    hint: "hold until the light is gone",
    count: 16,
  },
  {
    num: "03",
    title: "RELATION",
    copy: "Connect them. Let them go.",
    hint: "link 3+ stars and return to the first",
    count: 22,
  },
];
let level = 0;

// 화면 상태: "in"(등장) → "play" → "clear" → "out"(전환)
let state = "in";
let stateStart = 0;

let holdStar = null; // 02 TIME: 지금 누르고 있는 별
let chain = []; // 03 RELATION: 지금 연결 중인 별들
let linkRange; // 03 RELATION: 연결 가능한 거리 (조건)

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Helvetica Neue, Helvetica, Arial, sans-serif");
  engine = Engine.create();
  engine.gravity.y = 0.5; // 유성이 포물선을 그리며 떨어지도록
  startLevel(0);
}

// -----------------------------------------------------
// 단계 시작
// -----------------------------------------------------
function startLevel(n) {
  level = n;
  for (let m of meteors) Composite.remove(engine.world, m.body);
  stars = [];
  meteors = [];
  dusts = [];
  rings = [];
  constellations = [];
  chain = [];
  holdStar = null;
  linkRange = min(width, height) * 0.3;
  spawnStars(LEVELS[n].count);
  setState("in");
}

function setState(s) {
  state = s;
  stateStart = millis();
}

// 별끼리 너무 붙지 않게, 글자 영역은 피해서 배치
function spawnStars(count) {
  const margin = 40;
  const minD = sqrt((width * height) / count) * 0.55;
  let tries = 0;
  while (stars.length < count && tries < 3000) {
    tries++;
    const x = random(margin, width - margin);
    const y = random(margin, height - 90);
    if (x < min(400, width * 0.85) && y < 150) continue; // 왼쪽 위 글자 영역
    let ok = true;
    for (let s of stars) {
      if (dist(x, y, s.baseX, s.baseY) < minD) {
        ok = false;
        break;
      }
    }
    if (ok) stars.push(new Star(x, y));
  }
}

// -----------------------------------------------------
// draw
// -----------------------------------------------------
function draw() {
  Engine.update(engine);
  drawBackground();

  // 빛은 더해지도록 ADD 블렌드
  blendMode(ADD);

  for (let c of constellations) {
    c.update();
    c.display();
  }
  if (level === 2) drawChain();

  for (let s of stars) {
    s.update();
    s.display();
  }
  for (let r of rings) {
    r.update();
    r.display();
  }
  for (let d of dusts) {
    d.update();
    d.display();
  }
  for (let m of meteors) {
    m.update();
    m.display();
    m.checkDeath();
  }

  blendMode(BLEND);

  // 지울 것들 정리 (배열에서 지울 땐 뒤에서부터)
  for (let i = stars.length - 1; i >= 0; i--) {
    if (stars[i].toDelete) {
      if (stars[i] === holdStar) holdStar = null;
      stars.splice(i, 1);
    }
  }
  for (let i = meteors.length - 1; i >= 0; i--)
    if (meteors[i].death) meteors.splice(i, 1);
  for (let i = dusts.length - 1; i >= 0; i--)
    if (dusts[i].isDead()) dusts.splice(i, 1);
  for (let i = rings.length - 1; i >= 0; i--)
    if (rings[i].isDead()) rings.splice(i, 1);
  for (let i = constellations.length - 1; i >= 0; i--)
    if (constellations[i].done) constellations.splice(i, 1);

  // 03 RELATION: 별이 2개 이하로 남으면 별자리를 만들 수 없으니 스스로 사라진다
  if (
    level === 2 &&
    state === "play" &&
    chain.length === 0 &&
    constellations.length === 0 &&
    stars.length > 0 &&
    stars.length < 3
  ) {
    for (let s of stars) s.fadingAlone = true;
  }

  updateState();
  drawUI();
}

function drawBackground() {
  // 캔버스를 투명하게 지움 → 뒤에 깔린 CSS 배경(bg.png)이 보인다
  // (p5의 loadImage는 file://로 열면 막히지만, CSS 배경은 잘 나온다)
  clear();
  // 단계가 올라갈수록 조금씩 어두워진다 → Infinity Room의 어둠으로
  noStroke();
  fill(2, 10, 18, [0, 50, 100][level]);
  rect(0, 0, width, height);
}

// 03 RELATION: 연결 중인 선 그리기
function drawChain() {
  if (chain.length === 0) return;
  const last = chain[chain.length - 1];

  // 연결 가능 범위 (조건을 눈으로 보여줌)
  noFill();
  stroke(255, 18);
  strokeWeight(1);
  circle(last.x, last.y, linkRange * 2);

  // 이어진 선
  stroke(255, 230, 190, 200);
  strokeWeight(1.3);
  for (let i = 1; i < chain.length; i++) {
    line(chain[i - 1].x, chain[i - 1].y, chain[i].x, chain[i].y);
  }

  // 손가락까지 이어지는 점선
  const inRange = dist(mouseX, mouseY, last.x, last.y) < linkRange;
  drawingContext.setLineDash([4, 6]);
  stroke(255, inRange ? 150 : 50);
  line(last.x, last.y, mouseX, mouseY);
  drawingContext.setLineDash([]);

  // 3개 이상이면 첫 별이 깜빡이며 "여기로 돌아와"라고 알려줌
  if (chain.length >= 3) {
    const f = chain[0];
    const p = 0.5 + 0.5 * sin(frameCount * 0.2);
    stroke(255, 240, 200, 120 + 120 * p);
    strokeWeight(1.5);
    circle(f.x, f.y, 30 + 10 * p);
  }
}

// -----------------------------------------------------
// 화면 상태 / 전환
// -----------------------------------------------------
function updateState() {
  const t = millis() - stateStart;
  if (state === "in" && t > 2600) setState("play");

  if (
    (state === "in" || state === "play") &&
    stars.length === 0 &&
    constellations.length === 0
  ) {
    setState("clear");
  }
  if (state === "clear" && t > (level === 2 ? 3400 : 1400)) setState("out");
  if (state === "out" && t > 800) startLevel((level + 1) % LEVELS.length);
}

function drawUI() {
  const t = millis() - stateStart;
  const L = LEVELS[level];
  noStroke();

  // 왼쪽 위 안내 (등장 연출 뒤에 나타남)
  let a = state === "in" ? constrain(map(t, 1800, 2600, 0, 1), 0, 1) : 1;
  textAlign(LEFT, TOP);
  fill(255, 170 * a);
  textSize(12);
  setSpacing(4);
  text(L.num + "  " + L.title, 32, 32);
  setSpacing(0);
  fill(255, 240 * a);
  textSize(24);
  text(L.copy, 32, 54);
  fill(255, 110 * a);
  textSize(12);
  text(L.hint, 32, 90);

  // 가운데 큰 타이틀 (단계 등장 연출)
  if (state === "in") {
    let ca = 1;
    if (t < 500) ca = t / 500;
    else if (t > 1800) ca = max(0, 1 - (t - 1800) / 800);
    textAlign(CENTER, CENTER);
    fill(255, 160 * ca);
    textSize(13);
    setSpacing(6);
    text(L.num + "  " + L.title, width / 2, height / 2 - 30);
    setSpacing(0);
    fill(255, 255 * ca);
    textSize(32);
    text(L.copy, width / 2, height / 2 + 12);
  }

  // 클리어 메시지
  if (state === "clear" || state === "out") {
    const ca = state === "clear" ? constrain(t / 600, 0, 1) : 1;
    textAlign(CENTER, CENTER);
    fill(255, 200 * ca);
    if (level === 2) {
      textSize(13);
      setSpacing(6);
      text("SELF-OBLITERATION", width / 2, height / 2);
      setSpacing(0);
    } else {
      textSize(13);
      setSpacing(6);
      text("NEXT", width / 2, height / 2);
      setSpacing(0);
    }
  }

  drawNav();

  // 전환용 어두운 막
  let o = 0;
  if (state === "in") o = constrain(map(t, 0, 900, 255, 0), 0, 255);
  if (state === "out") o = constrain(map(t, 0, 800, 0, 255), 0, 255);
  if (o > 0) {
    fill(3, 14, 22, o);
    rect(0, 0, width, height);
  }
}

// 아래쪽 단계 표시 (눌러서 바로 이동 가능 — 테스트/발표용)
function navPos(i) {
  return { x: width / 2 + (i - 1) * 56, y: height - 36 };
}
function drawNav() {
  textAlign(CENTER, CENTER);
  textSize(12);
  setSpacing(2);
  for (let i = 0; i < LEVELS.length; i++) {
    const p = navPos(i);
    fill(255, i === level ? 230 : 80);
    text(LEVELS[i].num, p.x, p.y);
    if (i === level) {
      stroke(255, 200);
      strokeWeight(1);
      line(p.x - 9, p.y + 11, p.x + 9, p.y + 11);
      noStroke();
    }
  }
  setSpacing(0);
}
function navHit(x, y) {
  for (let i = 0; i < LEVELS.length; i++) {
    const p = navPos(i);
    if (abs(x - p.x) < 24 && abs(y - p.y) < 20) return i;
  }
  return -1;
}

// 부드러운 원형 빛 — 가운데가 밝고 바깥으로 갈수록 0이 되는 radial gradient
function glow(x, y, radius, c, alpha) {
  if (alpha <= 0 || radius <= 0) return;
  const [r, g, b] = c;
  const ctx = drawingContext;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  grad.addColorStop(0.2, `rgba(${r},${g},${b},${alpha * 0.45})`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.12})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// 별 빛살 — 선(stroke) 대신 가느다란 마름모를 그라데이션으로 채움
// 긴 빛살 4개 + 짧은 대각선 빛살 4개 = 8방향으로 촘촘하게
function sparkle(x, y, len, c, alpha, rot) {
  if (alpha <= 0 || len <= 0) return;
  const [r, g, b] = c;
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // translate 이후라 그라데이션 중심은 (0, 0)
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
  grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
  grad.addColorStop(0.25, `rgba(${r},${g},${b},${alpha * 0.5})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  for (let i = 0; i < 8; i++) {
    const main = i % 2 === 0;
    const l = main ? len : len * 0.45; // 대각선은 짧게
    const w = main ? max(1.2, len * 0.045) : max(0.8, len * 0.03); // 빛살 두께
    ctx.beginPath();
    ctx.moveTo(0, -w);
    ctx.lineTo(l, 0);
    ctx.lineTo(0, w);
    ctx.lineTo(-w * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(Math.PI / 4);
  }
  ctx.restore();
}

function setSpacing(px) {
  if ("letterSpacing" in drawingContext)
    drawingContext.letterSpacing = px + "px";
}

// 터치한 위치에 있는 별 찾기 (가장 가까운 것)
function findStar(x, y) {
  let best = null;
  let bestD = Infinity;
  for (let s of stars) {
    if (s.inConstellation || s.toDelete || s.fadingAlone) continue;
    const d = dist(x, y, s.x, s.y);
    if (s.contains(x, y) && d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

// -----------------------------------------------------
// 터치 / 마우스
// -----------------------------------------------------
function mousePressed() {
  const n = navHit(mouseX, mouseY);
  if (n >= 0) {
    startLevel(n);
    return false;
  }
  if (state === "out" || state === "clear") return false;

  const s = findStar(mouseX, mouseY);
  if (!s) return false;

  if (level === 0) {
    // 01 TOUCH — 한 번의 동작 → 즉각 삭제
    s.burst();
  } else if (level === 1) {
    // 02 TIME — 누르고 있는 동안 사라지는 과정
    holdStar = s;
    s.holding = true;
  } else if (level === 2) {
    // 03 RELATION — 연결 시작
    chain = [s];
    s.linked = true;
  }
  return false;
}

function mouseDragged() {
  if (level === 1 && holdStar) {
    // 손가락이 별에서 벗어나면 멈춤
    if (
      dist(mouseX, mouseY, holdStar.x, holdStar.y) >
      holdStar.hitRadius() * 1.8
    )
      releaseHold();
  }

  if (level === 2 && chain.length > 0) {
    const last = chain[chain.length - 1];
    // 조건: 3개 이상 + 첫 별로 돌아와 닫히면 별자리 완성
    // (닫을 때는 거리 제한 없이 — 첫 별 근처에만 오면 OK)
    const first = chain[0];
    if (
      chain.length >= 3 &&
      dist(mouseX, mouseY, first.x, first.y) < first.hitRadius() * 1.3
    ) {
      constellations.push(new Constellation(chain));
      chain = [];
      return false;
    }

    for (let s of stars) {
      if (s.inConstellation || s.fadingAlone || !s.contains(mouseX, mouseY))
        continue;
      if (dist(s.x, s.y, last.x, last.y) > linkRange) continue; // 조건: 가까운 별만 연결

      if (!chain.includes(s)) {
        chain.push(s);
        s.linked = true;
        rings.push(new Ring(s.x, s.y, s.c, 22, 0.06));
      }
    }
  }
  return false;
}

function mouseReleased() {
  if (level === 1) releaseHold();
  if (level === 2 && chain.length > 0) {
    // 닫지 못하고 손을 떼면 연결이 풀린다
    for (let s of chain) s.linked = false;
    chain = [];
  }
  return false;
}

function releaseHold() {
  if (holdStar) holdStar.holding = false;
  holdStar = null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  linkRange = min(width, height) * 0.3;
}

// =====================================================
// 클래스 모음
// Star(별) / Meteor(유성, Matter 바디) / Dust(빛가루) / Ring(빛 파동) / Constellation(별자리)
// =====================================================

// 별 색 팔레트 — Infinity Mirror Room의 조명 색
const PALETTE = [
  [255, 236, 170], // 따뜻한 노랑
  [255, 190, 220], // 핑크
  [200, 240, 255], // 차가운 흰빛
  [255, 255, 255], // 흰색
  [170, 255, 230], // 민트
];

// -----------------------------------------------------
// 별 클래스 — 모든 단계에서 같은 오브젝트를 쓴다
// -----------------------------------------------------
class Star {
  constructor(x, y) {
    this.baseX = x; // 원래 자리
    this.baseY = y;
    this.x = x; // 실제 그려지는 자리 (살짝 떠다님)
    this.y = y;
    this.r = random(3, 8);
    this.c = random(PALETTE);
    this.phase = random(TWO_PI); // 반짝임 타이밍을 별마다 다르게

    this.life = 1; // 빛의 세기 (1 = 최대, 0 = 꺼짐)
    this.appear = 0; // 화면 처음 등장할 때 페이드인
    this.toDelete = false;

    this.holding = false; // 02 TIME: 누르고 있는 중
    this.linked = false; // 03 RELATION: 연결 중
    this.inConstellation = false; // 03 RELATION: 별자리 완성됨
    this.fadingAlone = false; // 03 RELATION: 혼자 남은 별
    this.boost = 0; // 03 RELATION: 별자리 완성 시 추가 밝기
    this.rot = random(-0.25, 0.25); // 빛살 각도를 별마다 살짝 다르게
  }

  update() {
    // 제자리에서 천천히 떠다니기
    this.x = this.baseX + sin(frameCount * 0.01 + this.phase) * 3;
    this.y = this.baseY + cos(frameCount * 0.013 + this.phase) * 3;
    this.appear = min(1, this.appear + 0.02);

    // 별자리에 들어간 별은 Constellation이 직접 조종한다
    if (this.inConstellation) return;

    // 짝이 없어 혼자 남은 별은 스스로 사라진다
    if (this.fadingAlone) {
      this.life -= 0.008;
      if (this.life <= 0) this.die();
      return;
    }

    if (this.holding) {
      // 누르고 있는 동안 빛이 약해짐 (약 2.5초)
      this.life -= 0.0065;
      // 빛가루가 위로 흩어져 올라감 → 사라지는 과정이 보인다
      if (frameCount % 3 === 0) {
        dusts.push(
          new Dust(
            this.x + random(-4, 4),
            this.y + random(-4, 4),
            random(-0.4, 0.4),
            random(-1.2, -0.4),
            this.c,
            random(1.5, 3),
            -0.005,
            0.012,
          ),
        );
      }
      if (this.life <= 0) this.die();
    } else {
      // 손을 떼면 다시 빛이 돌아온다
      this.life = min(1, this.life + 0.015);
    }
  }

  display() {
    const tw = 0.7 + 0.3 * sin(frameCount * 0.06 + this.phase); // 반짝임
    const b = this.life * this.appear; // 밝기
    const rr = this.r * (0.35 + 0.65 * this.life); // 빛이 약해지면 작아짐
    const [cr, cg, cb] = this.c;

    // 부드러운 빛 번짐 (radial gradient → 경계선 없음)
    // boost: 별자리 완성 때 더 크게 빛남
    glow(
      this.x,
      this.y,
      rr * 9 * (1 + this.boost),
      this.c,
      0.55 * b * tw * (1 + this.boost * 0.6),
    );
    glow(this.x, this.y, rr * 3, this.c, 0.9 * b);
    noStroke();
    fill(255, 255 * b);
    circle(this.x, this.y, rr * 1.1);

    // 끝으로 갈수록 가늘어지고 사라지는 빛살 (큰 별일수록 길게)
    const L =
      rr * (2.2 + this.r * 0.5) * (0.85 + 0.15 * tw) * (1 + this.boost * 0.5);
    sparkle(this.x, this.y, L, this.c, 0.85 * b, this.rot);

    // 02 TIME: 남은 빛을 원호로 표시
    if (this.holding) {
      noFill();
      stroke(255, 170);
      strokeWeight(1.5);
      arc(this.x, this.y, 46, 46, -HALF_PI, -HALF_PI + TWO_PI * this.life);
    }

    // 03 RELATION: 연결된 별 표시
    if (this.linked) {
      noFill();
      stroke(255, 150);
      strokeWeight(1);
      circle(this.x, this.y, max(rr * 5, 24));
    }
  }

  // 손가락으로 누르기 쉽게 실제 별보다 넉넉한 영역
  hitRadius() {
    return max(this.r * 3.5, 26);
  }

  // 이 좌표(x, y)가 별 안에 있는지 체크
  contains(px, py) {
    return dist(px, py, this.x, this.y) < this.hitRadius();
  }

  // 01 TOUCH: 즉시 터져서 유성이 된다
  burst() {
    meteors.push(new Meteor(this.x, this.y, this.c));
    rings.push(new Ring(this.x, this.y, this.c, 60, 0.06));
    for (let i = 0; i < 14; i++) {
      const a = random(TWO_PI);
      const s = random(1.5, 4.5);
      dusts.push(
        new Dust(
          this.x,
          this.y,
          cos(a) * s,
          sin(a) * s,
          this.c,
          random(1.5, 3),
          0.05,
          0.03,
        ),
      );
    }
    this.toDelete = true;
  }

  // 빛이 다 꺼졌을 때 (02 TIME, 혼자 남은 별)
  die() {
    this.life = 0;
    this.toDelete = true;
    rings.push(new Ring(this.x, this.y, this.c, 34, 0.025));
    for (let i = 0; i < 8; i++) {
      dusts.push(
        new Dust(
          this.x,
          this.y,
          random(-0.6, 0.6),
          random(-1, -0.2),
          this.c,
          random(1, 2.5),
          -0.003,
          0.015,
        ),
      );
    }
  }
}

// -----------------------------------------------------
// 유성 클래스 — 수업 때 Bubble처럼 Matter 바디를 가진다
// -----------------------------------------------------
class Meteor {
  constructor(x, y, c) {
    this.c = c;
    this.r = 3;
    this.death = false;
    this.trail = [];
    //////// Matter Body
    this.body = Bodies.circle(x, y, this.r, {
      frictionAir: 0,
      collisionFilter: { group: -1 }, // 유성끼리는 부딪치지 않게
    });
    // 옆으로 휙 튀어나가게 초기 속도
    const dir = random() < 0.5 ? -1 : 1;
    Body.setVelocity(this.body, { x: dir * random(9, 15), y: random(-9, -4) });
    Composite.add(engine.world, this.body);
    this.pos = this.body.position;
  }

  update() {
    // 꼬리 남기기
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > 20) this.trail.shift();
  }

  display() {
    const [cr, cg, cb] = this.c;
    for (let i = 1; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      stroke(cr, cg, cb, 255 * t);
      strokeWeight(t * 4);
      line(
        this.trail[i - 1].x,
        this.trail[i - 1].y,
        this.trail[i].x,
        this.trail[i].y,
      );
    }
    glow(this.pos.x, this.pos.y, 22, this.c, 0.6);
    noStroke();
    fill(255);
    circle(this.pos.x, this.pos.y, 6);
  }

  checkDeath() {
    // 캔버스를 벗어나면 '죽은' 상태 + 물리 세계에서도 제거
    if (
      this.pos.x < -60 ||
      this.pos.x > width + 60 ||
      this.pos.y > height + 60
    ) {
      this.death = true;
      Composite.remove(engine.world, this.body);
    }
  }
}

// -----------------------------------------------------
// 빛가루 (물리 엔진 없이 가볍게)
// -----------------------------------------------------
class Dust {
  constructor(x, y, vx, vy, c, size, g, decay) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.c = c;
    this.size = size;
    this.g = g; // 중력 (음수면 위로 떠오름)
    this.decay = decay;
    this.life = 1;
  }
  update() {
    this.vx *= 0.97;
    this.vy = this.vy * 0.97 + this.g;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }
  display() {
    const [cr, cg, cb] = this.c;
    noStroke();
    fill(cr, cg, cb, 220 * this.life);
    circle(this.x, this.y, this.size * this.life + 0.5);
  }
  isDead() {
    return this.life <= 0;
  }
}

// -----------------------------------------------------
// 빛 파동 (퍼지는 원)
// -----------------------------------------------------
class Ring {
  constructor(x, y, c, maxR, decay) {
    this.x = x;
    this.y = y;
    this.c = c;
    this.r = 4;
    this.maxR = maxR;
    this.decay = decay;
    this.life = 1;
  }
  update() {
    this.r += (this.maxR - this.r) * 0.12;
    this.life -= this.decay;
  }
  display() {
    const [cr, cg, cb] = this.c;
    noFill();
    stroke(cr, cg, cb, 200 * this.life);
    strokeWeight(1.5);
    circle(this.x, this.y, this.r * 2);
  }
  isDead() {
    return this.life <= 0;
  }
}

// -----------------------------------------------------
// 별자리 — 완성되면 빛나다가 떠오르며 사라진다
// -----------------------------------------------------
class Constellation {
  constructor(list) {
    this.stars = list;
    this.t = 0;
    this.done = false;
    this.cx = 0;
    this.cy = 0;
    for (let s of list) {
      s.inConstellation = true;
      s.linked = false;
      s.life = 1;
      this.cx += s.baseX / list.length;
      this.cy += s.baseY / list.length;
      rings.push(new Ring(s.x, s.y, s.c, 40, 0.03));
    }
  }

  // 타임라인 (프레임 기준, 60fps ≈ 1초)
  //   0 ~ 45  : 선이 이어지며 별들이 확 밝아짐
  //  45 ~ 90  : 별자리가 숨 쉬듯 빛남
  //  90 ~ 210 : 점점 빨라지며 위로 떠오르고, 빛이 꺼짐
  //  210      : 빛가루로 흩어지며 삭제
  update() {
    this.t++;
    const t = this.t;
    for (let s of this.stars) {
      // 밝기 boost
      if (t < 45) s.boost = (t / 45) * 1.2;
      else if (t < 90) s.boost = 1.0 + 0.2 * sin((t - 45) * 0.2);
      else s.boost = max(0, 1.0 - (t - 90) / 120);

      if (t > 90) {
        // 가속하며 위로 + 가운데로 모임
        s.baseY -= (t - 90) * 0.09;
        s.baseX = lerp(s.baseX, this.cx, 0.02);
      }
      if (t > 140) s.life = max(0.001, 1 - (t - 140) / 70);
    }
    if (t >= 210) {
      for (let s of this.stars) {
        s.toDelete = true;
        rings.push(new Ring(s.x, s.y, s.c, 26, 0.05));
        for (let i = 0; i < 8; i++) {
          const a = random(TWO_PI);
          const v = random(0.5, 2);
          dusts.push(
            new Dust(
              s.x,
              s.y,
              cos(a) * v,
              sin(a) * v - 0.5,
              s.c,
              random(1.5, 3),
              -0.01,
              0.018,
            ),
          );
        }
      }
      this.done = true;
    }
  }

  display() {
    const t = this.t;
    const n = this.stars.length;
    // 선이 하나씩 그려지는 진행도 (0~1)
    const draw = constrain(t / 40, 0, 1) * n;
    let a = 1;
    if (t > 140) a = max(0, 1 - (t - 140) / 70);
    const pulse = t > 45 && t < 90 ? 0.8 + 0.2 * sin((t - 45) * 0.2) : 1;

    // 그림자 블러로 부드럽게 빛나는 선
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = `rgba(255,240,200,${0.9 * a})`;
    stroke(255, 245, 220, 235 * a * pulse);
    strokeWeight(1.6);
    for (let i = 0; i < n; i++) {
      const k = constrain(draw - i, 0, 1); // 이 선이 얼마나 그려졌는지
      if (k <= 0) break;
      const p = this.stars[i];
      const q = this.stars[(i + 1) % n]; // 마지막 별 → 첫 별로 닫힘
      line(p.x, p.y, lerp(p.x, q.x, k), lerp(p.y, q.y, k));
    }
    drawingContext.shadowBlur = 0;
  }
}
