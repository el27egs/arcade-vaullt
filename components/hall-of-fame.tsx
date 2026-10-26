"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeaderboardRow } from "@/lib/queries";
// Fecha ya formateada en el servidor para no depender de la zona horaria del cliente.
export type HallRow = LeaderboardRow & { date: string };
export interface HallTab {
  id: string; // "global" o id del juego
  title: string;
}
const GLOBAL_TAB = "global";
function PodiumSlot({
  row,
  place,
}: {
  row: HallRow | undefined;
  place: 1 | 2 | 3;
}) {
  const medal = place === 1 ? "gold" : place === 2 ? "silver" : "bronze";
  const big = place === 1;
  return (
    <div className={`podium-slot ${medal}` + (row ? "" : " vacant")}>
      {big && (
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--gold)",
            letterSpacing: "0.18em",
          }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={big ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {String(place).padStart(2, "0")}
      </div>
      <div className="name">{row ? row.playerName : "---"}</div>
      <div className="score" style={big ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("es-ES") : "---"}
      </div>
      <div className="date">{row ? row.date : "---"}</div>
    </div>
  );
}
export function HallOfFame({
  tabs,
  boards,
}: {
  tabs: HallTab[];
  boards: Record<string, HallRow[]>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(GLOBAL_TAB);
  const rows = boards[tab] ?? [];
  const isGlobal = tab === GLOBAL_TAB;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"chip" + (tab === t.id ? " active" : "")}
            onClick={() => setTab(t.id)}
          >
            {t.title}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="lb-empty">
          <div className="lb-empty-title">
            SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA
          </div>
          <div className="lb-empty-sub">
            TODAVÍA NO HAY PUNTUACIONES. JUEGA UNA PARTIDA Y GUARDA TU NOMBRE.
          </div>
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot row={rows[1]} place={2} />
            <PodiumSlot row={rows[0]} place={1} />
            <PodiumSlot row={rows[2]} place={3} />
          </div>
          <div className={"hall-table" + (isGlobal ? " global" : "")}>
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              {isGlobal && <div>JUEGO</div>}
              <div>PUNTUACIÓN</div>
              <div className="dt">FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={`${r.rank}-${r.createdAt}`}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.playerName}</div>
                {isGlobal && <div className="gm">{r.gameTitle}</div>}
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn lg" onClick={() => router.push("/")}>
          VOLVER A LA BIBLIOTECA
        </button>
      </div>
    </div>
  );
}
