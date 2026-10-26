"use server";
import { createClient } from "@/lib/supabase/server";
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
const MAX_SCORE = 10_000_000;
export async function saveScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SaveScoreResult> {
  const gameId = String(input?.gameId ?? "");
  const playerName = String(input?.playerName ?? "").trim();
  const score = input?.score;
  // Misma regla que el CHECK de la base: 1–20 caracteres tras trim.
  const nameLength = [...playerName].length;
  if (nameLength < 1 || nameLength > 20) {
    return {
      ok: false,
      error: "El nombre debe tener entre 1 y 20 caracteres.",
    };
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "Puntuación no válida." };
  }
  try {
    const supabase = await createClient();
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) return { ok: false, error: gameError.message };
    if (!game) {
      return { ok: false, error: "Este juego no guarda puntuaciones." };
    }
    const { error } = await supabase.from("scores").insert({
      game_id: gameId,
      player_name: playerName,
      score,
      user_id: null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo guardar la puntuación.";
    return { ok: false, error: message };
  }
}
