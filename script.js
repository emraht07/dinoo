const canvas = document.getElementById("game-world");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("ui-score");
const timeEl = document.getElementById("ui-time");
const healthEl = document.getElementById("ui-health");
const stateEl = document.getElementById("ui-state");
const speedFillEl = document.getElementById("ui-speed-fill");
const speedValueEl = document.getElementById("ui-speed-value");
const recordsEl = document.getElementById("ui-records");
const avatarPreviewEl = document.getElementById("avatar-preview");
const avatarButtons = Array.from(document.querySelectorAll(".avatar-btn"));
const playerNameEl = document.getElementById("player-name");
const btnHome = document.getElementById("btn-home");
const btnCharacters = document.getElementById("btn-characters");
const btnQuests = document.getElementById("btn-quests");
const btnSettings = document.getElementById("btn-settings");
const settingsPanelEl = document.getElementById("settings-panel");
const modeDayBtn = document.getElementById("mode-day");
const modeNightBtn = document.getElementById("mode-night");
const questPanelEl = document.querySelector(".quest-panel");
const characterPanelEl = document.querySelector(".character-panel");

const WORLD_RECORD_KEY = "rpg_world_records";
const keys = new Set();
const coins = [];
const birds = [];
const guards = [
  { x: 105, y: 520, shirt: "#85764a", speed: 120, type: "guard" },
  { x: 215, y: 518, shirt: "#4f85a3", speed: 115, type: "guard" },
  { x: 0, y: 517, shirt: "#8f8a4b", rightOffset: 190, speed: 125, type: "guard" },
  { x: 0, y: 514, shirt: "#8d5f5f", rightOffset: 310, speed: 118, type: "guard" },
];

const hero = {
  x: 420,
  y: 510,
  w: 34,
  h: 56,
  baseSpeed: 258,
  currentSpeed: 258,
  stamina: 100,
  facing: 1,
  moving: false,
  avatar: "KA",
};

const game = {
  score: 0,
  health: 100,
  timeLeft: 90,
  status: "Devam",
  coinGoal: 300,
  over: false,
  hitCooldown: 0,
  birdCooldown: 0,
  phase: 0,
  recordSaved: false,
};

let records = [];
let lastTime = performance.now();
let worldMode = "day";

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function heroCenter() {
  return { x: hero.x + hero.w * 0.5, y: hero.y + hero.h * 0.6 };
}

function spawnCoin() {
  coins.push({
    x: randomBetween(36, canvas.width - 36),
    y: randomBetween(canvas.height * 0.61, canvas.height - 32),
    r: 9,
    spin: Math.random() * Math.PI * 2,
  });
}

function spawnBird() {
  const rightToLeft = Math.random() > 0.5;
  birds.push({
    x: rightToLeft ? canvas.width + 40 : -40,
    y: randomBetween(canvas.height * 0.48, canvas.height * 0.68),
    vx: rightToLeft ? -180 : 180,
    wobble: Math.random() * Math.PI * 2,
  });
}

function ensureCoins() {
  while (coins.length < 8 && !game.over) spawnCoin();
}

function ensureBirds() {
  while (birds.length < 3 && !game.over) spawnBird();
}

function getDisplayGuards() {
  return guards.map((g) => ({
    ...g,
    gx: g.rightOffset ? canvas.width - g.rightOffset : g.x,
    gy: g.y,
  }));
}

function drawSkyAndMountains() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (worldMode === "night") {
    gradient.addColorStop(0, "#0f2341");
    gradient.addColorStop(0.45, "#1d3557");
    gradient.addColorStop(1, "#2d4f4a");
  } else {
    gradient.addColorStop(0, "#62c3ef");
    gradient.addColorStop(0.45, "#7ac7ee");
    gradient.addColorStop(1, "#5c8c5e");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
  const roadTop = canvas.height * 0.67;
  ctx.fillStyle = worldMode === "night" ? "#446651" : "#62895d";
  ctx.fillRect(0, roadTop - 95, canvas.width, canvas.height);
  ctx.fillStyle = worldMode === "night" ? "#8d7b61" : "#b8a27f";
  ctx.fillRect(0, roadTop, canvas.width, canvas.height - roadTop);
  ctx.fillStyle = "rgba(125, 101, 72, 0.7)";
  for (let i = 0; i < canvas.width; i += 38) {
    ctx.fillRect(i, roadTop + ((i / 38) % 2 ? 12 : 26), 28, 9);
  }
}

