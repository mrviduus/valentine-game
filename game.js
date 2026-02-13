// ─── Constants ───
const CANVAS_W = 800;
const CANVAS_H = 600;
const PLAYER_R = 16;
const HEART_R = 14;
const GOLD_R = 20;
const PLAYER_SPEED = 4;
const HEART_COLOR = '#ff4d6d';
const GOLD_COLOR = '#ffd166';
const PLAYER_COLOR = '#ff4d6d';
const BG_COLOR = '#fdf6f0';

// ─── Level Config ───
const LEVELS = [
  { required: 5, intro: 'Every story starts somewhere.', end: 'Ours started with a moment.' },
  { required: 8, intro: 'Small things became big memories.', end: "That's when I knew..." },
  { required: 10, intro: 'Love is choosing each other.', end: 'And we keep choosing.' },
  { required: 12, intro: 'Somewhere along the way... we became "us."', end: 'And "us" became my favorite place.' },
  { required: 1, intro: 'Some things are worth holding onto.', end: null },
];

// ─── State ───
let state = 'intro'; // intro | playing | transition | finalIntro | email | ending
let currentLevel = 0;
let heartsCollected = 0;
let hearts = [];
let player = { x: CANVAS_W / 2, y: CANVAS_H / 2 };
let keys = {};
let mobileDir = {};

// ─── DOM ───
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');
const emailOverlay = document.getElementById('email-overlay');
const replyBtn = document.getElementById('reply-btn');
const endingOverlay = document.getElementById('ending-overlay');
const heartsCanvas = document.getElementById('heartsCanvas');
const heartsCtx = heartsCanvas.getContext('2d');

// ─── Input ───
document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Mobile touch controls
document.querySelectorAll('.ctrl-btn').forEach((btn) => {
  const dir = btn.dataset.dir;
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); mobileDir[dir] = true; });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); mobileDir[dir] = false; });
  btn.addEventListener('mousedown', () => { mobileDir[dir] = true; });
  btn.addEventListener('mouseup', () => { mobileDir[dir] = false; });
});

// ─── Heart Spawning ───
function spawnHearts(count, gold) {
  hearts = [];
  for (let i = 0; i < count; i++) {
    hearts.push({
      x: HEART_R + Math.random() * (CANVAS_W - HEART_R * 2),
      y: HEART_R + Math.random() * (CANVAS_H - HEART_R * 2),
      gold: gold,
      r: gold ? GOLD_R : HEART_R,
    });
  }
}

