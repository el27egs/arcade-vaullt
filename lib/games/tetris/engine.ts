// ===== lib/games/tetris/engine.ts — motor canvas de TETRIS =====
// Port a TypeScript de references/started-games/03-tetris/game.js.
// Sin globals: el tablero y el contexto llegan por parámetro.
import type {
  GameCallbacks,
  GameEngine,
  GameLayout,
} from "@/lib/games/types";
import type { StandardSkinId } from "@/lib/games/skins";
// ── Constantes ────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
// Horizontal (escritorio): 800×600, tablero centrado (x de 250 a 550) con los
// paneles CONTROLS y stats a los lados. Vertical (táctil, SPEC 10): 420×600,
// tablero a la izquierda y una columna estrecha de stats a la derecha.
const LAYOUTS = {
  landscape: { w: 800, h: 600, boardX: 250, nextBlock: 30, valueSize: 26 },
  portrait: { w: 420, h: 600, boardX: 10, nextBlock: 20, valueSize: 16 },
} as const;
type Layout = keyof typeof LAYOUTS;
// Colores de las piezas del original (índices 1–8)
const ORIGINAL_COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];
const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
const LINE_SCORES = [0, 100, 300, 500, 800];
const KICKS = [0, -1, 1, -2, 2];
// ── Skins ─────────────────────────────────────────────────────────────────────
// clasico es el tema oscuro del original (antes "dark"); retro imita un monitor
// de fósforo verde; neon usa la paleta de Arcade Vault. light (CLARO) es el
// tema claro del original, conservado como skin extra. Lo elige React con setSkin.
export type TetrisSkinId = StandardSkinId | "light";
interface Skin {
  colors: (string | null)[];
  glow: boolean; // halo de neón en los bloques
  scanlines: boolean; // líneas de barrido CRT sobre todo el canvas
  bg: string;
  canvasBg: string;
  border: string;
  gridLine: string;
  blockHighlight: string | null; // brillo superior de cada bloque (null = plano)
  label: string;
  value: string;
  overTitle: string;
  controlsText: string;
  kbdBg: string;
  kbdBorder: string;
  kbdText: string;
  overlayBg: string;
  scanline: string;
}
const SKINS: Record<TetrisSkinId, Skin> = {
  clasico: {
    colors: ORIGINAL_COLORS,
    glow: false,
    scanlines: false,
    bg: "#0f0f17",
    canvasBg: "#1a1a25",
    border: "#2a2a3a",
    gridLine: "#22222e",
    blockHighlight: "rgba(255,255,255,0.12)",
    label: "#7e7ea0", // original #555570, aclarado para contraste ≥ 4.5:1
    value: "#7aa2f7",
    overTitle: "#e57373",
    controlsText: "#888",
    kbdBg: "#22223a",
    kbdBorder: "#3a3a5a",
    kbdText: "#aaa",
    overlayBg: "rgba(10, 10, 20, 0.75)",
    scanline: "rgba(0, 0, 0, 0)",
  },
  retro: {
    // Fósforo verde: cuatro tonos, bloques planos, sin halo.
    colors: [
      null,
      "#33ff33", // I
      "#99ff99", // O
      "#1fbf1f", // T
      "#66cc66", // S
      "#33ff33", // Z
      "#99ff99", // J
      "#1fbf1f", // L
      "#66cc66", // N
    ],
    glow: false,
    scanlines: true,
    bg: "#020a02",
    canvasBg: "#041204",
    border: "#1f7a1f",
    gridLine: "#0a240a",
    blockHighlight: null,
    label: "#33cc33",
    value: "#66ff66",
    overTitle: "#99ff99",
    controlsText: "#33cc33",
    kbdBg: "#062006",
    kbdBorder: "#1f7a1f",
    kbdText: "#66ff66",
    overlayBg: "rgba(0, 8, 0, 0.85)",
    scanline: "rgba(0, 0, 0, 0.22)",
  },
  neon: {
    colors: [
      null,
      "#00f5ff", // I
      "#f5ff00", // O
      "#aa00ff", // T
      "#00ff88", // S
      "#ff006e", // Z
      "#3d7bff", // J
      "#ff7700", // L
      "#c0c0d8", // N
    ],
    glow: true,
    scanlines: false,
    bg: "#0a0a18",
    canvasBg: "#0d0d22",
    border: "#00f5ff",
    gridLine: "#1a1a3a",
    blockHighlight: "rgba(255,255,255,0.12)",
    label: "#ff006e",
    value: "#00f5ff",
    overTitle: "#ff006e",
    controlsText: "#9a9ac8",
    kbdBg: "#15152e",
    kbdBorder: "#00f5ff",
    kbdText: "#00f5ff",
    overlayBg: "rgba(5, 5, 20, 0.8)",
    scanline: "rgba(0, 0, 0, 0)",
  },
  light: {
    colors: ORIGINAL_COLORS,
    glow: false,
    scanlines: false,
    bg: "#f0f0f8",
    canvasBg: "#e4e4f0",
    border: "#b0b0c8",
    gridLine: "#c8c8dc",
    blockHighlight: "rgba(255,255,255,0.12)",
    label: "#6060a0",
    value: "#7aa2f7",
    overTitle: "#e57373",
    controlsText: "#404060",
    kbdBg: "#dcdcf0",
    kbdBorder: "#9090b8",
    kbdText: "#3a3a6a",
    overlayBg: "rgba(210, 210, 230, 0.85)",
    scanline: "rgba(0, 0, 0, 0)",
  },
};
export const isTetrisSkin = (id: string): id is TetrisSkinId => id in SKINS;
const MONO = "'Courier New', Courier, monospace";
const SANS = "system-ui, -apple-system, sans-serif";
// ── Tipos ─────────────────────────────────────────────────────────────────────
type Board = number[][];
interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}
// ── Tablero y piezas ──────────────────────────────────────────────────────────
function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
function collide(board: Board, shape: number[][], ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
function rotateCW(shape: number[][]) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
// Rota con wall kicks; deja la pieza igual si ninguna posición cabe.
function tryRotate(board: Board, piece: Piece) {
  const rotated = rotateCW(piece.shape);
  for (const kick of KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return;
    }
  }
}
function merge(board: Board, piece: Piece) {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
}
// Quita las filas completas y devuelve cuántas eran.
function clearLines(board: Board) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}
function ghostY(board: Board, piece: Piece) {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
// ── Dibujo ────────────────────────────────────────────────────────────────────
// Bloque en la celda (x, y) de una rejilla con origen en (ox, oy).
function drawBlock(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  ox: number,
  oy: number,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  const color = skin.colors[colorIndex]!;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  if (skin.glow && alpha === 1) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }
  ctx.fillRect(ox + x * size + 1, oy + y * size + 1, size - 2, size - 2);
  ctx.shadowBlur = 0;
  // highlight
  if (skin.blockHighlight) {
    ctx.fillStyle = skin.blockHighlight;
    ctx.fillRect(ox + x * size + 1, oy + y * size + 1, size - 2, 4);
  }
  ctx.globalAlpha = 1;
}
// ── Contrato con React ────────────────────────────────────────────────────────
// Común a todos los juegos (lib/games/types.ts). restart(): tablero vacío,
// score 0, líneas 0, nivel 1, caída de 1000 ms.
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
export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("TETRIS: canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  // ── Estado del juego ────────────────────────────────────────────────────────
  let board: Board;
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let dropInterval: number; // ms
  let dropAccum: number; // ms
  let state: "playing" | "gameover";
  let paused = false; // solo lo escribe setPaused
  let skin: Skin = SKINS.clasico; // solo lo escribe setSkin
  let layout: Layout = "landscape"; // solo lo escribe setLayout
  let L: (typeof LAYOUTS)[Layout] = LAYOUTS.landscape;
  // Últimos valores notificados a React (para avisar solo-al-cambiar)
  let sentScore: number | null = null;
  let sentLines: number | null = null;
  let sentLevel: number | null = null;
  let sentGameOver = false;
  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropAccum = 0;
    state = "playing";
    sentGameOver = false;
    next = randomPiece();
    spawn();
  }
  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) state = "gameover";
  }
  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
    spawn();
  }
  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function hardDrop() {
    const gy = ghostY(board, current);
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  function notify() {
    if (score !== sentScore) callbacks.onScore((sentScore = score));
    if (lines !== sentLines) callbacks.onLines?.((sentLines = lines));
    if (level !== sentLevel) callbacks.onLevel?.((sentLevel = level));
    if (state === "gameover" && !sentGameOver) {
      sentGameOver = true;
      callbacks.onGameOver(score);
    }
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    // En pausa, en gameover o escribiendo en un input, el juego no toca el teclado.
    if (paused || state === "gameover" || isTypingTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y))
          current.x--;
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y))
          current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate(board, current);
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    draw();
    notify();
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") return;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLabel(text: string, x: number, y: number) {
    ctx.fillStyle = skin.label;
    ctx.font = `600 10px ${SANS}`;
    ctx.letterSpacing = "2px";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.letterSpacing = "0px";
  }
  function drawValue(text: string, x: number, y: number) {
    ctx.fillStyle = skin.value;
    ctx.font = `700 ${L.valueSize}px ${MONO}`;
    ctx.letterSpacing = "1px";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.letterSpacing = "0px";
  }
  function drawBox(x: number, y: number, w: number, h: number) {
    ctx.fillStyle = skin.canvasBg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = skin.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function drawBoard() {
    drawBox(L.boardX - 0.5, -0.5, COLS * BLOCK + 1, ROWS * BLOCK + 1);
    ctx.strokeStyle = skin.gridLine;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(L.boardX + c * BLOCK, 0);
      ctx.lineTo(L.boardX + c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(L.boardX, r * BLOCK);
      ctx.lineTo(L.boardX + COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, skin, L.boardX, 0, c, r, board[r][c], BLOCK);
    if (state === "gameover") return;
    // ghost
    const gy = ghostY(board, current);
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            skin,
            L.boardX,
            0,
            current.x + c,
            gy + r,
            current.shape[r][c],
            BLOCK,
            0.2,
          );
    // pieza actual
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(
          ctx,
          skin,
          L.boardX,
          0,
          current.x + c,
          current.y + r,
          current.shape[r][c],
          BLOCK,
        );
  }
  // Panel derecho: SCORE, LINES, LEVEL y NEXT, como el panel HTML del original.
  function drawStatsPanel() {
    const x = L.boardX + COLS * BLOCK + (layout === "portrait" ? 14 : 30);
    const step = layout === "portrait" ? 52 : 70; // separación entre stats
    drawLabel("SCORE", x, 24);
    drawValue(score.toLocaleString("es-ES"), x, 42);
    drawLabel("LINES", x, 24 + step);
    drawValue(String(lines), x, 42 + step);
    drawLabel("LEVEL", x, 24 + step * 2);
    drawValue(String(level), x, 42 + step * 2);
    drawLabel("NEXT", x, 24 + step * 3);
    const size = 4 * L.nextBlock;
    const y = 42 + step * 3;
    drawBox(x + 0.5, y + 0.5, size, size);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, skin, x, y, offX + c, offY + r, shape[r][c], L.nextBlock);
  }
  // Panel izquierdo: lista CONTROLS del original.
  function drawControlsPanel() {
    const x = 30;
    drawLabel("CONTROLS", x, 24);
    const items: [string[], string][] = [
      [["←", "→"], "mover"],
      [["↑"], "rotar"],
      [["↓"], "bajar"],
      [["Space"], "caída"],
      [["P"], "pausa"],
    ];
    ctx.textBaseline = "middle";
    items.forEach(([keys, action], i) => {
      const cy = 52 + i * 26;
      let cx = x;
      ctx.font = `11px ${SANS}`;
      for (const key of keys) {
        const w = ctx.measureText(key).width + 12;
        ctx.fillStyle = skin.kbdBg;
        ctx.beginPath();
        ctx.roundRect(cx + 0.5, cy - 9.5, w, 19, 3);
        ctx.fill();
        ctx.strokeStyle = skin.kbdBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = skin.kbdText;
        ctx.textAlign = "center";
        ctx.fillText(key, cx + w / 2, cy);
        cx += w + 4;
      }
      ctx.font = `12px ${SANS}`;
      ctx.fillStyle = skin.controlsText;
      ctx.textAlign = "left";
      ctx.fillText(action, cx + 2, cy);
    });
  }
  // GAME OVER sin botón ni texto de reinicio: el reinicio llega desde React.
  function drawGameOver() {
    ctx.fillStyle = skin.overlayBg;
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = skin.overTitle;
    ctx.font = `800 28px ${SANS}`;
    ctx.letterSpacing = "4px";
    ctx.fillText("GAME OVER", L.w / 2, L.h / 2 - 14);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = skin.value;
    ctx.font = `14px ${MONO}`;
    ctx.fillText(
      `Puntuación: ${score.toLocaleString("es-ES")}`,
      L.w / 2,
      L.h / 2 + 22,
    );
  }
  // Líneas de barrido CRT (skin retro): una fila oscura cada 3 px.
  function drawScanlines() {
    ctx.fillStyle = skin.scanline;
    for (let y = 0; y < L.h; y += 3) ctx.fillRect(0, y, L.w, 1);
  }
  function draw() {
    ctx.fillStyle = skin.bg;
    ctx.fillRect(0, 0, L.w, L.h);
    drawBoard();
    drawStatsPanel();
    // En vertical (táctil) no hay teclado: sin panel CONTROLS.
    if (layout === "landscape") drawControlsPanel();
    if (state === "gameover") drawGameOver();
    if (skin.scanlines) drawScanlines();
  }
  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let started = false;
  function loop(ts: number) {
    if (!paused) {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
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
      draw();
      notify();
      rafId = requestAnimationFrame(loop);
    },
    setSkin(id: string) {
      if (!isTetrisSkin(id)) return;
      skin = SKINS[id];
      draw();
    },
    setLayout(next: GameLayout) {
      if (!(next in LAYOUTS) || next === layout) return;
      layout = next;
      L = LAYOUTS[layout];
      canvas.width = L.w; // redimensionar borra el canvas: se redibuja
      canvas.height = L.h;
      draw();
    },
    setPaused(nextPaused: boolean) {
      if (nextPaused === paused) return;
      paused = nextPaused;
      // El tiempo de la pausa no cuenta como dt.
      if (!paused) lastTime = null;
    },
    end() {
      if (state === "gameover") return;
      state = "gameover";
      draw();
      notify();
    },
    restart() {
      initGame();
      lastTime = null;
      draw();
      notify();
    },
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      window.removeEventListener("keydown", onKeyDown);
      started = false;
    },
  };
}