function drawHouse(x, y, scale, wallColor, roofColor) {
  const w = 140 * scale;
  const h = 120 * scale;
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - 12 * scale, y + 16 * scale);
  ctx.lineTo(x + w / 2, y - 42 * scale);
  ctx.lineTo(x + w + 12 * scale, y + 16 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4d2e1e";
  ctx.fillRect(x + w * 0.4, y + h * 0.5, 24 * scale, 60 * scale);
  ctx.fillStyle = "#9fd0e4";
  ctx.fillRect(x + 18 * scale, y + 22 * scale, 26 * scale, 20 * scale);
  ctx.fillRect(x + w - 44 * scale, y + 22 * scale, 26 * scale, 20 * scale);
  ctx.strokeStyle = "#2f1a0f";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y);
  ctx.lineTo(x + w * 0.25, y + h);
  ctx.moveTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.5, y + h);
  ctx.moveTo(x + w * 0.75, y);
  ctx.lineTo(x + w * 0.75, y + h);
  ctx.stroke();
}

function drawTree(x, y, s) {
  ctx.fillStyle = "#4d2f1f";
  ctx.fillRect(x - 7 * s, y - 10 * s, 14 * s, 44 * s);
  ctx.fillStyle = "#2f6e3b";
  ctx.beginPath();
  ctx.moveTo(x, y - 66 * s);
  ctx.lineTo(x - 34 * s, y - 8 * s);
  ctx.lineTo(x + 34 * s, y - 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - 84 * s);
  ctx.lineTo(x - 24 * s, y - 28 * s);
  ctx.lineTo(x + 24 * s, y - 28 * s);
  ctx.closePath();
  ctx.fill();
}