// ─── Drawing ───
function drawHeart(cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy - size * 0.1);
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size;
  ctx.moveTo(0, s * 0.4);
  ctx.bezierCurveTo(-s, -s * 0.2, -s * 0.5, -s, 0, -s * 0.4);
  ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.2, 0, s * 0.4);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = PLAYER_COLOR;
  ctx.fill();

  // Small face
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(player.x - 5, player.y - 3, 3, 0, Math.PI * 2);
  ctx.arc(player.x + 5, player.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x, player.y + 4, 5, 0, Math.PI);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHUD() {
  const lvl = LEVELS[currentLevel];
  ctx.fillStyle = '#3a3a3a';
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Level ${currentLevel + 1}`, 16, 28);
  ctx.fillText(`Hearts: ${heartsCollected} / ${lvl.required}`, 16, 50);
}

// ─── Game Loop ───
function update() {
  if (state !== 'playing') return;

  // Movement
  let dx = 0, dy = 0;
  if (keys['ArrowLeft'] || keys['a'] || keys['A'] || mobileDir.left) dx -= PLAYER_SPEED;
  if (keys['ArrowRight'] || keys['d'] || keys['D'] || mobileDir.right) dx += PLAYER_SPEED;
  if (keys['ArrowUp'] || keys['w'] || keys['W'] || mobileDir.up) dy -= PLAYER_SPEED;
  if (keys['ArrowDown'] || keys['s'] || keys['S'] || mobileDir.down) dy += PLAYER_SPEED;

  player.x = Math.max(PLAYER_R, Math.min(CANVAS_W - PLAYER_R, player.x + dx));
  player.y = Math.max(PLAYER_R, Math.min(CANVAS_H - PLAYER_R, player.y + dy));

  // Collision
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    const dist = Math.hypot(player.x - h.x, player.y - h.y);
    if (dist < PLAYER_R + h.r) {
      hearts.splice(i, 1);
      heartsCollected++;
    }
  }

  // Level complete check
  const lvl = LEVELS[currentLevel];
  if (heartsCollected >= lvl.required) {
    if (currentLevel === 4) {
      // Final level done
      state = 'finalIntro';
      showFinalIntro();
    } else {
      state = 'transition';
      showTransition(lvl.end);
    }
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (state === 'playing') {
    hearts.forEach((h) => {
      const color = h.gold ? GOLD_COLOR : HEART_COLOR;
      drawHeart(h.x, h.y, h.r, color);
    });
    drawPlayer();
    drawHUD();
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ─── Screen Management ───
function showOverlay(text, btnText, callback) {
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlayText.textContent = text;

  if (btnText) {
    overlayBtn.style.display = 'inline-block';
    overlayBtn.textContent = btnText;
    overlayBtn.onclick = () => {
      overlay.classList.add('hidden');
      setTimeout(() => { overlay.style.display = 'none'; }, 600);
      if (callback) callback();
    };
  } else {
    overlayBtn.style.display = 'none';
    // Auto-advance after delay
    setTimeout(() => {
      overlay.classList.add('hidden');
      setTimeout(() => { overlay.style.display = 'none'; }, 600);
      if (callback) callback();
    }, 2000);
  }
}

function showTransition(text) {
  showOverlay(text, null, () => {
    currentLevel++;
    heartsCollected = 0;
    startLevel();
  });
}

function startLevel() {
  const lvl = LEVELS[currentLevel];
  const isGold = currentLevel === 4;

  showOverlay(lvl.intro, 'Begin', () => {
    player.x = CANVAS_W / 2;
    player.y = CANVAS_H / 2;
    heartsCollected = 0;
    spawnHearts(isGold ? 1 : lvl.required + 3, isGold);
    state = 'playing';
  });
}

function showFinalIntro() {
  // Fade to dark
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.style.background = 'rgba(20, 10, 15, 0.95)';
  overlayText.style.color = '#fdf6f0';
  overlayText.innerHTML = '📩 1 new message received.';
  overlayBtn.style.display = 'inline-block';
  overlayBtn.textContent = 'Open Message';
  overlayBtn.onclick = () => {
    overlay.classList.add('hidden');
    setTimeout(() => { overlay.style.display = 'none'; }, 600);
    state = 'email';
    showEmail();
  };
}

function showEmail() {
  emailOverlay.style.display = 'flex';
  setTimeout(() => { emailOverlay.style.opacity = '1'; }, 10);
}

replyBtn.addEventListener('click', () => {
  emailOverlay.style.opacity = '0';
  setTimeout(() => {
    emailOverlay.style.display = 'none';
    state = 'ending';
    showEnding();
  }, 600);
});

function showEnding() {
  endingOverlay.style.display = 'flex';
  setTimeout(() => { endingOverlay.style.opacity = '1'; }, 10);
  animateFloatingHearts();
}

// ─── Floating Hearts Animation ───
function animateFloatingHearts() {
  const floaters = [];
  for (let i = 0; i < 30; i++) {
    floaters.push({
      x: Math.random() * CANVAS_W,
      y: CANVAS_H + Math.random() * 100,
      speed: 1.5 + Math.random() * 3,
      size: 8 + Math.random() * 16,
      wobble: Math.random() * Math.PI * 2,
      color: Math.random() > 0.3 ? HEART_COLOR : GOLD_COLOR,
    });
  }

  const start = performance.now();
  const duration = 3000;

  function animFrame(now) {
    const elapsed = now - start;
    if (elapsed > duration) return;

    heartsCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    floaters.forEach((f) => {
      f.y -= f.speed;
      f.wobble += 0.03;
      const wx = f.x + Math.sin(f.wobble) * 20;

      heartsCtx.save();
      heartsCtx.translate(wx, f.y);
      heartsCtx.globalAlpha = Math.max(0, 1 - elapsed / duration * 0.5);
      heartsCtx.fillStyle = f.color;
      heartsCtx.beginPath();
      const s = f.size;
      heartsCtx.moveTo(0, s * 0.4);
      heartsCtx.bezierCurveTo(-s, -s * 0.2, -s * 0.5, -s, 0, -s * 0.4);
      heartsCtx.bezierCurveTo(s * 0.5, -s, s, -s * 0.2, 0, s * 0.4);
      heartsCtx.fill();
      heartsCtx.restore();
    });

    requestAnimationFrame(animFrame);
  }

  requestAnimationFrame(animFrame);
}

// ─── Init ───
function init() {
  showOverlay('You\'ve Got My Heart', 'Play', () => {
    startLevel();
  });
  gameLoop();
}

init();
