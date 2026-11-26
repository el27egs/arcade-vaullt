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
  // Solo juegos con touch.portrait: "portrait" en táctil, "landscape" si no.
  // Cambia el tamaño lógico del canvas y redibuja al instante (SPEC 10).
  setLayout?(layout: GameLayout): void;
}
export type GameLayout = "landscape" | "portrait";
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
// Un botón del mando táctil: emite keydown/keyup sintéticos en window con este e.code.
export interface TouchButton {
  code: string; // "ArrowLeft", "Space", …
  label: string; // texto o símbolo visible: "←", "DISPARO"
  repeat?: boolean; // true: repite keydown a 170 ms y luego cada 50 ms
}
// Mando virtual de un juego: cruceta a la izquierda y 0–2 acciones a la derecha.
export interface TouchControls {
  dpad: Partial<Record<"up" | "down" | "left" | "right", TouchButton>>;
  actions: TouchButton[]; // [0] = A (principal), [1] = B
  // Proporción ancho/alto de la pantalla en táctil (p. ej. 0.7 = 420×600). Con
  // ella la CRT cambia de forma y el motor recibe setLayout("portrait").
  portrait?: number;
}
export interface GameCanvasProps extends GameCallbacks {
  onReady(engine: GameEngine): void;
}
