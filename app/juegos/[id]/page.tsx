import { notFound } from "next/navigation";
import { GameDetail } from "@/components/game-detail";
import { GAMES } from "@/lib/data";

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);

  if (!game) notFound();

  return <GameDetail game={game} />;
}
