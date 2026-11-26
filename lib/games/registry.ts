// ===== lib/games/registry.ts — juegos reales: id → canvas y HUD React =====
// Un juego sin entrada aquí usa el reproductor mock de GamePlayer.
import type { ComponentType } from "react";
import type {
  GameCanvasProps,
  GameHud,
  GameSkins,
  TouchControls,
} from "@/lib/games/types";
import { AsteroidesCanvas } from "@/components/games/asteroides-canvas";
import { TetrisCanvas } from "@/components/games/tetris-canvas";
import { ArkanoidCanvas } from "@/components/games/arkanoid-canvas";
import { SnakeCanvas } from "@/components/games/snake-canvas";
import { standardSkins } from "@/lib/games/skins";
export interface GameRegistryEntry {
  Canvas: ComponentType<GameCanvasProps>;
  hud: GameHud;
  skins?: GameSkins;
  // "compact": franja EN PAUSA arriba que deja pasar los clics al canvas.
  pauseOverlay?: "full" | "compact"; // sin valor = "full"
  // Mando táctil (solo visible con puntero táctil); sin valor = sin mando.
  touch?: TouchControls;
}
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  asteroides: {
    Canvas: AsteroidesCanvas,
    hud: { lives: true, level: true, lines: false },
    skins: standardSkins("asteroides"),
    touch: {
      dpad: {
        up: { code: "ArrowUp", label: "↑" },
        left: { code: "ArrowLeft", label: "←" },
        right: { code: "ArrowRight", label: "→" },
      },
      actions: [{ code: "Space", label: "DISPARO" }],
      portrait: 600 / 800,
    },
  },
  tetris: {
    Canvas: TetrisCanvas,
    hud: { lives: false, level: true, lines: true },
    skins: standardSkins("tetris", [{ id: "light", label: "CLARO" }]),
    touch: {
      dpad: {
        up: { code: "ArrowUp", label: "↑" },
        down: { code: "ArrowDown", label: "↓", repeat: true },
        left: { code: "ArrowLeft", label: "←", repeat: true },
        right: { code: "ArrowRight", label: "→", repeat: true },
      },
      actions: [
        { code: "ArrowUp", label: "ROTAR" },
        { code: "Space", label: "CAÍDA" },
      ],
      portrait: 420 / 600,
    },
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    hud: { lives: true, level: true, lines: false },
    skins: standardSkins("arkanoid"),
    pauseOverlay: "compact",
    touch: {
      dpad: {
        left: { code: "ArrowLeft", label: "←" },
        right: { code: "ArrowRight", label: "→" },
      },
      actions: [],
      portrait: 680 / 880,
    },
  },
  snake: {
    Canvas: SnakeCanvas,
    hud: { lives: false, level: true, lines: false },
    skins: standardSkins("snake"),
    touch: {
      dpad: {
        up: { code: "ArrowUp", label: "↑" },
        down: { code: "ArrowDown", label: "↓" },
        left: { code: "ArrowLeft", label: "←" },
        right: { code: "ArrowRight", label: "→" },
      },
      actions: [],
      // Tablero fijo 32×30: en táctil, su canvas cuadrado sin bandas laterales.
      portrait: 1,
    },
  },
};
