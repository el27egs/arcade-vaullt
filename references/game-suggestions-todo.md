# Sugerencias de juegos — TO DO

Mantenido por el agente `game-planner`. No repetir ideas ya listadas.

## Pendientes

- [ ] **ANTIGRAVEDAD** (`antigravedad`) — ARCADE · magenta — Invierte la gravedad y esquiva el corredor de neón. _Sugerido: 2026-10-27_
  - Mecánica: runner de scroll lateral automático; una tecla (Espacio/↑/↓) invierte la gravedad entre suelo y techo para esquivar pinchos, huecos y bloques móviles; tramos predefinidos en `levels.ts` elegidos al azar por dificultad · Puntuación: distancia × nivel + chispas (50 × nivel) · Por qué encaja: género runner ausente en el catálogo, control de un botón, partidas cortas y muy rejugables, magenta solo lo usa TETRIS · Esfuerzo: bajo
- [ ] **ENJAMBRE** (`enjambre`) — SHOOTER · magenta — Abre fuego contra oleadas que bajan en picada. _Sugerido: 2026-10-27_
  - Mecánica: shooter vertical con movimiento libre en 2D; escuadrones que entran en formación y se lanzan en picada siguiendo trayectorias; power-up de disparo doble/triple; jefe cada 5 oleadas · Puntuación: puntos por enemigo según tipo, bonus por oleada sin daño y por jefe · Por qué encaja: segundo shooter con mecánica distinta a ASTEROIDES (sin rotación ni inercia) y distinta al cañón fijo del mock INVASORES · Esfuerzo: medio
- [ ] **BURBUJAS** (`burbujas`) — PUZZLE · cyan — Apunta, dispara y revienta racimos de colores. _Sugerido: 2026-10-27_
  - Mecánica: cañón inferior que rota con ←/→ y dispara orbes de color que rebotan en las paredes y se pegan a una rejilla hexagonal; 3+ del mismo color revientan y los racimos que quedan colgando caen; el techo baja cada N disparos · Puntuación: 10 por orbe reventado, 20 × n² por orbes caídos, bonus por limpiar tablero · Por qué encaja: segundo PUZZLE con mecánica de puntería, no de encaje · Esfuerzo: medio
- [ ] **TANQUES** (`tanques`) — VERSUS · yellow — Duelo de tanques con balas que rebotan contra la CPU. _Sugerido: 2026-10-27_
  - Mecánica: arena cenital con muros; tu tanque (flechas + Espacio) contra tanques CPU; las balas rebotan una vez en los muros; cada ronda añade un tanque enemigo o lo hace más agresivo · Puntuación: 500 por tanque destruido × ronda + bonus por tiempo · Por qué encaja: primer juego real en VERSUS (categoría sin implementar) jugable en solitario · Esfuerzo: medio-alto (IA de la CPU)
- [ ] **TORRE** (`torre`) — ARCADE · amarillo — Apila bloques al milímetro y sube tu torre hasta el cielo. _Sugerido: 2026-10-27_
  - Mecánica: un bloque oscila sobre la torre; al soltarlo se recorta lo que sobresale; encajes perfectos no recortan y una racha ensancha el bloque; un botón · Puntuación: 10 × piso + 50 × racha por perfecto · Por qué encaja: precisión de un botón, ausente en el catálogo · Esfuerzo: bajo
- [ ] **ALUNIZAJE** (`alunizaje`) — ARCADE · verde — Domina el empuje y posa tu módulo antes de quedarte sin combustible. _Sugerido: 2026-10-27_
  - Mecánica: módulo vectorial con gravedad, rotación y empuje; terreno generado con plataformas ×1–×5; aterrizaje suave y vertical; combustible compartido toda la partida; viento desde nivel 3 · Puntuación: 100 × multiplicador × nivel + bonus suavidad/combustible · Por qué encaja: física de empuje, reutiliza el estilo vectorial de ASTEROIDES · Esfuerzo: medio
- [ ] **GANCHO** (`gancho`) — ARCADE · amarillo — Engánchate, balancéate y escala la torre de neón sin caer al vacío. _Sugerido: 2026-10-27_
  - Mecánica: ascenso vertical con física de péndulo; mantener Espacio engancha al anclaje superior más cercano, soltar lanza con inercia; pantalla que sube sola; anclajes móviles/frágiles y pinchos · Puntuación: metros × nivel + gemas (100) + multiplicador por enganches encadenados · Por qué encaja: balanceo e inercia, distinto a ANTIGRAVEDAD · Esfuerzo: medio
