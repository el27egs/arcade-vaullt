"use client";
import { useEffect, useRef } from "react";
import { createSnakeEngine } from "@/lib/games/snake/engine";
import type { GameCanvasProps } from "@/lib/games/types";
export function SnakeCanvas(props: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Callbacks en una ref: un re-render del padre no recrea el motor.
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSnakeEngine(canvas, {
      onScore: (s) => propsRef.current.onScore(s),
      onLevel: (l) => propsRef.current.onLevel?.(l),
      onGameOver: (s) => propsRef.current.onGameOver(s),
    });
    propsRef.current.onReady(engine);
    engine.start();
    return () => engine.destroy();
  }, []);
  // Canvas 1:1 dentro de la pantalla 4:3: alto completo y bandas negras a los lados.
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={800}
      style={{
        display: "block",
        height: "100%",
        width: "auto",
        margin: "0 auto",
      }}
    />
  );
}
