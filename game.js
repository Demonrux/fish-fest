const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function rollRarity() {
  const r = Math.random();
  let acc = 0;
  for (const [key, chance] of Object.entries(RARITY_CHANCES)) {
    acc += chance;
    if (r <= acc) return key;
  }
  return 'common';
}

const state = {
  screen: 'MAP',
  location: null,
  rarity: null,
  hitsLeft: 0,
};

let timeLeft = GAME_DURATION_SEC;
let timerInterval = null;

function startGlobalTimer() {
  if (timerInterval) return;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      endGameByTime();
    }
  }, 1000);
}

function resetGlobalTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timeLeft = GAME_DURATION_SEC;
  timerStarted = false;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const el = $('#timerValue');
  if (!el) return;

  el.textContent = timeLeft;

  const wrap = el.closest('.top-bar-timer');
  if (wrap) wrap.classList.toggle('low', timeLeft <= 15);

  const fill = document.getElementById('timerFill');
  if (fill) {
    const pct = (timeLeft / GAME_DURATION_SEC) * 100;
    fill.style.width = pct + '%';
  }
}

function endGameByTime() {
  if (timingRAF) { cancelAnimationFrame(timingRAF); timingRAF = null; }
  if (followRAF) { cancelAnimationFrame(followRAF); followRAF = null; }
  followState = null;

  $('#resultRarity').textContent = 'Время вышло';
  $('#resultRarity').className = 'result-rarity';
  $('#resultFish').innerHTML = '<i class="fa-solid fa-hourglass-end"></i>';
  $('#resultText').textContent = 'Ты не успел поймать свою удачу. Попробуй ещё раз!';

  showScreen('RESULT');
  Sound.fail();
}

function showScreen(name) {
  state.screen = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));

  if (name === 'MAP') {
    resetGlobalTimer();
    Sound.music('map');
  }
}

function renderMap() {
  const container = $('#mapPoints');
  container.innerHTML = '';
  LOCATIONS.forEach(loc => {
    const point = document.createElement('div');
    point.className = 'map-point';
    point.style.left = loc.x + '%';
    point.style.top  = loc.y + '%';
    point.innerHTML = `
      <div class="map-point-preview" style="background-image: url('${loc.bg}')"></div>
      <i class="fa-solid ${loc.icon}"></i>
      <span class="label">${loc.name}</span>
    `;
    point.addEventListener('click', () => {
      Sound.click();
      enterLocation(loc);
    });
    container.appendChild(point);
  });
}

let timerStarted = false;

function enterLocation(loc) {
  state.location = loc;
  $('#locationName').textContent = loc.name;

  const bgUrl = `url('${loc.bg}')`;
['#locationBg', '#castingBg', '#timingBg', '#followingBg', '#resultBg'].forEach(sel => {
  const el = $(sel);
  if (el) el.style.backgroundImage = bgUrl;
});

  showScreen('LOCATION');
  Sound.music(loc.music || 'location');
}

function startCasting() {
  Sound.cast();
  showScreen('CASTING');

    if (!timerStarted) {
    timerStarted = true;
    startGlobalTimer();
  }


  const waitMs = rand(2000, 8000);
  setTimeout(() => {
    if (state.screen !== 'CASTING') return; 
    state.rarity = rollRarity();
    Sound.bite();
    startTiming();
  }, waitMs);
}

let timingRAF = null;
let timingPos = 0;
let timingDir = 1;
let timingZoneStart = 0;
let timingZoneSize = 0;
let lastTimingTime = 0;

function startTiming() {
  const cfg = RARITY_CONFIG[state.rarity];
  state.hitsLeft = cfg.hits;
  timingZoneSize = cfg.zoneSize;
  timingZoneStart = rand(10, 90 - timingZoneSize);
  timingPos = 0;
  timingDir = 1;
  lastTimingTime = performance.now();

  $('#timingHits').textContent = `Осталось: ${state.hitsLeft}`;

  const zone = $('#timingZone');
  zone.style.left  = timingZoneStart + '%';
  zone.style.width = timingZoneSize + '%';

  showScreen('TIMING');
  Sound.rarity(state.rarity);

  if (timingRAF) cancelAnimationFrame(timingRAF);
  timingRAF = requestAnimationFrame(timingLoop);
}