- [ ] **MINERO** (`minero`) — ARCADE · cian — Excava hacia el núcleo, recoge gemas y vuelve a por aire antes de asfixiarte. _Sugerido: 2026-10-27_
  - Mecánica: pozo vertical en rejilla; cavar izquierda/derecha/abajo; bloques sin apoyo caen y aplastan; oxígeno que baja y se recarga con burbujas o en superficie; bloques duros, gemas y bolsas de gas · Puntuación: 10 × metro × nivel + gemas (100–500) + 1.000 × nivel por estrato · Por qué encaja: excavación y gestión de recurso, inédito en el catálogo · Esfuerzo: medio
- [ ] **COSECHA** (`cosecha`) — ARCADE · amarillo — Atrapa la lluvia de frutas con tu cesta y esquiva las bombas. _Sugerido: 2026-10-27_
  - Mecánica: cesta horizontal; frutas con trayectorias recta/zigzag/rebote y bombas; 3 frutas perdidas = vida; power-ups cesta ancha, imán, cámara lenta · Puntuación: 10–50 por fruta × racha (×1–×8), fruta dorada 500 · Por qué encaja: atrapar objetos, casual y rejugable · Esfuerzo: bajo
- [ ] **CIRCUITO** (`circuito`) — PUZZLE · verde — Gira los conductos y guía la energía antes de que se desborde. _Sugerido: 2026-10-27_
  - Mecánica: rejilla 7×7 (hasta 9×9) de conductos (recta, codo, T, cruz); tras una cuenta atrás la energía avanza y hay que girar piezas para llevarla al núcleo; bloques fijos en niveles altos · Puntuación: 50 × nivel por celda recorrida + bonus cruces + 1.000 × nivel al llegar · Por qué encaja: primer PUZZLE verde, tensión arcade + planificación · Esfuerzo: medio
- [ ] **CRISTALES** (`cristales`) — PUZZLE · magenta — Intercambia cristales vecinos y encadena combos de neón. _Sugerido: 2026-10-27_
  - Mecánica: tablero 8×8 con 6 tipos; intercambiar vecinos para formar 3+ en línea; cascadas; reloj que se recarga al romper; 7.º color en niveles altos · Puntuación: 10 por cristal × cascada + bonus líneas de 4 y 5 · Por qué encaja: PUZZLE de intercambio, distinto de TETRIS y BURBUJAS · Esfuerzo: medio
- [ ] **DESLIZ** (`desliz`) — PUZZLE · cian — Patina sobre hielo de neón y recoge cada gema sin quedarte atascado. _Sugerido: 2026-10-27_
  - Mecánica: laberinto de hielo en rejilla; el personaje se desliza hasta chocar; recoger gemas y llegar a la salida; agujeros mortales y rocas empujables; ~15 niveles en `levels.ts` · Puntuación: 100 por gema + (par − movimientos) × 50 + tiempo, × nivel · Por qué encaja: lógica pura en rejilla con vidas · Esfuerzo: medio (diseño de niveles)
- [ ] **ECO** (`eco`) — PUZZLE · amarillo — Memoriza la secuencia de luces y repítela sin fallar. _Sugerido: 2026-10-27_
  - Mecánica: 4 paneles de neón con tonos WebAudio; secuencia creciente a repetir; variantes de secuencia inversa y paneles que cambian de sitio · Puntuación: 10 × longitud por paso + bonus rapidez · Por qué encaja: memoria, un solo tipo de input, el más barato · Esfuerzo: bajo
- [ ] **APAGÓN** (`apagon`) — PUZZLE · amarillo — Apaga todas las luces del tablero antes de que acabe el tiempo. _Sugerido: 2026-10-27_
  - Mecánica: rejilla 5×5 (hasta 7×7); pulsar invierte la celda y sus 4 vecinas; tableros generados desde apagado (siempre resolubles) con par de referencia; reloj · Puntuación: 500 × nivel + (par − pulsaciones) × 100 + segundos × 10 · Por qué encaja: lógica procedural sin niveles a mano · Esfuerzo: bajo
- [ ] **PRISMA** (`prisma`) — SHOOTER · magenta — Muévete en una dirección y dispara en otra en una arena de neón. _Sugerido: 2026-10-27_
  - Mecánica: shooter de dos controles (WASD mover, flechas disparar en 8 direcciones) en arena cerrada; enemigos perseguidor/errante/divisor; gemas que suben un multiplicador que se pierde al recibir daño · Puntuación: 50/100/150 × multiplicador (x1–x10) + 1.000 × nivel por oleada · Por qué encaja: shooter sin rotación ni scroll, distinto a ASTEROIDES y ENJAMBRE · Esfuerzo: bajo-medio
