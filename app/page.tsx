import { connection } from "next/server";
import { Home, type HomeActivity } from "@/components/home";
import { getLeaderboard, getRecentScores } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
// La actividad es secundaria: si Supabase falla, el home carga igual (SIN SEÑAL).
async function loadActivity(): Promise<HomeActivity> {
  try {
    const [recent, top] = await Promise.all([
      getRecentScores(5),
      getLeaderboard(undefined, 5),
    ]);
    return {
      recent: recent.map((r) => ({ ...r, ago: timeAgo(r.createdAt) })),
      top,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}
export default async function Page() {
  // Datos frescos en cada request; fuera del try para no tragar la señal de render dinámico.
  await connection();
  const activity = await loadActivity();
  return <Home activity={activity} />;
}