function timingLoop(now) {
  const dt = Math.min(now - lastTimingTime, 50) / 1000;
  lastTimingTime = now;

  const cfg = RARITY_CONFIG[state.rarity];
  const speed = 90 * cfg.cursorSpeed;

  timingPos += timingDir * speed * dt;
  if (timingPos >= 100) { timingPos = 100; timingDir = -1; }
  if (timingPos <= 0)   { timingPos = 0;   timingDir = 1; }

  $('#timingCursor').style.left = timingPos + '%';
  timingRAF = requestAnimationFrame(timingLoop);
}

function handleTimingTap() {
  if (state.screen !== 'TIMING') return;

  const inZone = timingPos >= timingZoneStart &&
                 timingPos <= timingZoneStart + timingZoneSize;

  if (inZone) {
    Sound.hit();
    state.hitsLeft--;
    $('#timingHits').textContent = `Осталось: ${state.hitsLeft}`;
    flashBar('#38d66b');
    if (state.hitsLeft <= 0) {
      cancelAnimationFrame(timingRAF);
      timingRAF = null;
      startFollowing();
    }
  } else {
    Sound.miss();
    flashBar('#ff3b3b');
    failCatch();
  }
}

function flashBar(color) {
  const bar = $('.timing-bar');
  bar.style.boxShadow = `0 0 24px ${color}`;
  setTimeout(() => bar.style.boxShadow = '', 150);
}

const canvas = $('#followCanvas');
const ctx = canvas.getContext('2d');
let followRAF = null;
let followState = null;

function startFollowing() {
  showScreen('FOLLOWING');

  const size = Math.min(window.innerWidth, window.innerHeight) * 0.7;
  canvas.width  = size;
  canvas.height = size;

  const cfg = RARITY_CONFIG[state.rarity];

  followState = {
    player: { x: canvas.width / 2, y: canvas.height / 2 },
    mouse:  { x: canvas.width / 2, y: canvas.height / 2 },
    target: {
      x: canvas.width / 2,
      y: canvas.height / 2,
      r: cfg.followRadius,
      vx: 0,
      vy: 0,
      destX: canvas.width / 2,
      destY: canvas.height / 2,
      retargetTimer: 0,
    },
    progress: 40,
    speed: cfg.followSpeed,
    lastTime: performance.now(),
    trail: [],              
};

  $('#progressFill').style.width = '40%';

  if (followRAF) cancelAnimationFrame(followRAF);
  followRAF = requestAnimationFrame(followLoop);
}

canvas.addEventListener('mousemove', (e) => {
  if (!followState) return;
  const rect = canvas.getBoundingClientRect();
  followState.mouse.x = e.clientX - rect.left;
  followState.mouse.y = e.clientY - rect.top;
});

function followLoop(now) {
  if (!followState) return;
  const dt = Math.min(now - followState.lastTime, 50) / 1000;
  followState.lastTime = now;

  const s = followState;

  s.player.x += (s.mouse.x - s.player.x) * 0.03;
  s.player.y += (s.mouse.y - s.player.y) * 0.03;

  s.trail.push({ x: s.player.x, y: s.player.y });
  if (s.trail.length > 18) s.trail.shift();

  s.target.retargetTimer -= dt;
  if (s.target.retargetTimer <= 0) {
    s.target.destX = rand(s.target.r, canvas.width  - s.target.r);
    s.target.destY = rand(s.target.r, canvas.height - s.target.r);
    s.target.retargetTimer = rand(1.5, 2.8) / s.speed;
  }

  const dxT = s.target.destX - s.target.x;
  const dyT = s.target.destY - s.target.y;
  const pull = 1.2 * s.speed;
  s.target.vx += dxT * pull * dt;
  s.target.vy += dyT * pull * dt;

  const damp = Math.pow(0.06, dt);
  s.target.vx *= damp;
  s.target.vy *= damp;

  s.target.x += s.target.vx * dt;
  s.target.y += s.target.vy * dt;

  if (s.target.x < s.target.r)                { s.target.x = s.target.r;                s.target.vx *= -0.5; }
  if (s.target.x > canvas.width  - s.target.r){ s.target.x = canvas.width  - s.target.r; s.target.vx *= -0.5; }
  if (s.target.y < s.target.r)                { s.target.y = s.target.r;                s.target.vy *= -0.5; }
  if (s.target.y > canvas.height - s.target.r){ s.target.y = canvas.height - s.target.r; s.target.vy *= -0.5; }

  const dx = s.player.x - s.target.x;
  const dy = s.player.y - s.target.y;
  const dist = Math.hypot(dx, dy);
  const inZone = dist < s.target.r;

  s.progress += inZone ? 20 * dt : -25 * dt;
  s.progress = Math.max(0, Math.min(100, s.progress));

  if (s.progress <= 0) {
    followRAF = null;
    failCatch();
    return;
  }

  $('#progressFill').style.width = s.progress + '%';

  drawFollow(s, inZone);

  if (s.progress >= 100) {
    cancelAnimationFrame(followRAF);
    followRAF = null;
    succeedCatch();
    return;
  }

  followRAF = requestAnimationFrame(followLoop);
}

