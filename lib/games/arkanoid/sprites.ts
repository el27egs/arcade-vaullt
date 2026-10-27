// ===== lib/games/arkanoid/sprites.ts — recortes del spritesheet de ARKANOID =====
// Port a TypeScript de references/started-games/04-arkanoid/assets/spritesheet.js.
// Coordenadas en public/games/arkanoid/spritesheet-breakout.png (559×337).
import type { BlockColor } from "@/lib/games/arkanoid/levels";
export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export const SPRITES: {
  paddle: SpriteRect;
  ball: SpriteRect;
  blocks: Record<BlockColor, SpriteRect>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};
// 4 frames de 32×16 en una fila, a partir de x = 256 y a la altura de sy.
// gray reusa la fila de red, como en el original.
const explosionRow = (sy: number): SpriteRect[] =>
  [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
export const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]> = {
  red: explosionRow(176),
  cyan: explosionRow(192),
  green: explosionRow(208),
  magenta: explosionRow(224),
  yellow: explosionRow(240),
  hotpink: explosionRow(256),
  gray: explosionRow(176),
};
export const EXPLOSION_DURATION = 150; // ms
