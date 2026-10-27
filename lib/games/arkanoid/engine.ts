// ===== lib/games/arkanoid/engine.ts — motor canvas de ARKANOID =====
// Port a TypeScript de references/started-games/04-arkanoid/game.js.
// Sin globals: el canvas, la imagen y los sonidos son de cada instancia.
import type { GameCallbacks, GameEngine } from "@/lib/games/types";
import { LEVELS, type BlockColor } from "@/lib/games/arkanoid/levels";
import {
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  SPRITES,
  type SpriteRect,
} from "@/lib/games/arkanoid/sprites";
// ── Constantes ────────────────────────────────────────────────────────────────
const W = 800;
const H = 600;
const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const START_LIVES = 3;
const BLOCK_POINTS = 10;
// Selector de nivel de la pausa
const PAUSE_BTN_W = 60;
const PAUSE_BTN_H = 40;
const PAUSE_BTN_GAP = 12;
const PAUSE_BTN_Y = 340;
const PAUSE_BTN_ROW_X = (W - (5 * PAUSE_BTN_W + 4 * PAUSE_BTN_GAP)) / 2;
const ASSETS = "/games/arkanoid";
// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Ball extends Rect {
  vx: number;
  vy: number;
}
interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}
interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number; // ms
}
// ── Contrato con React ────────────────────────────────────────────────────────
// Común a todos los juegos (lib/games/types.ts). restart(): nivel 1, score 0,
// 3 vidas y paleta centrada.
const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable);
export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("ARKANOID: canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Assets ──────────────────────────────────────────────────────────────────
  let sheetLoaded = false;
  const sheet = new Image();
  sheet.onload = () => {
    sheetLoaded = true;
  };
  sheet.src = `${ASSETS}/spritesheet-breakout.png`;
  const bounceSound = new Audio(`${ASSETS}/sounds/ball-bounce.mp3`);
  const breakSound = new Audio(`${ASSETS}/sounds/break-sound.mp3`);
  function play(sound: HTMLAudioElement) {
    const clone = sound.cloneNode() as HTMLAudioElement;
    // El navegador puede bloquear el audio antes del primer gesto: se ignora.
    clone.play().catch(() => {});
  }
  // ── Estado del juego ────────────────────────────────────────────────────────
  let state: "playing" | "gameover" | "win" = "playing";
  let paused = false; // solo lo escribe setPaused
  let score = 0;
  let lives = START_LIVES;
  let level = 1;
  const paddle: Rect = { x: (W - 81) / 2, y: 560, w: 81, h: 14 };
  const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: 0, vy: 0 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  const keys = { ArrowLeft: false, ArrowRight: false };
  // Últimos valores notificados a React (para avisar solo-al-cambiar)
  let sentScore: number | null = null;
  let sentLives: number | null = null;
  let sentLevel: number | null = null;
  let sentGameOver = false;
  function clearInput() {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  }
  function initBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    initBall();
  }
  function initGame() {
    paddle.x = (W - paddle.w) / 2;
    score = 0;
    lives = START_LIVES;
    state = "playing";
    sentGameOver = false;
    loadLevel(1);
  }
  // Saltar de nivel desde la pausa: partida nueva en ese nivel.
  function jumpToLevel(n: number) {
    loadLevel(n);
    score = 0;
    lives = START_LIVES;
  }
  function collideAABB(block: Rect) {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }
  function notify() {
    if (score !== sentScore) callbacks.onScore((sentScore = score));
    if (lives !== sentLives) callbacks.onLives?.((sentLives = lives));
    if (level !== sentLevel) callbacks.onLevel?.((sentLevel = level));
    if (state !== "playing" && !sentGameOver) {
      sentGameOver = true;
      callbacks.onGameOver(score);
    }
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state !== "playing") return;
    // Paleta
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    // Pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebote en paredes (izquierda, derecha, arriba)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      play(bounceSound);
    }
    // Rebote en la paleta
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      play(bounceSound);
    }
    // Bloques: uno por frame
    for (const block of blocks) {
      if (!block.alive || !collideAABB(block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      play(breakSound);
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) loadLevel(level + 1);
        else state = "win";
      }
      break;
    }
    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        state = "gameover";
      } else {
        initBall();
      }
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawRect(
    sp: SpriteRect,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }
  function drawHUD() {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Score: ${score.toLocaleString("es-ES")}`, 10, 10);
    ctx.textAlign = "center";
    ctx.fillText(`Nivel: ${level}`, W / 2, 10);
    const ballSize = 16;
    const ballSpacing = 4;
    for (let i = 0; i < lives; i++) {
      const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
      drawRect(SPRITES.ball, bx, 10, ballSize, ballSize);
    }
  }
  // Fin de partida: título y puntuación, sin texto de reinicio (lo hace React).
  function drawOverlay(title: string, titleSize: number) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.fillText(title, W / 2, H / 2 - 24);
    ctx.font = "bold 24px monospace";
    ctx.fillText(
      `Puntuación: ${score.toLocaleString("es-ES")}`,
      W / 2,
      H / 2 + 36,
    );
  }
  // Selector de nivel; el título EN PAUSA lo pone GamePlayer.
  function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Saltar al nivel:", W / 2, 310);
    for (let i = 0; i < LEVELS.length; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      const isActive = i + 1 === level;
      ctx.fillStyle = isActive ? "#f0c040" : "#444";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, PAUSE_BTN_Y, PAUSE_BTN_W, PAUSE_BTN_H, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isActive ? "#000" : "#fff";
      ctx.font = "bold 20px monospace";
      ctx.fillText(
        String(i + 1),
        bx + PAUSE_BTN_W / 2,
        PAUSE_BTN_Y + PAUSE_BTN_H / 2,
      );
    }
  }
  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (!sheetLoaded) return;
    for (const block of blocks) {
      if (block.alive)
        drawRect(
          SPRITES.blocks[block.color],
          block.x,
          block.y,
          block.w,
          block.h,
        );
    }
    for (const exp of explosions) {
      const frame = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      drawRect(EXPLOSION_FRAMES[exp.color][frame], exp.x, exp.y, exp.w, exp.h);
    }
    drawRect(SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
    drawRect(SPRITES.ball, ball.x, ball.y, ball.w, ball.h);
    if (state === "playing") drawHUD();
    // 64 px como el original no cabe en 800 px con el texto de victoria.
    if (state === "gameover") drawOverlay("GAME OVER", 64);
    if (state === "win") drawOverlay("¡Completaste el juego!", 44);
    if (paused && state === "playing") drawPauseOverlay();
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  // Coordenadas del puntero en el espacio lógico 800×600.
  function toCanvas(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    };
  }
  function onKeyDown(e: KeyboardEvent) {
    // En pausa, al terminar o escribiendo en un input, el juego no toca el teclado.
    if (paused || state !== "playing" || isTypingTarget(e.target)) return;
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    keys[e.code as keyof typeof keys] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    if (GAME_KEYS.has(e.code)) keys[e.code as keyof typeof keys] = false;
  }
  function onMouseMove(e: MouseEvent) {
    if (paused || state !== "playing") return;
    const { x } = toCanvas(e);
    paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
  }
  function onClick(e: MouseEvent) {
    // El clic solo actúa en el selector de nivel de la pausa.
    if (!paused || state !== "playing") return;
    const { x, y } = toCanvas(e);
    for (let i = 0; i < LEVELS.length; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      if (
        x >= bx &&
        x <= bx + PAUSE_BTN_W &&
        y >= PAUSE_BTN_Y &&
        y <= PAUSE_BTN_Y + PAUSE_BTN_H
      ) {
        // Sigue en pausa: solo React reanuda.
        jumpToLevel(i + 1);
        draw();
        notify();
        return;
      }
    }
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let started = false;
  function loop(ts: number) {
    // En pausa (o sin spritesheet) se sigue dibujando pero no se avanza.
    if (!paused && sheetLoaded) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      update(dt);
    } else {
      lastTime = null;
    }
    draw();
    notify();
    rafId = requestAnimationFrame(loop);
  }
  initGame();
  return {
    start() {
      if (started) return;
      started = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("click", onClick);
      draw();
      notify();
      rafId = requestAnimationFrame(loop);
    },
    setPaused(next: boolean) {
      if (next === paused) return;
      paused = next;
      // Las teclas sostenidas no siguen activas y la pausa no cuenta como dt.
      clearInput();
      lastTime = null;
    },
    end() {
      if (state !== "playing") return;
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
      sheet.onload = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      started = false;
    },
  };
}
