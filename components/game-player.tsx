"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";
import type { Game } from "@/lib/data";
import type { AsteroidesEngine } from "@/lib/games/asteroides/engine";
import { AsteroidesCanvas } from "@/components/games/asteroides-canvas";
// Último nombre guardado con éxito, leído como store externo (sin setState en efectos).
const NAME_KEY = "av_player_name";
const MAX_NAME = 20;
const nameListeners = new Set<() => void>();
function readStoredName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}
function writeStoredName(value: string) {
  try {
    localStorage.setItem(NAME_KEY, value);
  } catch {
    // localStorage unavailable — the name is just not remembered
  }
  nameListeners.forEach((l) => l());
}
function subscribeName(listener: () => void) {
  nameListeners.add(listener);
  return () => {
    nameListeners.delete(listener);
  };
}
export function GamePlayer({
  game,
  canSave,
}: {
  game: Game;
  canSave: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  // Prellenado: av_player_name > user.name > vacío; lo que se escribe tiene prioridad.
  const storedName = useSyncExternalStore(
    subscribeName,
    readStoredName,
    () => null,
  );
  const [draftName, setDraftName] = useState<string | null>(null);
  const name = (draftName ?? storedName ?? user?.name ?? "").slice(0, MAX_NAME);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const onSave = () => {
    const playerName = name.trim();
    if (!playerName) return;
    setSaveError(null);
    startSaving(async () => {
      try {
        const result = await saveScore({ gameId: game.id, playerName, score });
        if (result.ok) {
          writeStoredName(playerName);
          setSaved(true);
        } else {
          setSaveError(result.error);
        }
      } catch {
        setSaveError("No se pudo conectar. Intenta de nuevo.");
      }
    });
  };
  // asteroides es un juego real: su motor escribe score/vidas/nivel/over.
  const isAsteroides = game.id === "asteroides";
  const engineRef = useRef<AsteroidesEngine | null>(null);
  // Puntaje del mock, en una ref para que el intervalo decida el nivel sin efectos.
  const mockScoreRef = useRef(0);
  useEffect(() => {
    if (isAsteroides || over || paused) return;
    const t = setInterval(() => {
      const next = mockScoreRef.current + Math.floor(10 + Math.random() * 90);
      mockScoreRef.current = next;
      setScore(next);
      if (next % 2500 < 100) setLevel((l) => l + 1);
    }, 220);
    return () => clearInterval(t);
  }, [isAsteroides, over, paused]);
  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);
  // asteroides: P/Escape alternan la pausa; perder foco o visibilidad pausa.
  useEffect(() => {
    if (!isAsteroides) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" && e.code !== "Escape") return;
      if (e.repeat || over) return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)
        return;
      e.preventDefault();
      setPaused((p) => !p);
    };
    const pause = () => setPaused(true);
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAsteroides, over]);
  const endGame = () => {
    if (isAsteroides) engineRef.current?.end();
    else setOver(true);
  };
  const restart = () => {
    engineRef.current?.restart();
    mockScoreRef.current = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name.trim() || "INVITADO"}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juegos/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          {isAsteroides ? (
            <AsteroidesCanvas
              onReady={(engine) => {
                engineRef.current = engine;
                engine.setPaused(paused);
              }}
              onScore={setScore}
              onLives={setLives}
              onLevel={setLevel}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!canSave ? (
              <div className="toast-saved demo">
                MODO DEMO · ESTA PUNTUACIÓN NO SE GUARDA
              </div>
            ) : !saved ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    maxLength={MAX_NAME}
                    onChange={(e) =>
                      setDraftName(e.target.value.slice(0, MAX_NAME))
                    }
                    placeholder="TU NOMBRE"
                    aria-label="Tu nombre"
                    disabled={saving}
                  />
                  <button
                    className="btn yellow"
                    onClick={onSave}
                    disabled={saving || name.trim() === ""}
                  >
                    {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveError && (
                  <div className="save-error" role="alert">
                    ▸ ERROR AL GUARDAR: {saveError}
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