function drawFollow(s, inZone) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(s.target.x, s.target.y, s.target.r, 0, Math.PI * 2);
  ctx.fillStyle = inZone ? 'rgba(56,214,107,0.25)' : 'rgba(255,60,60,0.18)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = inZone ? '#38d66b' : '#ff3b3b';
  ctx.stroke();

  const n = s.trail.length;
  for (let i = 0; i < n; i++) {
    const t = s.trail[i];
    const k = i / n;                        
    const radius = 2 + k * 8;               
    const alpha  = 0.05 + k * 0.35;         

    ctx.beginPath();
    ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 122, 0, ${alpha})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(s.player.x, s.player.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ff7a00';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}

function spawnConfetti(count = 60) {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;

  layer.innerHTML = '';  

  const colors = ['#ffb84d', '#ff7a00', '#38d66b', '#4da3ff', '#ff3b3b', '#fff'];

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'confetti';

    el.style.left = Math.random() * 100 + '%';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    el.style.setProperty('--rot', (Math.random() * 1080 - 540) + 'deg');
    el.style.setProperty('--delay', (Math.random() * 0.8) + 's');
    el.style.setProperty('--dur', (2.5 + Math.random() * 1.5) + 's');

    const shape = Math.random();
    if (shape < 0.3) {
      el.style.borderRadius = '50%';
      el.style.width = '8px';
      el.style.height = '8px';
    } else if (shape < 0.6) {
      el.style.borderRadius = '2px';
      el.style.width = '10px';
      el.style.height = '10px';
    }

    layer.appendChild(el);
  }

  setTimeout(() => { layer.innerHTML = ''; }, 5000);
}

function succeedCatch() {
  const cfg = RARITY_CONFIG[state.rarity];
  const text = pick(PREDICTIONS[state.rarity]);

  $('#resultRarity').textContent = cfg.label;
  $('#resultRarity').className = 'result-rarity ' + state.rarity;
  $('#resultFish').className = 'result-fish ' + state.rarity;
  $('#resultText').textContent = text;

  showScreen('RESULT');
  Sound.success(state.rarity);
  spawnConfetti();
}

function failCatch() {
  if (timingRAF) { cancelAnimationFrame(timingRAF); timingRAF = null; }
  if (followRAF) { cancelAnimationFrame(followRAF); followRAF = null; }
  followState = null;

  $('#resultRarity').textContent = 'Сорвалась…';
  $('#resultRarity').className = 'result-rarity';
  $('#resultFish').innerHTML = '<i class="fa-solid fa-wind"></i>';

  showScreen('RESULT');
  Sound.fail();
}

$('#btnCast').addEventListener('click',      () => { Sound.click(); startCasting(); });
$('#btnAgain').addEventListener('click',     () => { Sound.click(); showScreen('MAP'); });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); handleTimingTap(); }
});
$('.timing-bar').addEventListener('click', handleTimingTap);

renderMap();
showScreen('MAP');