import { GamesTable } from "@/components/games-table";
import { getDbGames } from "@/lib/queries";
export default async function JuegosPage() {
  const games = await getDbGames();
  return <GamesTable games={games} />;
}
