// ===== lib/games/skins.ts — skins estándar de Arcade Vault =====
// Todos los juegos ofrecen clasico (default), retro y neon, en ese orden.
import type { GameSkins } from "@/lib/games/types";
export const STANDARD_SKIN_OPTIONS = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "retro", label: "RETRO" },
  { id: "neon", label: "NEÓN" },
] as const;
export type StandardSkinId = (typeof STANDARD_SKIN_OPTIONS)[number]["id"];
// extras: skins adicionales del juego, siempre después de los tres estándar.
export const standardSkins = (
  gameId: string,
  extras: GameSkins["options"] = [],
): GameSkins => ({
  storageKey: `${gameId}-theme`,
  options: [...STANDARD_SKIN_OPTIONS.map((o) => ({ ...o })), ...extras],
});
