// ─── Constants ───
const CANVAS_W = 800;
const CANVAS_H = 600;
const PLAYER_R = 16;
const HEART_R = 14;
const GOLD_R = 20;
const HEART_COLOR = '#ff4d6d';
const GOLD_COLOR = '#ffd166';
const PLAYER_COLOR = '#ff4d6d';
const BG_COLOR = '#fdf6f0';

// Physics
const GRAVITY = 0.6;
const JUMP_VEL = -12;
const GROUND_Y = CANVAS_H - 40;
const PLAYER_SCREEN_X = CANVAS_W * 0.25;

// Platforms
const PLAT_H = 16;
const PLAT_MIN_W = 80;
const PLAT_MAX_W = 160;
const PLAT_GAP_MIN = 120;
const PLAT_GAP_MAX = 240;
const PLAT_Y_MIN = CANVAS_H - 160; // ~440, reachable from ground jump
const PLAT_Y_MAX = GROUND_Y - 40;

// Obstacles
const OBSTACLE_R = 14;
const INVINCIBLE_FRAMES = 90; // ~1.5s at 60fps
const MAX_LIVES = 5;

// ─── Level Config ───
const LEVELS = [
  { required: 5, intro: 'Every story starts somewhere.', end: 'Ours started with a moment.', obstacleChance: 0.2, moving: false, runSpeed: 3, gapSize: 'normal' },
  { required: 8, intro: 'Small things became big memories.', end: "That's when I knew...", obstacleChance: 0.35, moving: false, runSpeed: 3.5, gapSize: 'normal' },
  { required: 10, intro: 'Love is choosing each other.', end: 'And we keep choosing.', obstacleChance: 0.45, moving: true, runSpeed: 4, gapSize: 'wider' },
  { required: 12, intro: 'Somewhere along the way... we became "us."', end: 'And "us" became my favorite place.', obstacleChance: 0.55, moving: true, runSpeed: 4.5, gapSize: 'wider' },
  { required: 1, intro: 'Some things are worth holding onto.', end: null, obstacleChance: 0.15, moving: false, runSpeed: 3, gapSize: 'normal' },
];

const LEVEL_PHOTOS = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'];

// ─── State ───
let state = 'intro';
let currentLevel = 0;
let heartsCollected = 0;
let hearts = [];
let platforms = [];
let obstacles = [];
let invincibleTimer = 0;
let lives = MAX_LIVES;
let clouds = [];
let hills = [];
let player = { x: 0, y: 0, vy: 0, grounded: false };
let worldX = 0;
let lastPlatEndX = 0;

// ─── DOM ───
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');
const emailOverlay = document.getElementById('email-overlay');
const replyBtn = document.getElementById('reply-btn');
const photoOverlay = document.getElementById('photo-overlay');
const photoImg = document.getElementById('photo-img');
const photoBtn = document.getElementById('photo-btn');
const endingOverlay = document.getElementById('ending-overlay');
const heartsCanvas = document.getElementById('heartsCanvas');
const heartsCtx = heartsCanvas.getContext('2d');

// ─── Input ───
let jumpPressed = false;
let jumpConsumed = false;

function onJump() {
  if (state === 'playing') {
    jumpPressed = true;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault();
    onJump();
  }
});

// Touch/click to jump (only on canvas)
canvas.addEventListener('mousedown', (e) => { e.preventDefault(); onJump(); });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onJump(); }, { passive: false });

// Prevent page scroll/bounce on mobile
document.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

// ─── Helpers ───
function getLevelSpeed() {
  return LEVELS[currentLevel].runSpeed;
}

// ─── World Generation ───
function generatePlatform() {
  const lvl = LEVELS[currentLevel];
  const gapExtra = lvl.gapSize === 'wider' ? 60 : 0;
  const gap = PLAT_GAP_MIN + gapExtra + Math.random() * (PLAT_GAP_MAX - PLAT_GAP_MIN);
  const w = PLAT_MIN_W + Math.random() * (PLAT_MAX_W - PLAT_MIN_W);
  const x = lastPlatEndX + gap;
  const y = PLAT_Y_MIN + Math.random() * (PLAT_Y_MAX - PLAT_Y_MIN);
  lastPlatEndX = x + w;
  return { x, y, w, h: PLAT_H };
}

