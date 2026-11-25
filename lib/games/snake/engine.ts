// ===== lib/games/snake/engine.ts — motor canvas de SNAKE =====
// Diseño original del género "serpiente" (SPEC 09), sin código de referencia.
// Sin globals: el canvas y la imagen de frutas son de cada instancia.
import type { GameCallbacks, GameEngine } from "@/lib/games/types";
import type { StandardSkinId } from "@/lib/games/skins";
import {
  BONUS_SPRITE,
  FRUIT_SPRITES,
  type FruitName,
  type SpriteRect,
} from "@/lib/games/snake/sprites";
// ── Constantes ────────────────────────────────────────────────────────────────
const W = 800;
const H = 800;
const HUD_H = 50;
const CELL = 25;
const COLS = 32;
const ROWS = 30;
const BOARD_Y = HUD_H;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BASE_SPEED = 8; // pasos por segundo en el nivel 1
const MAX_SPEED = 20;
const FRUITS_PER_LEVEL = 5;
const FRUIT_POINTS = 10;
const BONUS_POINTS = 50;
const BONUS_DURATION = 5; // s
const BONUS_BLINK = 1.5; // s finales en que parpadea
const MAX_QUEUED_TURNS = 2;
const ASSETS = "/games/snake";
// Frutas normales: todas menos el bol de la bonus.
const NORMAL_FRUITS = (Object.keys(FRUIT_SPRITES) as FruitName[]).filter(
  (name) => name !== BONUS_SPRITE,
);
// ── Skins ─────────────────────────────────────────────────────────────────────
// clasico: look original (frutas PNG). retro: fósforo verde de CRT, frutas en
// píxeles planos y scanlines. neon: paleta de Arcade Vault con halo y frutas
// vectoriales. Lo elige React con setSkin.
export type SnakeSkinId = StandardSkinId;
interface Skin {
  bg: string; // fondo del canvas
  grid: string; // rejilla del tablero
  border: string; // marco del tablero
  snake: string; // cuerpo
  head: string; // cabeza
  eye: string; // ojos de la cabeza
  hudText: string; // SCORE / NIVEL / LONGITUD
  bonusText: string; // cuenta atrás de la bonus en el HUD
  boardText: string; // textos de inicio y fin de partida
  overlayBg: string; // velo de game over
  fruitStyle: "sprite" | "pixel" | "orb"; // PNG, bloques planos o vectorial
  fruit: string; // fruta normal (pixel / orb)
  fruitLeaf: string; // hoja / tallo de la fruta (pixel / orb)
  bonusFruit: string; // fruta bonus (pixel / orb)
  glow: boolean; // halo en la serpiente
  glowFruit: boolean; // halo en las frutas vectoriales
  scanlines: boolean;
  scanline: string;
}
const SKINS: Record<SnakeSkinId, Skin> = {
  clasico: {
    bg: "#05050f",
    grid: "rgba(0, 255, 136, 0.06)",
    border: "#00ff88",
    snake: "#00ff88",
    head: "#b3ffd9",
    eye: "#05050f",
    hudText: "#b3ffd9",
    bonusText: "#f5ff00",
    boardText: "#ffffff",
    overlayBg: "rgba(0, 0, 0, 0.75)",
    fruitStyle: "sprite",
    fruit: "#00ff88",
    fruitLeaf: "#00ff88",
    bonusFruit: "#f5ff00",
    glow: true,
    glowFruit: false,
    scanlines: false,
    scanline: "rgba(0, 0, 0, 0)",
  },
  retro: {
    bg: "#061006",
    grid: "rgba(51, 204, 85, 0.08)",
    border: "#33cc55",
    snake: "#33cc55",
    head: "#8dffa4",
    eye: "#061006",
    hudText: "#66ff88",
    bonusText: "#d8ff8a",
    boardText: "#b8ffc8",
    overlayBg: "rgba(4, 12, 4, 0.8)",
    fruitStyle: "pixel",
    fruit: "#c6ff5c",
    fruitLeaf: "#33cc55",
    bonusFruit: "#eaffb0",
    glow: false,
    glowFruit: false,
    scanlines: true,
    scanline: "rgba(0, 0, 0, 0.22)",
  },
  neon: {
    bg: "#05010f",
    grid: "rgba(170, 0, 255, 0.1)",
    border: "#aa00ff",
    snake: "#00f5ff",
    head: "#e0fbff",
    eye: "#05010f",
    hudText: "#00f5ff",
    bonusText: "#f5ff00",
    boardText: "#ffffff",
    overlayBg: "rgba(5, 1, 15, 0.8)",
    fruitStyle: "orb",
    fruit: "#ff006e",
    fruitLeaf: "#00ff88",
    bonusFruit: "#f5ff00",
    glow: true,
    glowFruit: true,
    scanlines: false,
    scanline: "rgba(0, 0, 0, 0)",
  },
};
export const isSnakeSkin = (id: string): id is SnakeSkinId => id in SKINS;
// Frutas en bloques de 5×5 (skin retro): manzana con tallo y bonus en rombo.
const PIXEL_FRUIT = ["..L..", ".XXX.", "XXXXX", "XXXXX", ".XXX."];
const PIXEL_BONUS = ["..X..", ".XXX.", "XXXXX", ".XXX.", "..X.."];
// ── Tipos ─────────────────────────────────────────────────────────────────────
type Dir = "up" | "down" | "left" | "right";
interface Cell {
  col: number;
  row: number;
}
interface Fruit extends Cell {
  sprite: FruitName;
}
interface Bonus extends Cell {
  remaining: number; // s
}
const DELTAS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
// ── Contrato con React ────────────────────────────────────────────────────────
// Común a todos los juegos (lib/games/types.ts). restart(): 'ready' con la
// serpiente inicial, score 0 y nivel 1.
const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable);
const initialSnake = (): Cell[] => [
  { col: 16, row: 15 },
  { col: 15, row: 15 },
  { col: 14, row: 15 },
];
export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("SNAKE: canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Assets ──────────────────────────────────────────────────────────────────
  let skin: Skin = SKINS.clasico; // solo lo escribe setSkin
  let sheetLoaded = false;
  const sheet = new Image();
  sheet.onload = () => {
    sheetLoaded = true;
  };
  sheet.src = `${ASSETS}/fruits.png`;
  // ── Estado del juego ────────────────────────────────────────────────────────
  let state: "ready" | "playing" | "gameover" = "ready";
  let paused = false; // solo lo escribe setPaused
  let score = 0;
  let level = 1;
  let fruitsEaten = 0;
  let snake: Cell[] = initialSnake();
  let dir: Dir = "right";
  let turnQueue: Dir[] = [];
  let growPending = 0;
  let fruit: Fruit | null = null;
  let bonus: Bonus | null = null;
  let stepAcc = 0;
  // Últimos valores notificados a React (para avisar solo-al-cambiar)
  let sentScore: number | null = null;
  let sentLevel: number | null = null;
  let sentGameOver = false;
  const speed = () => Math.min(BASE_SPEED + (level - 1), MAX_SPEED);
  const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;
  // Celda libre aleatoria: sin serpiente, sin fruta y sin bonus.
  function randomFreeCell(): Cell | null {
    const free: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = { col, row };
        if (snake.some((s) => sameCell(s, cell))) continue;
        if (fruit && sameCell(fruit, cell)) continue;
        if (bonus && sameCell(bonus, cell)) continue;
        free.push(cell);
      }
    }
    if (free.length === 0) return null;
    return free[Math.floor(Math.random() * free.length)];
  }
  // Pone una fruta normal nueva; sin celda libre la partida termina.
  function spawnFruit() {
    fruit = null;
    const cell = randomFreeCell();
    if (!cell) {
      state = "gameover";
      return;
    }
    const sprite =
      NORMAL_FRUITS[Math.floor(Math.random() * NORMAL_FRUITS.length)];
    fruit = { ...cell, sprite };
  }
  // Una bonus nueva reemplaza a la que hubiera.
  function spawnBonus() {
    bonus = null;
    const cell = randomFreeCell();
    if (cell) bonus = { ...cell, remaining: BONUS_DURATION };
  }
  function initGame() {
    state = "ready";
    score = 0;
    level = 1;
    fruitsEaten = 0;
    snake = initialSnake();
    dir = "right";
    turnQueue = [];
    growPending = 0;
    fruit = null;
    bonus = null;
    stepAcc = 0;
    sentGameOver = false;
    spawnFruit();
  }
  // Encola un giro salvo que repita o invierta el último (o la dirección actual).
  function queueTurn(next: Dir) {
    if (turnQueue.length >= MAX_QUEUED_TURNS) return;
    const last = turnQueue[turnQueue.length - 1] ?? dir;
    if (next === last || next === OPPOSITE[last]) return;
    turnQueue.push(next);
  }
  function notify() {
    if (score !== sentScore) callbacks.onScore((sentScore = score));
    if (level !== sentLevel) callbacks.onLevel?.((sentLevel = level));
    if (state === "gameover" && !sentGameOver) {
      sentGameOver = true;
      callbacks.onGameOver(score);
    }
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function step() {
    const turn = turnQueue.shift();
    if (turn) dir = turn;
    const head = snake[0];
    const next = {
      col: head.col + DELTAS[dir].col,
      row: head.row + DELTAS[dir].row,
    };
    // Muros mortales
    if (next.col < 0 || next.col >= COLS || next.row < 0 || next.row >= ROWS) {
      state = "gameover";
      return;
    }
    const ateFruit = fruit !== null && sameCell(fruit, next);
    if (ateFruit) growPending++;
    // Si no crece, la cola deja su celda libre en este mismo paso.
    const grows = growPending > 0;
    const body = grows ? snake : snake.slice(0, -1);
    if (body.some((s) => sameCell(s, next))) {
      state = "gameover";
      return;
    }
    snake.unshift(next);
    if (grows) growPending--;
    else snake.pop();
    if (bonus && sameCell(bonus, next)) {
      score += BONUS_POINTS * level;
      bonus = null;
    }
    if (ateFruit) {
      score += FRUIT_POINTS * level;
      fruitsEaten++;
      spawnFruit();
      if (state !== "playing") return;
      if (fruitsEaten % FRUITS_PER_LEVEL === 0) {
        level++;
        spawnBonus();
      }
    }
  }
  function update(dt: number) {
    if (state !== "playing") return;
    if (bonus) {
      bonus.remaining -= dt;
      if (bonus.remaining <= 0) bonus = null;
    }
    // Paso fijo: la velocidad no depende de los fps.
    stepAcc += dt;
    while (state === "playing" && stepAcc >= 1 / speed()) {
      stepAcc -= 1 / speed();
      step();
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  const cellX = (col: number) => col * CELL;
  const cellY = (row: number) => BOARD_Y + row * CELL;
  // Sprite escalado a 25 px de alto, ancho proporcional y centrado en la celda.
  function drawSprite(sp: SpriteRect, cell: Cell) {
    const h = CELL;
    const w = (sp.sw * CELL) / sp.sh;
    const x = cellX(cell.col) + (CELL - w) / 2;
    const y = cellY(cell.row);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }
  // Fruta en bloques planos (retro): 5×5 píxeles de 5 px, sin halo.
  function drawPixelFruit(pattern: string[], color: string, cell: Cell) {
    const px = CELL / 5;
    for (let r = 0; r < pattern.length; r++) {
      for (let c = 0; c < pattern[r].length; c++) {
        const ch = pattern[r][c];
        if (ch === ".") continue;
        ctx.fillStyle = ch === "L" ? skin.fruitLeaf : color;
        const x = cellX(cell.col) + c * px;
        const y = cellY(cell.row) + r * px;
        ctx.fillRect(x, y, px, px);
      }
    }
  }
  // Fruta vectorial (neón): orbe con hoja; la bonus es un rombo.
  function drawOrb(cell: Cell, isBonus: boolean) {
    const cx = cellX(cell.col) + CELL / 2;
    const cy = cellY(cell.row) + CELL / 2;
    const color = isBonus ? skin.bonusFruit : skin.fruit;
    if (skin.glowFruit) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    if (isBonus) {
      ctx.moveTo(cx, cy - 11);
      ctx.lineTo(cx + 11, cy);
      ctx.lineTo(cx, cy + 11);
      ctx.lineTo(cx - 11, cy);
      ctx.closePath();
    } else {
      ctx.arc(cx, cy + 1, 8.5, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    if (!isBonus) {
      ctx.strokeStyle = skin.fruitLeaf;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx + 5, cy - 11);
      ctx.stroke();
    }
  }
  function drawFruit(cell: Cell, sprite: FruitName, isBonus: boolean) {
    if (skin.fruitStyle === "sprite") drawSprite(FRUIT_SPRITES[sprite], cell);
    else if (skin.fruitStyle === "pixel")
      drawPixelFruit(
        isBonus ? PIXEL_BONUS : PIXEL_FRUIT,
        isBonus ? skin.bonusFruit : skin.fruit,
        cell,
      );
    else drawOrb(cell, isBonus);
  }
  // Líneas de barrido CRT (skin retro): una fila oscura cada 3 px.
  function drawScanlines() {
    ctx.fillStyle = skin.scanline;
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }
  function drawHUD() {
    ctx.font = "bold 20px monospace";
    ctx.textBaseline = "middle";
    ctx.fillStyle = skin.hudText;
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score.toLocaleString("es-ES")}`, 16, HUD_H / 2);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${String(level).padStart(2, "0")}`, W / 2, HUD_H / 2);
    ctx.textAlign = "right";
    ctx.fillText(`LONGITUD ${snake.length}`, W - 16, HUD_H / 2);
    if (bonus) {
      ctx.fillStyle = skin.bonusText;
      ctx.textAlign = "center";
      ctx.fillText(
        `BONUS ${Math.max(bonus.remaining, 0).toFixed(1)}s`,
        590,
        HUD_H / 2,
      );
    }
  }
  function drawBoard() {
    ctx.strokeStyle = skin.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 1; col < COLS; col++) {
      ctx.moveTo(cellX(col) + 0.5, BOARD_Y);
      ctx.lineTo(cellX(col) + 0.5, BOARD_Y + BOARD_H);
    }
    for (let row = 1; row < ROWS; row++) {
      ctx.moveTo(0, cellY(row) + 0.5);
      ctx.lineTo(BOARD_W, cellY(row) + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = skin.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, BOARD_Y + 1, BOARD_W - 2, BOARD_H - 2);
  }
  function drawSnake() {
    ctx.save();
    if (skin.glow) {
      ctx.shadowColor = skin.snake;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = skin.snake;
    for (let i = snake.length - 1; i >= 1; i--) {
      const s = snake[i];
      ctx.fillRect(cellX(s.col) + 2, cellY(s.row) + 2, CELL - 4, CELL - 4);
    }
    const head = snake[0];
    ctx.fillStyle = skin.head;
    ctx.fillRect(cellX(head.col) + 1, cellY(head.row) + 1, CELL - 2, CELL - 2);
    ctx.shadowBlur = 0;
    ctx.restore();
    // Ojos orientados hacia la dirección actual
    const cx = cellX(head.col) + CELL / 2;
    const cy = cellY(head.row) + CELL / 2;
    const d = DELTAS[dir];
    const ahead = 5; // desplazamiento hacia delante
    const apart = 5; // separación lateral
    ctx.fillStyle = skin.eye;
    for (const side of [-1, 1]) {
      const ex = cx + d.col * ahead + d.row * apart * side;
      const ey = cy + d.row * ahead + d.col * apart * side;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawBoardText(lines: { text: string; size: number; dy: number }[]) {
    ctx.fillStyle = skin.boardText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const line of lines) {
      ctx.font = `bold ${line.size}px monospace`;
      ctx.fillText(line.text, W / 2, BOARD_Y + BOARD_H / 2 + line.dy);
    }
  }
  function draw() {
    ctx.fillStyle = skin.bg;
    ctx.fillRect(0, 0, W, H);
    drawHUD();
    drawBoard();
    if (!sheetLoaded) {
      if (skin.scanlines) drawScanlines();
      return;
    }
    if (fruit) drawFruit(fruit, fruit.sprite, false);
    if (bonus) {
      // Parpadea en su último 1.5 s
      const blinkOff =
        bonus.remaining < BONUS_BLINK &&
        Math.floor(bonus.remaining * 8) % 2 === 1;
      if (!blinkOff) drawFruit(bonus, BONUS_SPRITE, true);
    }
    drawSnake();
    if (state === "ready") {
      drawBoardText([
        { text: "PULSA UNA FLECHA PARA EMPEZAR", size: 26, dy: -80 },
      ]);
    }
    // Fin de partida: sin texto de reinicio (lo hace React).
    if (state === "gameover") {
      ctx.fillStyle = skin.overlayBg;
      ctx.fillRect(0, BOARD_Y, BOARD_W, BOARD_H);
      drawBoardText([
        { text: "GAME OVER", size: 64, dy: -24 },
        {
          text: `Puntuación: ${score.toLocaleString("es-ES")}`,
          size: 24,
          dy: 36,
        },
      ]);
    }
    if (skin.scanlines) drawScanlines();
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    // En pausa, al terminar, escribiendo en un input o sin el PNG, no se toca el teclado.
    if (paused || state === "gameover" || !sheetLoaded) return;
    if (isTypingTarget(e.target)) return;
    const next = KEY_DIRS[e.code];
    if (!next) return;
    if (ARROW_KEYS.has(e.code)) e.preventDefault();
    if (state === "ready") {
      // Izquierda sería un giro de 180° respecto a la dirección inicial.
      if (next === OPPOSITE[dir]) return;
      state = "playing";
      stepAcc = 0;
    }
    queueTurn(next);
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let started = false;
  function loop(ts: number) {
    // En pausa, al terminar o sin PNG se sigue dibujando pero no se avanza.
    if (!paused && sheetLoaded && state !== "gameover") {
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
      draw();
      notify();
      rafId = requestAnimationFrame(loop);
    },
    setPaused(next: boolean) {
      if (next === paused) return;
      paused = next;
      // Los giros pulsados antes de la pausa no se aplican y la pausa no cuenta como dt.
      turnQueue = [];
      lastTime = null;
    },
    end() {
      if (state === "gameover") return;
      state = "gameover";
      turnQueue = [];
      draw();
      notify();
    },
    restart() {
      initGame();
      lastTime = null;
      draw();
      notify();
    },
    setSkin(id: string) {
      if (!isSnakeSkin(id)) return;
      skin = SKINS[id];
      draw(); // al instante, también en pausa o en game over
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      sheet.onload = null;
      window.removeEventListener("keydown", onKeyDown);
      started = false;
    },
  };
}
