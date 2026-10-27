// ===== lib/games/snake/sprites.ts — recortes de las frutas de SNAKE =====
// Port a TypeScript de references/source-assets/snake-assets/sprites.js.
// Coordenadas en public/games/snake/fruits.png (3790×442), fila pixel art.
// Los nombres de sprites.js están desfasados: aquí nombran lo que se ve.
export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export type FruitName =
  | "apple"
  | "banana"
  | "pineapple"
  | "grape"
  | "pumpkin"
  | "turnip"
  | "eggplant"
  | "strawberry"
  | "cherry"
  | "carrot"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "orange"
  | "peach"
  | "peanut"
  | "raspberry"
  | "tomato"
  | "bowl";
// Toda la fila pixel art está en y = 136 con 160 px de alto.
const fruit = (sx: number, sw: number): SpriteRect => ({
  sx,
  sy: 136,
  sw,
  sh: 160,
});
export const FRUIT_SPRITES: Record<FruitName, SpriteRect> = {
  apple: fruit(34, 110),
  banana: fruit(186, 150),
  pineapple: fruit(378, 110),
  grape: fruit(540, 130),
  pumpkin: fruit(712, 130),
  turnip: fruit(894, 110),
  eggplant: fruit(1066, 110),
  strawberry: fruit(1228, 130),
  cherry: fruit(1400, 130),
  carrot: fruit(1582, 110),
  mushroom: fruit(1734, 150),
  broccoli: fruit(1906, 150),
  watermelon: fruit(2068, 170),
  pepper: fruit(2250, 140),
  kiwi: fruit(2432, 130),
  lemon: fruit(2604, 130),
  orange: fruit(2786, 110),
  peach: fruit(2948, 130),
  peanut: fruit(3110, 150),
  raspberry: fruit(3302, 110),
  tomato: fruit(3454, 150),
  bowl: fruit(3637, 130),
};
// Reservado para la fruta bonus.
export const BONUS_SPRITE: FruitName = "bowl";