function spawnHeartsOnPlatform(plat, gold) {
  const count = gold ? 1 : (1 + Math.floor(Math.random() * 2));
  for (let i = 0; i < count; i++) {
    const hx = plat.x + 20 + Math.random() * (plat.w - 40);
    // just above platform surface, within jump reach
    const hy = plat.y - 20 - Math.random() * 30;
    hearts.push({
      x: hx,
      y: hy,
      gold,
      r: gold ? GOLD_R : HEART_R,
      collected: false,
    });
  }
}

function spawnFloatingHeart(afterX, gold) {
  const hx = afterX + 60 + Math.random() * 120;
  // Reachable: jump from ground reaches ~GROUND_Y - 120px
  const hy = GROUND_Y - 30 - Math.random() * 90;
  hearts.push({ x: hx, y: hy, gold, r: gold ? GOLD_R : HEART_R, collected: false });
}

function spawnObstacle(plat) {
  const lvl = LEVELS[currentLevel];
  if (Math.random() >= lvl.obstacleChance) return;
  // Place on platform surface or on ground between platforms
  const onPlatform = Math.random() > 0.4;
  let ox, oy;
  if (onPlatform) {
    ox = plat.x + 20 + Math.random() * (plat.w - 40);
    oy = plat.y - OBSTACLE_R;
  } else {
    ox = plat.x - 40 - Math.random() * 60;
    oy = GROUND_Y - OBSTACLE_R;
  }
  const moving = lvl.moving && Math.random() > 0.5;
  obstacles.push({ x: ox, y: oy, baseY: oy, moving, phase: Math.random() * Math.PI * 2, collected: false });
}

function ensureWorld() {
  const lookAhead = worldX + CANVAS_W * 2;
  while (lastPlatEndX < lookAhead) {
    const plat = generatePlatform();
    platforms.push(plat);
    const isGold = currentLevel === 4;
    if (isGold && hearts.filter(h => !h.collected).length === 0) {
      spawnHeartsOnPlatform(plat, true);
    } else if (!isGold) {
      spawnHeartsOnPlatform(plat, false);
      if (Math.random() > 0.6) spawnFloatingHeart(plat.x, false);
    }
    spawnObstacle(plat);
  }
}

function initClouds() {
  clouds = [];
  for (let i = 0; i < 8; i++) {
    clouds.push({
      x: Math.random() * CANVAS_W * 4,
      y: 30 + Math.random() * 140,
      w: 80 + Math.random() * 100,
      h: 30 + Math.random() * 20,
      speed: 0.2 + Math.random() * 0.2,
    });
  }
}

function initHills() {
  hills = [];
  for (let i = 0; i < 6; i++) {
    hills.push({
      x: i * 400 + Math.random() * 200,
      w: 200 + Math.random() * 150,
      h: 60 + Math.random() * 50,
    });
  }
}

