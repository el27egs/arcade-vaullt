// ===== lib/format.ts — formato de fechas para tablas y actividad =====
// dd/mm/aaaa
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
// HACE 3 MIN · HACE 2 H · HACE 4 D
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(
    1,
    Math.floor((now - new Date(iso).getTime()) / 60000),
  );
  if (minutes < 60) return `HACE ${minutes} MIN`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `HACE ${hours} H`;
  return `HACE ${Math.floor(hours / 24)} D`;
}
