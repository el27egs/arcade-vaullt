"use client";
// Mando virtual táctil (SPEC 10). Cada botón despacha en window el mismo
// keydown/keyup (e.code) que la tecla real, así los motores no cambian.
// Solo se ve con puntero táctil: lo decide el CSS (.touch-pad + pointer: coarse).
// Cruceta con flechas a la izquierda; acciones como botones redondos A (roja) y B (azul).
import { useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { TouchButton, TouchControls } from "@/lib/games/types";
const REPEAT_DELAY = 170; // ms hasta la primera repetición
const REPEAT_EVERY = 50; // ms entre repeticiones
const ACTION_LETTERS = ["A", "B"];
const DPAD: { dir: "up" | "down" | "left" | "right"; aria: string }[] = [
  { dir: "up", aria: "Arriba" },
  { dir: "left", aria: "Izquierda" },
  { dir: "right", aria: "Derecha" },
  { dir: "down", aria: "Abajo" },
];
interface Held {
  pointerId: number;
  code: string;
  delay: ReturnType<typeof setTimeout> | null;
  interval: ReturnType<typeof setInterval> | null;
}
function sendKey(type: "keydown" | "keyup", code: string, repeat = false) {
  const key = code === "Space" ? " " : code;
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key, repeat, bubbles: true }),
  );
}
function ariaFor(label: string) {
  return label.charAt(0) + label.slice(1).toLowerCase();
}
export function TouchControls({ controls }: { controls: TouchControls }) {
  // Botones pulsados por id ("dpad-left", "action-0") y su puntero.
  const heldRef = useRef(new Map<string, Held>());
  const [down, setDown] = useState<ReadonlySet<string>>(new Set());
  const syncDown = () => setDown(new Set(heldRef.current.keys()));
  const release = (id: string) => {
    const held = heldRef.current.get(id);
    if (!held) return;
    if (held.delay) clearTimeout(held.delay);
    if (held.interval) clearInterval(held.interval);
    heldRef.current.delete(id);
    sendKey("keyup", held.code);
  };
  // Al desmontar: suelta todo lo pulsado para no dejar teclas pegadas.
  useEffect(() => {
    const held = heldRef.current;
    return () => {
      for (const [id, h] of held) {
        if (h.delay) clearTimeout(h.delay);
        if (h.interval) clearInterval(h.interval);
        held.delete(id);
        sendKey("keyup", h.code);
      }
    };
  }, []);
  const handlers = (id: string, button: TouchButton) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      // Sin foco ni selección de texto ni eventos de ratón de compatibilidad.
      e.preventDefault();
      if (heldRef.current.has(id)) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // puntero ya liberado: se trata igual que una pulsación sin captura
      }
      const held: Held = {
        pointerId: e.pointerId,
        code: button.code,
        delay: null,
        interval: null,
      };
      if (button.repeat) {
        held.delay = setTimeout(() => {
          held.delay = null;
          sendKey("keydown", button.code, true);
          held.interval = setInterval(
            () => sendKey("keydown", button.code, true),
            REPEAT_EVERY,
          );
        }, REPEAT_DELAY);
      }
      heldRef.current.set(id, held);
      sendKey("keydown", button.code);
      syncDown();
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (heldRef.current.get(id)?.pointerId !== e.pointerId) return;
      release(id);
      syncDown();
    },
    onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (heldRef.current.get(id)?.pointerId !== e.pointerId) return;
      release(id);
      syncDown();
    },
    onLostPointerCapture: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (heldRef.current.get(id)?.pointerId !== e.pointerId) return;
      release(id);
      syncDown();
    },
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  });
  return (
    <div className="touch-pad" aria-label="Mando táctil">
      <div className="touch-dpad">
        {DPAD.map(({ dir, aria }) => {
          const button = controls.dpad[dir];
          if (!button) return null;
          const id = `dpad-${dir}`;
          return (
            <button
              key={id}
              type="button"
              tabIndex={-1}
              aria-label={aria}
              className={`touch-btn dpad-${dir}${down.has(id) ? " is-down" : ""}`}
              {...handlers(id, button)}
            >
              {button.label}
            </button>
          );
        })}
      </div>
      {controls.actions.length > 0 && (
        <div className="touch-actions">
          {/* A (acción principal) a la derecha y B a su izquierda. */}
          {controls.actions.map((button, i) => {
            const id = `action-${i}`;
            const letter = ACTION_LETTERS[i] ?? String(i + 1);
            return (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                aria-label={`${letter}: ${ariaFor(button.label)}`}
                title={button.label}
                className={`touch-btn action action-${letter.toLowerCase()}${down.has(id) ? " is-down" : ""}`}
                {...handlers(id, button)}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
