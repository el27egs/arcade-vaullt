// ===== lib/games/arkanoid/levels.ts — los 5 niveles de ARKANOID =====
// Port a TypeScript de references/started-games/04-arkanoid/levels.js.
export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export interface LevelDef {
  speed: number; // multiplicador de la velocidad base de la pelota
  blocks: { col: number; row: number; color: BlockColor }[];
}
type Blocks = LevelDef["blocks"];
// Nivel 1: muro completo, un color por fila.
const rowColors1: BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];
const l1: Blocks = [];
for (let row = 0; row < 6; row++)
  for (let col = 0; col < 10; col++)
    l1.push({ col, row, color: rowColors1[row] });
// Nivel 2: pirámide.
const rowColors2: BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const pyStart = [4, 3, 2, 1, 0, 0];
const pyEnd = [5, 6, 7, 8, 9, 9];
const l2: Blocks = [];
for (let row = 0; row < 6; row++)
  for (let col = pyStart[row]; col <= pyEnd[row]; col++)
    l2.push({ col, row, color: rowColors2[row] });
// Nivel 3: tablero de ajedrez.
const l3: Blocks = [];
for (let row = 0; row < 6; row++)
  for (let col = 0; col < 10; col++)
    if ((col + row) % 2 === 0)
      l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });
// Nivel 4: muro con huecos.
const rowColors4: BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];
const gaps4 = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];
const l4: Blocks = [];
for (let row = 0; row < 6; row++)
  for (let col = 0; col < 10; col++)
    if (!gaps4[row].includes(col))
      l4.push({ col, row, color: rowColors4[row] });
// Nivel 5: marco con cruz.
const l5: Blocks = [];
for (let row = 0; row < 6; row++)
  for (let col = 0; col < 10; col++) {
    const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
    const isCross = col === 4 || row === 2;
    if (isFrame || isCross)
      l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
  }
export const LEVELS: LevelDef[] = [
  { speed: 1.0, blocks: l1 },
  { speed: 1.1, blocks: l2 },
  { speed: 1.21, blocks: l3 },
  { speed: 1.33, blocks: l4 },
  { speed: 1.46, blocks: l5 },
];
