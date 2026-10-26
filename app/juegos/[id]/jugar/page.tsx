import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { GAMES } from "@/lib/data";
import { getDbGame } from "@/lib/queries";
export default async function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  // Etapa híbrida: la ficha sale de GAMES; solo guarda si el juego existe en Supabase.
  const dbGame = await getDbGame(id);
  return <GamePlayer game={game} canSave={dbGame !== null} />;
}
