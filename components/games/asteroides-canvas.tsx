"use client";
import { useEffect, useRef } from "react";
import {
  createAsteroidesEngine,
  type AsteroidesCallbacks,
  type AsteroidesEngine,
} from "@/lib/games/asteroides/engine";
interface Props extends AsteroidesCallbacks {
  onReady(engine: AsteroidesEngine): void;
}
export function AsteroidesCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Callbacks en una ref: un re-render del padre no recrea el motor.
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroidesEngine(canvas, {
      onScore: (s) => propsRef.current.onScore(s),
      onLives: (l) => propsRef.current.onLives(l),
      onLevel: (l) => propsRef.current.onLevel(l),
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
