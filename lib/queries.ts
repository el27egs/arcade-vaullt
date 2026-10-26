import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/data";
// ===== lib/queries.ts — lecturas de Supabase (solo servidor) =====
// Mapeo snake_case (base) → camelCase (TS). Si Supabase falla, se lanza.
export interface DbGame {
  id: string;
  title: string;
  category: Category;
  best: number;
  plays: number;
}
export interface LeaderboardRow {
  rank: number;
  gameId: string;
  gameTitle: string;
  playerName: string;
  score: number;
  createdAt: string;
}
const SCORE_COLUMNS =
  "id, game_id, player_name, score, created_at, games(title)";
type ScoreWithGame = {
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
  games: { title: string } | null;
};
function toRows(data: ScoreWithGame[]): LeaderboardRow[] {
  return data.map((r, i) => ({
    rank: i + 1,
    gameId: r.game_id,
    gameTitle: r.games?.title ?? r.game_id,
    playerName: r.player_name,
    score: r.score,
    createdAt: r.created_at,
  }));
}
function toGame(r: {
  id: string | null;
  title: string | null;
  category: string | null;
  best: number | null;
  plays: number | null;
}): DbGame {
  return {
    id: r.id ?? "",
    title: r.title ?? "",
    category: (r.category ?? "ARCADE") as Category,
    best: r.best ?? 0,
    plays: r.plays ?? 0,
  };
}
export async function getDbGames(): Promise<DbGame[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("id, title, category, best, plays")
    .order("title", { ascending: true });
  if (error) throw new Error(`getDbGames: ${error.message}`);
  return data.map(toGame);
}
export async function getDbGame(id: string): Promise<DbGame | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_with_stats")
    .select("id, title, category, best, plays")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getDbGame: ${error.message}`);
  return data ? toGame(data) : null;
}
// Top por score desc; a igualdad, la más antigua primero. Sin gameId: global.
export async function getLeaderboard(
  gameId?: string,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  let query = supabase.from("scores").select(SCORE_COLUMNS);
  if (gameId) query = query.eq("game_id", gameId);
  const { data, error } = await query
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getLeaderboard: ${error.message}`);
  return toRows(data);
}
export async function getRecentScores(limit = 5): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select(SCORE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentScores: ${error.message}`);
  return toRows(data);
}
