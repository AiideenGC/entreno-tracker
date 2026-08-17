/*
 * routine.js
 * ----------------------------------------------------------------
 * Aquí vive TU rutina actual. Es la única parte del proyecto que
 * probablemente edites en el futuro (añadir/quitar ejercicios,
 * cambiar series, rangos de reps, sesiones, etc.).
 *
 * IMPORTANTE sobre el historial:
 * Cada vez que creas una semana nueva desde la app, se guarda una
 * "foto" (copia) de ROUTINE tal y como está en ese momento, dentro
 * de esa semana. Si más adelante cambias este archivo y despliegas
 * de nuevo, las semanas ya creadas NO se alteran: siguen mostrando
 * los ejercicios/series/rangos que tenían el día que las creaste.
 * Solo las semanas NUEVAS usarán la versión actualizada de abajo.
 *
 * Sube ROUTINE_VERSION cada vez que hagas un cambio de rutina
 * relevante (es solo informativo, no afecta al funcionamiento).
 * ----------------------------------------------------------------
 */

const ROUTINE_VERSION = 2;

/*
 * equipment: determina a qué salto de peso real se redondean las
 * sugerencias de sobrecarga progresiva y las series de aproximación.
 *   "barbell"  → barra libre / multipower (discos 20/10/5/2.5) → saltos de 5 kg
 *   "dumbbell" → mancuernas                                    → saltos de 2 kg
 *   "pulley"   → polea / cruce de poleas                       → saltos de 5 kg
 *   "machine"  → máquina guiada (stack tipo curl femoral)      → saltos de 2.5 kg
 * Si algún ejercicio no encaja, cambia solo su "equipment".
 */

const ROUTINE = {
  version: ROUTINE_VERSION,
  // El orden de las claves define el orden de las sesiones en el selector.
  sessions: {
    "1": [
      { name: "Press horizontal prono en máquina", sets: [[6,8],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "barbell" },
      { name: "Press inclinado en multipower 30º", sets: [[4,6],[6,8]], rir: 1, rest: "2'", warmup: true, equipment: "barbell" },
      { name: "Press plano con mancuernas", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "dumbbell" },
      { name: "Aperturas en Peck Deck", sets: [[10,12],[12,14],[12,14]], rir: 0, rest: "2'", equipment: "machine" },
      { name: "Elevaciones laterales con mancuerna de pie", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "dumbbell" },
      { name: "Elevaciones laterales en polea unilateral", sets: [[10,12],[12,14]], rir: 0, rest: "2'", equipment: "pulley" },
      { name: "Press francés con barra", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "barbell" },
      { name: "Extensión de tríceps en polea unilateral", sets: [[10,12],[12,14]], rir: 0, rest: "2'", equipment: "pulley" }
    ],
    "2": [
      { name: "Jalón al pecho neutro medio", sets: [[8,10],[10,12]], rir: 1, rest: "2'", warmup: true, equipment: "pulley" },
      { name: "Remo alto en máquina", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "barbell" },
      { name: "Remo en T (codos abiertos)", sets: [[6,8],[8,10],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "singleAxis" },
      { name: "Remo gironda unilateral", sets: [[10,12],[12,14],[12,14]], rir: 1, rest: "2'", equipment: "pulley" },
      { name: "Band pull apart en polea", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "doublePulley" },
      { name: "Facepull", sets: [[10,12],[12,14],[12,14]], rir: 0, rest: "2'", equipment: "doublePulley" },
      { name: "Curl martillo de pie", sets: [[8,10],[10,12]], rir: 0, rest: "2'", equipment: "dumbbell" },
      { name: "Curl bayesian unilateral", sets: [[10,12],[12,14]], rir: 0, rest: "2'", equipment: "pulley" }
    ],
    "3": [
      { name: "Elevaciones de talón en máquina", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "machine" },
      { name: "Aducciones en máquina", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "machine" },
      { name: "Hack Squat", sets: [[6,8],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "barbell" },
      { name: "Prensa 45º", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "barbell" },
      { name: "Extensión de cuádriceps", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "machine" },
      { name: "Curl femoral sentado", sets: [[10,12],[12,14]], rir: 0, rest: "2'", equipment: "machine" },
      { name: "Hip Thrust en máquina", sets: [[6,8],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "barbell" },
      { name: "Crunch abdominal en máquina", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "machine" }
    ],
    "4": [
      { name: "Press inclinado en máquina", sets: [[8,10],[10,12]], rir: 1, rest: "2'", warmup: true, equipment: "machine" },
      { name: "Press banca inclinado con mancuernas 30º", sets: [[6,8],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "dumbbell" },
      { name: "Fondos de tríceps en máquina", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "barbell" },
      { name: "Cruce de poleas", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "doublePulley" },
      { name: "Elevaciones laterales sentado con mancuernas", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "dumbbell" },
      { name: "Elevaciones laterales en polea", sets: [[10,12],[12,14]], rir: 0, rest: "2'", equipment: "pulley" },
      { name: "Kaz press en multipower", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "barbell" },
      { name: "Extensión de tríceps con cuerda overhead", sets: [[10,12],[12,14]], rir: 0, rest: "2'", equipment: "pulley" }
    ],
    "5": [
      { name: "Jalón al pecho unilateral", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "pulley" },
      { name: "Remo en punta", sets: [[6,8],[8,10],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "singleAxis" },
      { name: "Remo en máquina neutro", sets: [[6,8],[8,10],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "machine" },
      { name: "Remo gironda agarre neutro medio", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "pulley" },
      { name: "Band pull apart inclinado en polea", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "doublePulley" },
      { name: "Elevaciones con mancuernas para deltoides posterior", sets: [[10,12],[12,14],[12,14]], rir: 0, rest: "2'", equipment: "dumbbell" },
      { name: "Dead curl con barra recta", sets: [[6,8],[8,10]], rir: 0, rest: "2'", equipment: "barbell" },
      { name: "Curl predicador en máquina unilateral", sets: [[10,12],[12,14]], rir: 0, rest: "2'", equipment: "singleAxis" }
    ],
    "6": [
      { name: "Elevaciones de talón piernas rectas", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "barbell" },
      { name: "Aducciones en máquina", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "machine" },
      { name: "Peso muerto rumano con barra", sets: [[4,6],[6,8]], rir: 1, rest: "2'", warmup: true, equipment: "barbell" },
      { name: "Hip Thrust con barra", sets: [[6,8],[8,10]], rir: 1, rest: "2'", equipment: "barbell" },
      { name: "Hack Squat", sets: [[6,8],[8,10]], rir: 1, rest: "2'", warmup: true, equipment: "barbell" },
      { name: "Prensa 45º", sets: [[8,10],[10,12]], rir: 1, rest: "2'", equipment: "barbell" },
      { name: "Sentadilla búlgara con mancuernas", sets: [[10,12],[12,14]], rir: 1, rest: "2'", equipment: "dumbbell" },
      { name: "Crunch abdominal en máquina", sets: [[8,10],[10,12],[10,12]], rir: 0, rest: "2'", equipment: "machine" }
    ]
  }
};