- [ ] **ÓRBITA** (`orbita`) — SHOOTER · cian — Gira alrededor del núcleo y frena lo que sale del vórtice. _Sugerido: 2026-10-27_
  - Mecánica: nave sobre una circunferencia que dispara al centro; enemigos salen del vórtice en espiral; jefe-anillo cada 4 sectores · Puntuación: 100 por enemigo × hasta x3 por cercanía al centro + 500 × nivel por sector sin daño · Por qué encaja: shooter en coordenadas polares · Esfuerzo: medio
- [ ] **BARRERA** (`barrera`) — SHOOTER · verde — Intercepta la lluvia de misiles antes de que caiga sobre tus torres. _Sugerido: 2026-10-27_
  - Mecánica: mira libre y 3 baterías (Z/X/C) con munición limitada; interceptores que explotan en ondas que encadenan; misiles que se dividen y bombarderos; 6 torres como vidas · Puntuación: 25 × nivel por misil × cadena + bonus torres y munición · Por qué encaja: defensa antiaérea, inédita en el catálogo · Esfuerzo: bajo-medio
- [ ] **CAVERNA** (`caverna`) — SHOOTER · amarillo — Vuela por túneles con scroll lateral sin quedarte sin combustible. _Sugerido: 2026-10-27_
  - Mecánica: scroll horizontal por túnel generado por tramos; láser y bombas contra torretas, cohetes y depósitos; el combustible solo se recarga destruyendo depósitos; 4 zonas en `levels.ts` · Puntuación: objetivos (100/150/200) + distancia × nivel · Por qué encaja: shooter horizontal con gestión de recurso · Esfuerzo: medio-alto
- [ ] **REFLEJO** (`reflejo`) — SHOOTER · magenta — Sin cañón: devuelve sus propios disparos con tu escudo. _Sugerido: 2026-10-27_
  - Mecánica: la nave no dispara; un escudo en arco (A/D) refleja proyectiles contra torreones; balas rojas no reflejables; formaciones en `levels.ts` · Puntuación: 150 por torreón, combos x2/x3 por rebote múltiple + bonus tiempo · Por qué encaja: shooter invertido · Esfuerzo: medio
- [ ] **TERRITORIO** (`territorio`) — VERSUS · cian — Pinta más casillas que la CPU antes de que acabe el reloj. _Sugerido: 2026-10-27_
  - Mecánica: arena en rejilla con tu cursor y 1–3 cursores CPU; pisar pinta, encerrar zonas las rellena; choques aturden 1 s; power-ups bomba 3×3, velocidad y congelar; rondas de 60 s · Puntuación: 10 × casilla × nivel + 1.000 × nivel por ganar + bonus >50 % · Por qué encaja: estreno barato de VERSUS · Esfuerzo: bajo
- [ ] **EMPUJE** (`empuje`) — VERSUS · verde — Embiste a los rivales fuera de un ring que se encoge. _Sugerido: 2026-10-27_
  - Mecánica: arena circular cenital con inercia y choques elásticos; embestida con recarga; expulsar discos CPU (pesado, rápido, embestidor); el ring se encoge · Puntuación: 300 × nivel por expulsión + bonus cadena y tiempo · Por qué encaja: VERSUS con física · Esfuerzo: medio
- [ ] **PÚGIL** (`pugil`) — VERSUS · amarillo — Esquiva, bloquea y contraataca a boxeadores de pixel. _Sugerido: 2026-10-27_
  - Mecánica: combate visto desde la espalda; los rivales avisan el golpe; esquivar/bloquear abre ventana de contraataque; barra de energía, rounds de 60 s; escalera de 5–6 rivales originales · Puntuación: 50 golpe, 150 contraataque, 2.000 × rival por KO + bonus · Por qué encaja: lectura de patrones contra la CPU · Esfuerzo: medio (sprites)
- [ ] **ESTELA** (`estela`) — VERSUS · magenta — Encierra a las motos CPU con tu rastro de luz. _Sugerido: 2026-10-27_
  - Mecánica: motos en rejilla que dejan pared de luz; chocar elimina; último en pie gana; turbo limitado; 1–4 motos CPU · Puntuación: 1 por tick + 500 × nivel por rival eliminado + 1.000 × nivel por ronda · Por qué encaja: VERSUS de rejilla barato · Esfuerzo: bajo
- [ ] **DERRAPE** (`derrape`) — VERSUS · verde — Derrapa en pistas de neón y deja atrás a los coches CPU. _Sugerido: 2026-10-27_
  - Mecánica: carrera cenital con giro, aceleración y derrape contra 3 coches CPU por puntos de paso; 5 pistas en `levels.ts`; derrapes cargan turbo · Puntuación: 3000/1500/500/0 × pista por posición + bonus vuelta rápida y derrape · Por qué encaja: carreras, género ausente · Esfuerzo: alto

## Implementadas

## Descartadas
