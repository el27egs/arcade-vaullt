"use client";
import { useEffect } from "react";
// Fallo de lectura (Supabase u otro): pantalla SIN SEÑAL con reintento.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="av-hall fade-in">
      <div className="lb-empty error" style={{ padding: "64px 20px" }}>
        <div
          className="lb-empty-title"
          style={{ fontSize: "clamp(18px, 3.5vw, 32px)" }}
        >
          SIN SEÑAL
        </div>
        <div className="lb-empty-sub">
          NO PUDIMOS CONECTAR CON LA BÓVEDA. AJUSTA LA ANTENA E INTENTA DE
          NUEVO.
        </div>
        <button
          className="btn lg"
          style={{ marginTop: 28 }}
          onClick={() => unstable_retry()}
        >
          REINTENTAR
        </button>
      </div>
    </div>
  );
}
