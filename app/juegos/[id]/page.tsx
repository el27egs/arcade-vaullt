import { notFound } from "next/navigation";
import { GameDetail } from "@/components/game-detail";
import { GAMES } from "@/lib/data";
import { getDbGame, getLeaderboard } from "@/lib/queries";
export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  const [dbGame, scores] = await Promise.all([
    getDbGame(id),
    getLeaderboard(id),
  ]);
  return <GameDetail game={game} dbGame={dbGame} scores={scores} />;
}
