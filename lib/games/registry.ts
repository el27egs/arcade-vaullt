// ===== lib/games/registry.ts — juegos reales: id → canvas y HUD React =====
// Un juego sin entrada aquí usa el reproductor mock de GamePlayer.
import type { ComponentType } from "react";
import type { GameCanvasProps, GameHud, GameSkins } from "@/lib/games/types";
import { AsteroidesCanvas } from "@/components/games/asteroides-canvas";
import { TetrisCanvas } from "@/components/games/tetris-canvas";
import { ArkanoidCanvas } from "@/components/games/arkanoid-canvas";
import { SnakeCanvas } from "@/components/games/snake-canvas";
export interface GameRegistryEntry {
  Canvas: ComponentType<GameCanvasProps>;
  hud: GameHud;
  skins?: GameSkins;
  // "compact": franja EN PAUSA arriba que deja pasar los clics al canvas.
  pauseOverlay?: "full" | "compact"; // sin valor = "full"
}
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  asteroides: {
    Canvas: AsteroidesCanvas,
    hud: { lives: true, level: true, lines: false },
  },
  tetris: {
    Canvas: TetrisCanvas,
    hud: { lives: false, level: true, lines: true },
    skins: {
      storageKey: "tetris-theme",
      options: [
        { id: "dark", label: "OSCURO" },
        { id: "light", label: "CLARO" },
        { id: "neon", label: "NEÓN" },
      ],
    },
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    hud: { lives: true, level: true, lines: false },
    pauseOverlay: "compact",
  },
  snake: {
    Canvas: SnakeCanvas,
    hud: { lives: false, level: true, lines: false },
  },
};
