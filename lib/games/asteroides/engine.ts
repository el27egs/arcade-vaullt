// ===== lib/games/asteroides/engine.ts — motor canvas de ASTEROIDES =====
// Port a TypeScript de references/started-games/02-asteroids/game.js.
// Sin globals: el contexto y el input llegan por parámetro.
import type {
  GameCallbacks,
  GameEngine,
  GameLayout,
} from "@/lib/games/types";
import type { StandardSkinId } from "@/lib/games/skins";
// Tamaño del mundo (= canvas lógico). Horizontal (escritorio): 800×600.
// Vertical (táctil, SPEC 10): 600×800. Lo cambia solo setLayout del motor
// activo; createAsteroidesEngine lo devuelve a horizontal.
const LAYOUTS = {
  landscape: { w: 800, h: 600 },
  portrait: { w: 600, h: 800 },
} as const;
let W: number = LAYOUTS.landscape.w;
let H: number = LAYOUTS.landscape.h;
type Keys = Record<string, boolean>;
// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
// ── Constants ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;
const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño
// ── Skins ─────────────────────────────────────────────────────────────────────
// clasico: el look vectorial original (blanco sobre negro). retro: fósforo verde
// de CRT monocromo, sin glow y con scanlines. neon: paleta de Arcade Vault con
// halo. El skin activo lo elige React con setSkin.
export type AsteroidesSkinId = StandardSkinId;
interface Skin {
  bg: string; // fondo del canvas
  ship: string;
  flame: string; // llama del propulsor
  bullet: string;
  asteroid: string;
  particle: string; // se desvanece con globalAlpha
  powerUp: string; // rombo y texto "3x"
  hud: string; // SCORE / NIVEL
  hudAccent: string; // contador de triple disparo
  lifeIcon: string;
  overlayBg: string; // velo de GAME OVER
  overTitle: string;
  overSub: string;
  glow: boolean; // halo (shadowBlur) en las entidades
  scanlines: string | null; // color de las scanlines o null
}
const SKINS: Record<AsteroidesSkinId, Skin> = {
  clasico: {
    bg: "#000",
    ship: "#fff",
    flame: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    particle: "#fff",
    powerUp: "#0ff",
    hud: "#fff",
    hudAccent: "#0ff",
    lifeIcon: "#fff",
    overlayBg: "rgba(0, 0, 0, 0.7)",
    overTitle: "#fff",
    overSub: "rgba(255,255,255,0.65)",
    glow: false,
    scanlines: null,
  },
  retro: {
    bg: "#020a04",
    ship: "#ccffcc",
    flame: "#22aa44",
    bullet: "#ccffcc",
    asteroid: "#33ff66",
    particle: "#22aa44",
    powerUp: "#ccffcc",
    hud: "#33ff66",
    hudAccent: "#ccffcc",
    lifeIcon: "#33ff66",
    overlayBg: "rgba(2, 10, 4, 0.75)",
    overTitle: "#ccffcc",
    overSub: "#22aa44",
    glow: false,
    scanlines: "rgba(0, 0, 0, 0.28)",
  },
  neon: {
    bg: "#0a0a0f",
    ship: "#00f5ff",
    flame: "#ff7700",
    bullet: "#f5ff00",
    asteroid: "#ff006e",
    particle: "#aa00ff",
    powerUp: "#00ff88",
    hud: "#e6e9ff",
    hudAccent: "#00ff88",
    lifeIcon: "#00f5ff",
    overlayBg: "rgba(10, 10, 15, 0.8)",
    overTitle: "#ff006e",
    overSub: "#8a8fb5",
    glow: true,
    scanlines: null,
  },
};
export const isAsteroidesSkin = (id: string): id is AsteroidesSkinId =>
  id in SKINS;
// Halo de neón: solo si el skin lo pide. Quien lo active llama a noGlow después.
function glow(ctx: CanvasRenderingContext2D, skin: Skin, color: string) {
  if (!skin.glow) return;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
}
function noGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
}
// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;
  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, skin: Skin) {
    ctx.fillStyle = skin.bullet;
    glow(ctx, skin, skin.bullet);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    noGlow(ctx);
  }
}
// ── Asteroid ──────────────────────────────────────────────────────────────────
class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];
  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }
  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }
  draw(ctx: CanvasRenderingContext2D, skin: Skin) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = skin.asteroid;
    glow(ctx, skin, skin.asteroid);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    noGlow(ctx);
    ctx.restore();
  }
}
// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, skin: Skin) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = skin.powerUp;
    glow(ctx, skin, skin.powerUp);
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    noGlow(ctx);
    ctx.restore();
    ctx.fillStyle = skin.powerUp;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}
// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  tripleShot = 0;
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  dead = false;
  constructor() {
    this.reset();
  }
  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }
  update(dt: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;
    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;
    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;
    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }
  draw(ctx: CanvasRenderingContext2D, skin: Skin) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.ship;
    glow(ctx, skin, skin.ship);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();
    noGlow(ctx);
    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = skin.flame;
      glow(ctx, skin, skin.flame);
      ctx.stroke();
      noGlow(ctx);
    }
    ctx.restore();
  }
}
// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }
  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D, skin: Skin) {
    const alpha = this.ttl / this.life;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.strokeStyle = skin.particle;
    glow(ctx, skin, skin.particle);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    noGlow(ctx);
    ctx.globalAlpha = 1;
  }
}
// ── Contrato con React ────────────────────────────────────────────────────────
// Común a todos los juegos (lib/games/types.ts). restart(): score 0, 3 vidas,
// nivel 1, nueva oleada.
const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable);
export function createAsteroidesEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("ASTEROIDES: canvas 2D no disponible");
  let layout: GameLayout = "landscape";
  W = LAYOUTS.landscape.w;
  H = LAYOUTS.landscape.h;
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};
  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }
  function clearInput() {
    for (const k in keys) keys[k] = false;
    for (const k in justPressed) justPressed[k] = false;
  }
  function onKeyDown(e: KeyboardEvent) {
    // En pausa, en gameover o escribiendo en un input, el juego no toca el teclado.
    if (paused || state === "gameover" || isTypingTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }
  // ── Estado del juego ────────────────────────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let state: "playing" | "dead" | "gameover";
  let deadTimer = 0;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;
  let paused = false; // solo lo escribe setPaused
  let skin: Skin = SKINS.clasico; // solo lo escribe setSkin
  // Últimos valores notificados a React (para avisar solo-al-cambiar)
  let sentScore: number | null = null;
  let sentLives: number | null = null;
  let sentLevel: number | null = null;
  let sentGameOver = false;
  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    sentGameOver = false;
    spawnAsteroids(4);
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }
  function notify() {
    if (score !== sentScore) callbacks.onScore((sentScore = score));
    if (lives !== sentLives) callbacks.onLives?.((sentLives = lives));
    if (level !== sentLevel) callbacks.onLevel?.((sentLevel = level));
    if (state === "gameover" && !sentGameOver) {
      sentGameOver = true;
      callbacks.onGameOver(score);
    }
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      // El reinicio ya no es con Espacio: solo llega desde React con restart().
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = skin.lifeIcon;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  function drawHUD() {
    ctx.fillStyle = skin.hud;
    ctx.font = "15px monospace";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${score}`, 14, 26);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, W / 2, 26);
    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);
    if (ship.tripleShot > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = skin.hudAccent;
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }
  function drawOverlay(title: string, sub: string) {
    ctx.fillStyle = skin.overlayBg;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = skin.overTitle;
    glow(ctx, skin, skin.overTitle);
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    noGlow(ctx);
    ctx.font = "18px monospace";
    ctx.fillStyle = skin.overSub;
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }
  // Scanlines de CRT: líneas horizontales finas cada 3 px (solo skin retro).
  function drawScanlines(color: string) {
    ctx.fillStyle = color;
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }
  function draw() {
    ctx.fillStyle = skin.bg;
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx, skin));
    asteroids.forEach((a) => a.draw(ctx, skin));
    powerUps.forEach((p) => p.draw(ctx, skin));
    bullets.forEach((b) => b.draw(ctx, skin));
    ship.draw(ctx, skin);
    drawHUD();
    if (state === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
    if (skin.scanlines) drawScanlines(skin.scanlines);
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let started = false;
  function loop(ts: number) {
    if (!paused) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      update(dt);
      draw();
      notify();
    }
    rafId = requestAnimationFrame(loop);
  }
  initGame();
  return {
    start() {
      if (started) return;
      started = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      draw();
      notify();
      rafId = requestAnimationFrame(loop);
    },
    setLayout(next: GameLayout) {
      if (!(next in LAYOUTS) || next === layout) return;
      // Las posiciones se reescalan al mundo nuevo: nada queda fuera.
      const sx = LAYOUTS[next].w / W;
      const sy = LAYOUTS[next].h / H;
      layout = next;
      W = LAYOUTS[next].w;
      H = LAYOUTS[next].h;
      canvas.width = W; // redimensionar borra el canvas: se redibuja
      canvas.height = H;
      for (const e of [ship, ...bullets, ...asteroids, ...particles]) {
        e.x *= sx;
        e.y *= sy;
      }
      draw();
    },
    setSkin(id: string) {
      if (!isAsteroidesSkin(id)) return;
      skin = SKINS[id];
      // Redibuja ya: el loop no pinta en pausa ni hay cambios en game over.
      draw();
    },
    setPaused(next: boolean) {
      if (next === paused) return;
      paused = next;
      // Las teclas sostenidas al pausar no deben seguir activas al reanudar,
      // y el tiempo de la pausa no cuenta como dt.
      clearInput();
      if (!paused) lastTime = null;
    },
    end() {
      if (state === "gameover") return;
      state = "gameover";
      clearInput();
      draw();
      notify();
    },
    restart() {
      initGame();
      clearInput();
      lastTime = null;
      draw();
      notify();
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      started = false;
    },
  };
}