function resetWorld() {
  platforms = [];
  hearts = [];
  obstacles = [];
  invincibleTimer = 0;
  lives = MAX_LIVES;
  worldX = 0;
  lastPlatEndX = 200;
  player.x = 300;
  player.y = GROUND_Y - PLAYER_R;
  player.vy = 0;
  player.grounded = true;
  jumpPressed = false;
  jumpConsumed = false;
  initClouds();
  initHills();
  ensureWorld();
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

function drawPlayer(screenX, screenY) {
  ctx.beginPath();
  ctx.arc(screenX, screenY, PLAYER_R, 0, Math.PI * 2);
  ctx.fillStyle = PLAYER_COLOR;
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(screenX - 5, screenY - 3, 3, 0, Math.PI * 2);
  ctx.arc(screenX + 5, screenY - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.beginPath();
  ctx.arc(screenX, screenY + 4, 5, 0, Math.PI);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#d4eeff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawClouds(camX) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  clouds.forEach(c => {
    let sx = c.x - camX * c.speed;
    sx = ((sx % (CANVAS_W * 3)) + CANVAS_W * 3) % (CANVAS_W * 3) - CANVAS_W * 0.5;
    // Cloud = 3 overlapping ellipses
    ctx.beginPath();
    ctx.ellipse(sx, c.y, c.w * 0.35, c.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + c.w * 0.25, c.y - c.h * 0.15, c.w * 0.3, c.h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + c.w * 0.5, c.y, c.w * 0.3, c.h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHills(camX) {
  ctx.fillStyle = '#3a7a30';
  hills.forEach(h => {
    let sx = h.x - camX * 0.3;
    sx = ((sx % (CANVAS_W * 3)) + CANVAS_W * 3) % (CANVAS_W * 3) - CANVAS_W * 0.5;
    ctx.beginPath();
    ctx.ellipse(sx, GROUND_Y, h.w * 0.5, h.h, 0, Math.PI, 0);
    ctx.fill();
  });
}

function drawGround(camX) {
  // Dirt fill
  ctx.fillStyle = '#8B5E3C';
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // Green ground
  ctx.fillStyle = '#4a8c3f';
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 20);

  // Bright grass top stripe
  ctx.fillStyle = '#5cb85c';
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);

  // Dirt brick pattern below grass
  const brickW = 32;
  const brickH = 16;
  const dirtTop = GROUND_Y + 20;
  ctx.strokeStyle = '#6d4427';
  ctx.lineWidth = 1;
  for (let row = 0; row < 3; row++) {
    const by = dirtTop + row * brickH;
    const offset = (row % 2) * (brickW / 2);
    const startBrick = Math.floor(camX / brickW) * brickW - brickW;
    for (let wx = startBrick; wx < camX + CANVAS_W + brickW; wx += brickW) {
      const sx = wx - camX + offset;
      ctx.strokeRect(sx, by, brickW, brickH);
    }
  }

  // Grass tufts
  ctx.strokeStyle = '#5cb85c';
  ctx.lineWidth = 1.5;
  const startTuft = Math.floor(camX / 30) * 30;
  for (let wx = startTuft; wx < camX + CANVAS_W + 30; wx += 30) {
    const sx = wx - camX;
    ctx.beginPath();
    ctx.moveTo(sx, GROUND_Y);
    ctx.lineTo(sx - 4, GROUND_Y - 6);
    ctx.moveTo(sx, GROUND_Y);
    ctx.lineTo(sx + 4, GROUND_Y - 6);
    ctx.stroke();
  }
}

function drawPlatform(plat, camX) {
  const sx = plat.x - camX;
  const sy = plat.y;
  if (sx + plat.w < -50 || sx > CANVAS_W + 50) return;

  // Brick fill
  ctx.fillStyle = '#c0763a';
  ctx.fillRect(sx, sy, plat.w, plat.h);

  // Brick grid pattern
  const brickW = 20;
  ctx.strokeStyle = '#8B5E3C';
  ctx.lineWidth = 1;
  // Mortar lines — vertical
  for (let bx = sx + brickW; bx < sx + plat.w; bx += brickW) {
    ctx.beginPath();
    ctx.moveTo(bx, sy);
    ctx.lineTo(bx, sy + plat.h);
    ctx.stroke();
  }
  // Mortar line — horizontal middle (if platform tall enough)
  if (plat.h > 10) {
    ctx.beginPath();
    ctx.moveTo(sx, sy + plat.h / 2);
    ctx.lineTo(sx + plat.w, sy + plat.h / 2);
    ctx.stroke();
  }

  // Outline
  ctx.strokeStyle = '#8B5E3C';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, plat.w, plat.h);

  // Green grass tuft on top
  ctx.strokeStyle = '#5cb85c';
  ctx.lineWidth = 1.5;
  for (let gx = sx + 8; gx < sx + plat.w - 4; gx += 14) {
    ctx.beginPath();
    ctx.moveTo(gx, sy);
    ctx.lineTo(gx - 3, sy - 5);
    ctx.moveTo(gx, sy);
    ctx.lineTo(gx + 3, sy - 5);
    ctx.stroke();
  }
}

// drawBgHearts removed — replaced by clouds

function drawBrokenHeart(cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy - size * 0.1);
  const s = size;
  // Heart shape
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.4);
  ctx.bezierCurveTo(-s, -s * 0.2, -s * 0.5, -s, 0, -s * 0.4);
  ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.2, 0, s * 0.4);
  ctx.fill();
  // Crack
  ctx.strokeStyle = '#fdf6f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.35);
  ctx.lineTo(-3, -s * 0.1);
  ctx.lineTo(3, s * 0.1);
  ctx.lineTo(-2, s * 0.3);
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  const lvl = LEVELS[currentLevel];

  // Shadow for readability on blue sky
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Level ${currentLevel + 1}`, 16, 28);
  ctx.fillText(`Hearts: ${heartsCollected} / ${lvl.required}`, 16, 50);

  // Lives — small hearts top-right
  for (let i = 0; i < MAX_LIVES; i++) {
    const lx = CANVAS_W - 24 - i * 22;
    const color = i < lives ? '#ff4d6d' : '#ddd';
    drawHeart(lx, 24, 8, color);
  }

  // Jump hint
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Tap / Space to jump', CANVAS_W / 2, 28);
  ctx.textAlign = 'left';

  ctx.restore();
}

// ─── Game Loop ───
function update() {
  if (state !== 'playing') return;

  // Auto-run
  player.x += getLevelSpeed();
  worldX = player.x - PLAYER_SCREEN_X;

  // Jump
  if (jumpPressed && player.grounded) {
    player.vy = JUMP_VEL;
    player.grounded = false;
    jumpPressed = false;
    jumpConsumed = true;
  }
  if (!jumpPressed) jumpConsumed = false;
  jumpPressed = false;

  // Gravity
  player.vy += GRAVITY;
  player.y += player.vy;

  // Ground collision
  player.grounded = false;
  if (player.y + PLAYER_R >= GROUND_Y) {
    player.y = GROUND_Y - PLAYER_R;
    player.vy = 0;
    player.grounded = true;
  }

  // Platform collision (only when falling)
  if (player.vy >= 0) {
    for (const plat of platforms) {
      if (
        player.x + PLAYER_R > plat.x &&
        player.x - PLAYER_R < plat.x + plat.w &&
        player.y + PLAYER_R >= plat.y &&
        player.y + PLAYER_R <= plat.y + plat.h + player.vy + 2
      ) {
        player.y = plat.y - PLAYER_R;
        player.vy = 0;
        player.grounded = true;
        break;
      }
    }
  }

  // Heart collision
  const psx = PLAYER_SCREEN_X;
  const psy = player.y;
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    if (h.collected) continue;
    const dist = Math.hypot(player.x - h.x, player.y - h.y);
    if (dist < PLAYER_R + h.r) {
      h.collected = true;
      heartsCollected++;
    }
  }

  // Obstacle update & collision
  for (const obs of obstacles) {
    if (obs.collected) continue;
    if (obs.moving) {
      obs.y = obs.baseY + Math.sin(obs.phase) * 30;
      obs.phase += 0.05;
    }
    const dist = Math.hypot(player.x - obs.x, player.y - obs.y);
    if (dist < PLAYER_R + OBSTACLE_R && invincibleTimer === 0) {
      lives--;
      heartsCollected = Math.max(0, heartsCollected - 1);
      invincibleTimer = INVINCIBLE_FRAMES;
      if (lives <= 0) {
        state = 'gameover';
        showOverlay('You ran out of lives...', 'Try Again', () => {
          resetWorld();
          heartsCollected = 0;
          state = 'playing';
        });
        return;
      }
    }
  }
  if (invincibleTimer > 0) invincibleTimer--;

  // Fell off bottom → respawn
  if (player.y > CANVAS_H + 50) {
    // Find nearest platform behind or near player
    let bestPlat = null;
    for (const plat of platforms) {
      if (plat.x + plat.w > player.x - CANVAS_W && plat.x < player.x) {
        bestPlat = plat;
      }
    }
    if (bestPlat) {
      player.x = bestPlat.x + bestPlat.w / 2;
      player.y = bestPlat.y - PLAYER_R;
    } else {
      player.y = GROUND_Y - PLAYER_R;
    }
    player.vy = 0;
    player.grounded = true;
  }

  // Generate more world
  ensureWorld();

  // Cleanup offscreen
  const cleanX = worldX - CANVAS_W;
  platforms = platforms.filter(p => p.x + p.w > cleanX);
  hearts = hearts.filter(h => !h.collected || h.x > cleanX);
  hearts = hearts.filter(h => h.collected || h.x > cleanX);
  obstacles = obstacles.filter(o => o.x > cleanX);

  // Level complete
  const lvl = LEVELS[currentLevel];
  if (heartsCollected >= lvl.required) {
    if (currentLevel === 4) {
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

  if (state === 'playing') {
    const camX = worldX;

    // 1. Sky gradient
    drawSky();

    // 2. Clouds (far parallax)
    drawClouds(camX);

    // 3. Hills (mid parallax)
    drawHills(camX);

    // 4. Ground (green)
    drawGround(camX);

    // 5. Platforms (brick)
    platforms.forEach(p => drawPlatform(p, camX));

    // 6. Hearts
    hearts.forEach(h => {
      if (h.collected) return;
      const sx = h.x - camX;
      const sy = h.y;
      if (sx < -30 || sx > CANVAS_W + 30) return;
      const color = h.gold ? GOLD_COLOR : HEART_COLOR;
      drawHeart(sx, sy, h.r, color);
    });

    // 7. Obstacles
    obstacles.forEach(obs => {
      const sx = obs.x - camX;
      if (sx < -30 || sx > CANVAS_W + 30) return;
      drawBrokenHeart(sx, obs.y, OBSTACLE_R);
    });

    // 8. Player (fixed screen X) — blink when invincible
    if (invincibleTimer === 0 || Math.floor(invincibleTimer / 4) % 2 === 0) {
      drawPlayer(PLAYER_SCREEN_X, player.y);
    }

    // 9. HUD
    drawHUD();
  } else {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
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
      setTimeout(() => {
        overlay.style.display = 'none';
        if (callback) callback();
      }, 600);
    };
  } else {
    overlayBtn.style.display = 'none';
    setTimeout(() => {
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.style.display = 'none';
        if (callback) callback();
      }, 600);
    }, 2000);
  }
}

function showTransition(text) {
  showOverlay(text, null, () => {
    showPhoto(currentLevel);
  });
}

function showPhoto(levelIndex) {
  state = 'photo';
  photoImg.src = LEVEL_PHOTOS[levelIndex];
  photoOverlay.style.display = 'flex';
  setTimeout(() => { photoOverlay.style.opacity = '1'; }, 10);

  photoBtn.onclick = () => {
    photoOverlay.style.opacity = '0';
    setTimeout(() => {
      photoOverlay.style.display = 'none';
      currentLevel++;
      heartsCollected = 0;
      startLevel();
    }, 600);
  };
}

function startLevel() {
  const lvl = LEVELS[currentLevel];

  showOverlay(lvl.intro, 'Begin', () => {
    resetWorld();
    heartsCollected = 0;
    state = 'playing';
  });
}

function showFinalIntro() {
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

  function animFrame() {
    heartsCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    floaters.forEach((f) => {
      f.y -= f.speed;
      f.wobble += 0.03;
      if (f.y < -f.size) {
        f.y = CANVAS_H + f.size;
        f.x = Math.random() * CANVAS_W;
      }
      const wx = f.x + Math.sin(f.wobble) * 20;

      heartsCtx.save();
      heartsCtx.translate(wx, f.y);
      heartsCtx.globalAlpha = 0.7;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
