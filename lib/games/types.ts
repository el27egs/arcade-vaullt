// ===== lib/games/types.ts — contrato común entre los juegos y React =====
// Juego → React: notificaciones. Solo se invocan cuando el valor cambia.
export interface GameCallbacks {
  onScore(score: number): void;
  onLives?(lives: number): void;
  onLevel?(level: number): void;
  onLines?(lines: number): void;
  onGameOver(finalScore: number): void; // por condición de fin o por end()
}
// React → Juego: órdenes. El juego nunca cambia su pausa por iniciativa propia.
export interface GameEngine {
  start(): void; // registra input y arranca el loop rAF
  setPaused(paused: boolean): void; // única vía para pausar o reanudar
  end(): void; // FIN manual: congela y dispara onGameOver(score)
  restart(): void; // estado inicial del juego
  destroy(): void; // cancela rAF y quita todos los listeners
  setSkin?(skin: string): void; // solo juegos con skins; redibuja al instante
}
// Qué muestra el HUD React además de la Puntuación.
export interface GameHud {
  lives: boolean;
  level: boolean;
  lines: boolean;
}
// Skins que ofrece un juego; el elegido se guarda en localStorage[storageKey].
export interface GameSkins {
  storageKey: string;
  options: { id: string; label: string }[]; // el primero es el de por defecto
}
export interface GameCanvasProps extends GameCallbacks {
  onReady(engine: GameEngine): void;
}
