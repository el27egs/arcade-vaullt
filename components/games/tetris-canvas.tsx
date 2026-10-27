"use client";
import { useEffect, useRef } from "react";
import { createTetrisEngine } from "@/lib/games/tetris/engine";
import type { GameCanvasProps } from "@/lib/games/types";
export function TetrisCanvas(props: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Callbacks en una ref: un re-render del padre no recrea el motor.
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createTetrisEngine(canvas, {
      onScore: (s) => propsRef.current.onScore(s),
      onLevel: (l) => propsRef.current.onLevel?.(l),
      onLines: (l) => propsRef.current.onLines?.(l),
      onGameOver: (s) => propsRef.current.onGameOver(s),
    });
    propsRef.current.onReady(engine);
    engine.start();
    return () => engine.destroy();
  }, []);
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}
