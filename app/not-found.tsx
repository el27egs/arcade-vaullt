import Link from "next/link";

export default function NotFound() {
  return (
    <div className="av-player fade-in">
      <div className="crt">
        <div className="crt-screen">
          <div className="crt-content">
            <div>
              <div className="pixel neon-magenta" style={{ fontSize: 22 }}>
                SEÑAL PERDIDA
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>
                ESTA PANTALLA NO EXISTE EN EL VAULT
              </div>
            </div>
          </div>
        </div>
        <div className="crt-bottom">
          <span>ERROR 404</span>
          <span>ARCADE VAULT · CRT-83</span>
          <span>CARGA · 0MB</span>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/" className="btn lg">
          VOLVER AL VAULT
        </Link>
      </div>
    </div>
  );
}
