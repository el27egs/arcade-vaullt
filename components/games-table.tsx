import Link from "next/link";
import type { DbGame } from "@/lib/queries";
export function GamesTable({ games }: { games: DbGame[] }) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>JUEGOS</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS CARTUCHOS QUE YA ESTÁN EN LA BÓVEDA
        </p>
      </div>
      {games.length === 0 ? (
        <div className="lb-empty">
          <div className="lb-empty-title">NO HAY JUEGOS DISPONIBLES</div>
        </div>
      ) : (
        <div className="hall-table games-table">
          <div className="th">
            <div>JUEGO</div>
            <div>CATEGORÍA</div>
            <div>MEJOR PUNTUACIÓN</div>
            <div>PARTIDAS</div>
          </div>
          {games.map((g, i) => (
            <Link
              key={g.id}
              href={`/juegos/${g.id}`}
              className="tr"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="pl">{g.title}</div>
              <div className="dt">{g.category}</div>
              <div className="sc">{g.best.toLocaleString("es-ES")}</div>
              <div className="pl">{g.plays.toLocaleString("es-ES")}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
