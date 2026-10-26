import {
  HallOfFame,
  type HallRow,
  type HallTab,
} from "@/components/hall-of-fame";
import { getDbGames, getLeaderboard, type LeaderboardRow } from "@/lib/queries";
import { formatDate } from "@/lib/format";
const GLOBAL_TAB = "global"; // misma clave que usa HallOfFame
const withDate = (rows: LeaderboardRow[]): HallRow[] =>
  rows.map((r) => ({ ...r, date: formatDate(r.createdAt) }));
export default async function SalonDeLaFamaPage() {
  const games = await getDbGames();
  // Global + uno por juego; las pestañas filtran en cliente sin nueva consulta.
  const [global, ...perGame] = await Promise.all([
    getLeaderboard(),
    ...games.map((g) => getLeaderboard(g.id)),
  ]);
  const tabs: HallTab[] = [
    { id: GLOBAL_TAB, title: "GLOBAL" },
    ...games.map((g) => ({ id: g.id, title: g.title })),
  ];
  const boards: Record<string, HallRow[]> = { [GLOBAL_TAB]: withDate(global) };
  games.forEach((g, i) => {
    boards[g.id] = withDate(perGame[i]);
  });
  return <HallOfFame tabs={tabs} boards={boards} />;
}