function drawGuard(x, y, shirt) {
  ctx.fillStyle = "#2f1c14";
  ctx.fillRect(x - 7, y + 18, 6, 14);
  ctx.fillRect(x + 1, y + 18, 6, 14);
  ctx.fillStyle = shirt;
  ctx.fillRect(x - 10, y, 20, 20);
  ctx.fillStyle = "#f0c6a1";
  ctx.beginPath();
  ctx.arc(x, y - 8, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoin(coin) {
  const pulse = 0.8 + Math.sin(coin.spin) * 0.15;
  ctx.save();
  ctx.translate(coin.x, coin.y);
  ctx.scale(pulse, 1);
  ctx.fillStyle = "#efc04b";
  ctx.beginPath();
  ctx.arc(0, 0, coin.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBird(bird) {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.fillStyle = "#1f2a3b";
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(0, -7);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHero() {
  const x = hero.x;
  const y = hero.y;
  const walk = hero.moving ? Math.sin(game.phase * 12) : 0;
  const armSwing = walk * 4;
  const legSwing = walk * 3;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + 17, y + 56, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1a12";
  ctx.fillRect(x + 7 - legSwing, y + 35, 9, 21);
  ctx.fillRect(x + 18 + legSwing, y + 35, 9, 21);
  ctx.fillStyle = "#2f63b0";
  ctx.fillRect(x + 6, y + 12, 22, 24);
  ctx.fillStyle = "#2d1c14";
  ctx.fillRect(x + 3 - armSwing, y + 16, 6, 20);
  ctx.fillRect(x + 25 + armSwing, y + 16, 6, 20);
  ctx.fillStyle = "#f0c9a5";
  ctx.beginPath();
  ctx.arc(x + 17, y + 8, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1a12";
  const eyeX = hero.facing > 0 ? x + 19 : x + 15;
  ctx.fillRect(eyeX, y + 8, 2, 2);
  ctx.fillStyle = "#f0deb6";
  ctx.font = "bold 8px monospace";
  ctx.fillText(hero.avatar, x + 9, y + 25);
}

function drawMessage() {
  if (game.status === "Devam") return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(canvas.width * 0.28, canvas.height * 0.38, canvas.width * 0.44, 100);
  ctx.fillStyle = "#ffd57a";
  ctx.font = "bold 30px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(game.status, canvas.width * 0.5, canvas.height * 0.43 + 16);
  ctx.font = "18px Trebuchet MS, sans-serif";
  ctx.fillText("R ile yeniden baslat", canvas.width * 0.5, canvas.height * 0.43 + 48);
}

function drawScene() {
  drawSkyAndMountains();
  drawGround();
  drawHouse(30, 250, 1.15, "#e0d5bf", "#905d3a");
  drawHouse(260, 290, 0.95, "#d9d1bc", "#8b5533");
  drawHouse(canvas.width - 360, 250, 1.2, "#dacfb6", "#8f5635");
  drawHouse(canvas.width - 210, 290, 0.92, "#dccfba", "#7a4d30");
  const treeLineY = canvas.height * 0.58;
  for (let x = 40; x < canvas.width - 40; x += 72) {
    const v = (x / 72) % 3;
    drawTree(x, treeLineY + (v - 1) * 7, 0.92 + (v * 0.06));
  }
  getDisplayGuards().forEach((g) => drawGuard(g.gx, g.gy, g.shirt));
  birds.forEach(drawBird);
  coins.forEach(drawCoin);
  drawHero();
  drawMessage();
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(WORLD_RECORD_KEY);
    records = raw ? JSON.parse(raw) : [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(WORLD_RECORD_KEY, JSON.stringify(records));
}

function renderRecords() {
  if (!recordsEl) return;
  recordsEl.innerHTML = "";
  if (!records.length) {
    const li = document.createElement("li");
    li.textContent = "Henuz rekor yok";
    recordsEl.appendChild(li);
    return;
  }
  records.slice(0, 5).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = `${r.name} [${r.avatar}] - ${r.score}`;
    recordsEl.appendChild(li);
  });
}

function commitRecordIfNeeded() {
  if (!game.over || game.recordSaved) return;
  const name = (playerNameEl.value || "Oyuncu").trim().slice(0, 12) || "Oyuncu";
  records.push({ name, avatar: hero.avatar, score: game.score });
  records.sort((a, b) => b.score - a.score);
  records = records.slice(0, 10);
  saveRecords();
  renderRecords();
  game.recordSaved = true;
}

function updateHud() {
  scoreEl.textContent = String(game.score);
  timeEl.textContent = String(Math.max(0, Math.ceil(game.timeLeft)));
  healthEl.textContent = String(Math.max(0, game.health));
  stateEl.textContent = game.status;
  speedFillEl.style.width = `${hero.stamina}%`;
  speedValueEl.textContent = `%${Math.round(hero.stamina)}`;
}

function updateGuards(dt) {
  if (game.over) return;
  const hc = heroCenter();
  guards.forEach((guard) => {
    if (guard.rightOffset) {
      guard.x = canvas.width - guard.rightOffset;
      guard.rightOffset = 0;
    }
    const dx = hc.x - guard.x;
    const dy = hc.y - guard.y;
    const dist = Math.hypot(dx, dy) || 1;
    guard.x += (dx / dist) * guard.speed * dt;
    guard.y += (dy / dist) * guard.speed * dt;
    guard.x = clamp(guard.x, 14, canvas.width - 14);
    guard.y = clamp(guard.y, canvas.height * 0.58, canvas.height - 20);
  });
}

function updateBirds(dt) {
  birds.forEach((bird) => {
    bird.wobble += dt * 8;
    bird.x += bird.vx * dt;
    bird.y += Math.sin(bird.wobble) * 35 * dt;
  });
  for (let i = birds.length - 1; i >= 0; i -= 1) {
    if (birds[i].x < -80 || birds[i].x > canvas.width + 80) birds.splice(i, 1);
  }
  ensureBirds();
}

function applyGameRules(dt) {
  if (game.over) return;
  game.timeLeft -= dt;
  if (game.hitCooldown > 0) game.hitCooldown -= dt;
  if (game.birdCooldown > 0) game.birdCooldown -= dt;

  const hc = heroCenter();
  for (let i = coins.length - 1; i >= 0; i -= 1) {
    const coin = coins[i];
    coin.spin += dt * 6;
    const dist = Math.hypot(hc.x - coin.x, hc.y - coin.y);
    if (dist < coin.r + 15) {
      coins.splice(i, 1);
      game.score += 20;
    }
  }

  if (game.hitCooldown <= 0) {
    for (const guard of guards) {
      const dist = Math.hypot(hc.x - guard.x, hc.y - (guard.y + 8));
      if (dist < 24) {
        game.health -= 12;
        game.score = Math.max(0, game.score - 15);
        game.hitCooldown = 0.8;
        break;
      }
    }
  }

  if (game.birdCooldown <= 0) {
    for (const bird of birds) {
      const dist = Math.hypot(hc.x - bird.x, hc.y - bird.y);
      if (dist < 24) {
        game.score = Math.max(0, game.score - 10);
        hero.stamina = Math.max(0, hero.stamina - 15);
        game.birdCooldown = 0.9;
        break;
      }
    }
  }

  ensureCoins();
  if (game.health <= 0) {
    game.over = true;
    game.status = "Kaybettin";
  } else if (game.score >= game.coinGoal) {
    game.over = true;
    game.status = "Kazandin!";
  } else if (game.timeLeft <= 0) {
    game.over = true;
    game.status = game.score >= game.coinGoal ? "Kazandin!" : "Sure Bitti";
  }
}

function updateMovement(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;
  if (dx !== 0) hero.facing = dx > 0 ? 1 : -1;
  hero.moving = dx !== 0 || dy !== 0;
  game.phase += dt;

  if (hero.moving) hero.stamina = clamp(hero.stamina - dt * 8, 0, 100);
  else hero.stamina = clamp(hero.stamina + dt * 5, 0, 100);

  hero.currentSpeed = hero.baseSpeed * (0.45 + (hero.stamina / 100) * 0.55);
  if (!game.over) {
    const len = Math.hypot(dx, dy) || 1;
    hero.x += ((dx / len) * hero.currentSpeed) * dt;
    hero.y += ((dy / len) * hero.currentSpeed) * dt;
  }
  hero.x = clamp(hero.x, 12, canvas.width - hero.w - 12);
  hero.y = clamp(hero.y, canvas.height * 0.56, canvas.height - hero.h - 16);
}

function update(dt) {
  updateMovement(dt);
  updateGuards(dt);
  updateBirds(dt);
  applyGameRules(dt);
  commitRecordIfNeeded();
  updateHud();
}

function resetGame() {
  game.score = 0;
  game.health = 100;
  game.timeLeft = 90;
  game.status = "Devam";
  game.over = false;
  game.hitCooldown = 0;
  game.birdCooldown = 0;
  game.recordSaved = false;
  hero.stamina = 100;
  hero.x = 420;
  hero.y = Math.max(canvas.height * 0.69, 510);
  guards[0].x = 105; guards[0].y = 520;
  guards[1].x = 215; guards[1].y = 518;
  guards[2].x = canvas.width - 190; guards[2].y = 517;
  guards[3].x = canvas.width - 310; guards[3].y = 514;
  coins.length = 0;
  birds.length = 0;
  ensureCoins();
  ensureBirds();
}

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.035);
  lastTime = now;
  update(dt);
  drawScene();
  requestAnimationFrame(tick);
}

function setWorldMode(mode) {
  worldMode = mode;
  modeDayBtn.classList.toggle("active", mode === "day");
  modeNightBtn.classList.toggle("active", mode === "night");
}

function setTopMenuActive(activeBtn) {
  [btnHome, btnCharacters, btnQuests, btnSettings].forEach((btn) => {
    btn.classList.toggle("active", btn === activeBtn);
  });
}

btnHome.addEventListener("click", () => {
  setTopMenuActive(btnHome);
  settingsPanelEl.classList.add("hidden-panel");
  questPanelEl.classList.add("hidden-panel");
});

btnCharacters.addEventListener("click", () => {
  setTopMenuActive(btnCharacters);
  settingsPanelEl.classList.add("hidden-panel");
  questPanelEl.classList.add("hidden-panel");
  characterPanelEl.classList.remove("hidden-panel");
});

btnQuests.addEventListener("click", () => {
  setTopMenuActive(btnQuests);
  settingsPanelEl.classList.add("hidden-panel");
  questPanelEl.classList.remove("hidden-panel");
});

btnSettings.addEventListener("click", () => {
  setTopMenuActive(btnSettings);
  settingsPanelEl.classList.toggle("hidden-panel");
  questPanelEl.classList.add("hidden-panel");
});

modeDayBtn.addEventListener("click", () => setWorldMode("day"));
modeNightBtn.addEventListener("click", () => setWorldMode("night"));

avatarButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    avatarButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    hero.avatar = btn.dataset.avatar || "KA";
    avatarPreviewEl.textContent = hero.avatar;
  });
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "r" && game.over) resetGame();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener("resize", () => {
  resizeCanvas();
  ensureCoins();
  ensureBirds();
});

resizeCanvas();
setWorldMode("day");
loadRecords();
renderRecords();
resetGame();
requestAnimationFrame(tick);
