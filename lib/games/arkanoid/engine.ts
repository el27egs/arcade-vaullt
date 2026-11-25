// ===== lib/games/arkanoid/engine.ts — motor canvas de ARKANOID =====
// Port a TypeScript de references/started-games/04-arkanoid/game.js.
// Sin globals: el canvas, la imagen y los sonidos son de cada instancia.
import type { GameCallbacks, GameEngine } from "@/lib/games/types";
import type { StandardSkinId } from "@/lib/games/skins";
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
// ── Skins ─────────────────────────────────────────────────────────────────────
// clasico: spritesheet original. retro: fósforo verde de CRT, bloques planos y
// scanlines. neon: paleta de Arcade Vault con halo. retro y neon se dibujan en
// vectorial (fillRect / arc) con los colores del skin. Lo elige React con setSkin.
export type ArkanoidSkinId = StandardSkinId;
interface Skin {
  sprites: boolean; // true: dibuja con el spritesheet; false: vectorial
  glow: number; // shadowBlur del halo; 0 = sin halo
  scanlines: boolean; // líneas de barrido CRT sobre todo el canvas
  roundBall: boolean; // pelota circular (vectorial) o cuadrada
  bg: string;
  blocks: Record<BlockColor, string>; // color de cada bloque (vectorial)
  // Solo sprites: aclarado "screen" sobre el sprite para llegar a 3:1 en oscuro.
  spriteLift: Partial<Record<BlockColor, string>>;
  blockCore: string | null; // relleno interior del bloque (tubo de neón)
  paddle: string;
  ball: string;
  hudText: string;
  overlayBg: string; // velo de game over / victoria
  overlayTitle: string;
  overlayText: string;
  pauseBg: string; // velo del selector de nivel
  pauseText: string;
  btnBg: string;
  btnActiveBg: string;
  btnBorder: string;
  btnText: string;
  btnActiveText: string;
  scanline: string;
}
const SKINS: Record<ArkanoidSkinId, Skin> = {
  clasico: {
    sprites: true,
    glow: 0,
    scanlines: false,
    roundBall: true,
    bg: "#000",
    // Color dominante de cada sprite (referencia; clasico dibuja los sprites).
    blocks: {
      gray: "#5f5e6c",
      red: "#c02a3e",
      yellow: "#d9bd4c",
      cyan: "#4fc99c",
      magenta: "#632ff4",
      hotpink: "#fc7d1c",
      green: "#44aaf3",
    },
    spriteLift: { gray: "#383838" },
    blockCore: null,
    paddle: "#babac5",
    ball: "#babac5",
    hudText: "#fff",
    overlayBg: "rgba(0, 0, 0, 0.75)",
    overlayTitle: "#fff",
    overlayText: "#fff",
    pauseBg: "rgba(0, 0, 0, 0.75)",
    pauseText: "#fff",
    btnBg: "#444",
    btnActiveBg: "#f0c040",
    btnBorder: "#fff",
    btnText: "#fff",
    btnActiveText: "#000",
    scanline: "rgba(0, 0, 0, 0)",
  },
  retro: {
    sprites: false,
    glow: 0,
    scanlines: true,
    roundBall: false,
    bg: "#020a04",
    blocks: {
      gray: "#3f8f55",
      red: "#39ff6e",
      yellow: "#b6ff7a",
      cyan: "#2ee06a",
      magenta: "#22b852",
      hotpink: "#8cffa0",
      green: "#1fd65e",
    },
    spriteLift: {},
    blockCore: null,
    paddle: "#b6ff7a",
    ball: "#e0ffe4",
    hudText: "#39ff6e",
    overlayBg: "rgba(2, 10, 4, 0.8)",
    overlayTitle: "#b6ff7a",
    overlayText: "#39ff6e",
    pauseBg: "rgba(2, 10, 4, 0.8)",
    pauseText: "#39ff6e",
    btnBg: "#06240f",
    btnActiveBg: "#39ff6e",
    btnBorder: "#39ff6e",
    btnText: "#39ff6e",
    btnActiveText: "#021006",
    scanline: "rgba(0, 0, 0, 0.25)",
  },
  neon: {
    sprites: false,
    glow: 14,
    scanlines: false,
    roundBall: true,
    bg: "#0a0a0f",
    blocks: {
      gray: "#c7d0e0",
      red: "#ff006e",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#aa00ff",
      hotpink: "#ff4fd8",
      green: "#00ff88",
    },
    spriteLift: {},
    blockCore: "rgba(10, 10, 15, 0.55)",
    paddle: "#00f5ff",
    ball: "#f5ff00",
    hudText: "#e6e9ff",
    overlayBg: "rgba(10, 10, 15, 0.85)",
    overlayTitle: "#ff006e",
    overlayText: "#e6e9ff",
    pauseBg: "rgba(10, 10, 15, 0.8)",
    pauseText: "#e6e9ff",
    btnBg: "#15151f",
    btnActiveBg: "#ff006e",
    btnBorder: "#00f5ff",
    btnText: "#e6e9ff",
    btnActiveText: "#0a0a0f",
    scanline: "rgba(0, 0, 0, 0)",
  },
};
export const isArkanoidSkin = (id: string): id is ArkanoidSkinId => id in SKINS;
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
  let skin: Skin = SKINS.clasico; // solo lo escribe setSkin
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
  // Halo de neón: se activa antes de dibujar y se resetea siempre después.
  function withGlow(color: string, paint: () => void) {
    if (skin.glow > 0) {
      ctx.shadowBlur = skin.glow;
      ctx.shadowColor = color;
    }
    paint();
    ctx.shadowBlur = 0;
  }
  function drawBlock(block: Block) {
    if (skin.sprites) {
      const { x, y, w, h } = block;
      drawRect(SPRITES.blocks[block.color], x, y, w, h);
      const lift = skin.spriteLift[block.color];
      if (lift) {
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = lift;
        ctx.fillRect(x, y, w, h);
        ctx.globalCompositeOperation = "source-over";
      }
      return;
    }
    const color = skin.blocks[block.color];
    const inset = skin.blockCore ? 3 : 1;
    const { x, y, w, h } = block;
    ctx.fillStyle = color;
    withGlow(color, () =>
      ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2),
    );
    if (skin.blockCore) {
      ctx.fillStyle = skin.blockCore;
      const core = inset + 3;
      ctx.fillRect(x + core, y + core, w - core * 2, h - core * 2);
    }
  }
  // Explosión vectorial: 4 pasos que encogen y apagan el bloque.
  function drawExplosion(exp: Explosion, frame: number) {
    if (skin.sprites) {
      drawRect(EXPLOSION_FRAMES[exp.color][frame], exp.x, exp.y, exp.w, exp.h);
      return;
    }
    const color = skin.blocks[exp.color];
    const dx = (frame + 1) * (exp.w / 10);
    const dy = (frame + 1) * (exp.h / 10);
    ctx.globalAlpha = 1 - frame * 0.22;
    ctx.fillStyle = color;
    withGlow(color, () =>
      ctx.fillRect(exp.x + dx, exp.y + dy, exp.w - dx * 2, exp.h - dy * 2),
    );
    ctx.globalAlpha = 1;
  }
  function drawPaddle() {
    if (skin.sprites) {
      drawRect(SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
      return;
    }
    ctx.fillStyle = skin.paddle;
    withGlow(skin.paddle, () =>
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h),
    );
  }
  function drawBall(x: number, y: number, size: number) {
    if (skin.sprites) {
      drawRect(SPRITES.ball, x, y, size, size);
      return;
    }
    ctx.fillStyle = skin.ball;
    withGlow(skin.ball, () => {
      if (skin.roundBall) {
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      }
    });
  }
  // Líneas de barrido CRT (skin retro): una fila oscura cada 3 px.
  function drawScanlines() {
    ctx.fillStyle = skin.scanline;
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }
  function drawHUD() {
    ctx.fillStyle = skin.hudText;
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
      drawBall(bx, 10, ballSize);
    }
  }
  // Fin de partida: título y puntuación, sin texto de reinicio (lo hace React).
  function drawOverlay(title: string, titleSize: number) {
    ctx.fillStyle = skin.overlayBg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = skin.overlayTitle;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${titleSize}px monospace`;
    withGlow(skin.overlayTitle, () => ctx.fillText(title, W / 2, H / 2 - 24));
    ctx.fillStyle = skin.overlayText;
    ctx.font = "bold 24px monospace";
    ctx.fillText(
      `Puntuación: ${score.toLocaleString("es-ES")}`,
      W / 2,
      H / 2 + 36,
    );
  }
  // Selector de nivel; el título EN PAUSA lo pone GamePlayer.
  function drawPauseOverlay() {
    ctx.fillStyle = skin.pauseBg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = skin.pauseText;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Saltar al nivel:", W / 2, 310);
    for (let i = 0; i < LEVELS.length; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      const isActive = i + 1 === level;
      ctx.fillStyle = isActive ? skin.btnActiveBg : skin.btnBg;
      ctx.strokeStyle = skin.btnBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, PAUSE_BTN_Y, PAUSE_BTN_W, PAUSE_BTN_H, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isActive ? skin.btnActiveText : skin.btnText;
      ctx.font = "bold 20px monospace";
      ctx.fillText(
        String(i + 1),
        bx + PAUSE_BTN_W / 2,
        PAUSE_BTN_Y + PAUSE_BTN_H / 2,
      );
    }
  }
  function draw() {
    ctx.fillStyle = skin.bg;
    ctx.fillRect(0, 0, W, H);
    if (!sheetLoaded) return;
    for (const block of blocks) if (block.alive) drawBlock(block);
    for (const exp of explosions) {
      const frame = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      drawExplosion(exp, frame);
    }
    drawPaddle();
    drawBall(ball.x, ball.y, ball.w);
    if (state === "playing") drawHUD();
    // 64 px como el original no cabe en 800 px con el texto de victoria.
    if (state === "gameover") drawOverlay("GAME OVER", 64);
    if (state === "win") drawOverlay("¡Completaste el juego!", 44);
    if (paused && state === "playing") drawPauseOverlay();
    if (skin.scanlines) drawScanlines();
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
    setSkin(id: string) {
      if (!isArkanoidSkin(id)) return;
      skin = SKINS[id];
      draw(); // al instante, también en pausa o en game over
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
