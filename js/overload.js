/*
 * overload.js
 * ----------------------------------------------------------------
 * Cálculo de sugerencias de sobrecarga progresiva y de series de
 * aproximación (calentamiento), redondeando siempre al incremento
 * de peso real disponible según el tipo de equipo.
 * ----------------------------------------------------------------
 */

const WEIGHT_INCREMENTS = {
  barbell: 5,       // barra libre / multipower / Smith / máquinas de discos en dos ejes → 5 kg
  dumbbell: 2,      // mancuernas de 2 en 2 kg
  pulley: 2.5,      // una sola polea (jalones, extensión tríceps, curl bayesian...) → 2.5 kg
  doublePulley: 5,  // dos poleas/torres a la vez (band pull apart, facepull, cruce de poleas) → 5 kg
  machine: 2.5,     // máquinas guiadas con selector de placas de 2.5 en 2.5 kg
  singleAxis: 2.5   // máquinas de disco con un único eje de carga (remo en T, remo en punta) de 2.5 en 2.5 kg
};
const DEFAULT_INCREMENT = 2.5;

function getIncrement(equipment) {
  return WEIGHT_INCREMENTS[equipment] || DEFAULT_INCREMENT;
}

function roundToIncrement(value, inc) {
  return Math.round(value / inc) * inc;
}

const Overload = {
  // prevSet: {weight, reps} del registro histórico de referencia (o null)
  // range: [min, max] reps objetivo de ESTA serie, esta semana
  // equipment: "barbell" | "dumbbell" | "pulley" | "machine" (opcional)
  suggestSet: function (prevSet, range, equipment) {
    const min = range[0], max = range[1];
    const inc = getIncrement(equipment);
    if (!prevSet || prevSet.weight === "" || prevSet.weight == null || isNaN(parseFloat(prevSet.weight))) {
      return { text: "Sin dato previo · objetivo " + min + "-" + max + " reps", mode: "none", weight: null, reps: null };
    }
    const w = parseFloat(prevSet.weight);
    const r = parseInt(prevSet.reps, 10);
    if (isNaN(r)) {
      return { text: "Sin dato previo · objetivo " + min + "-" + max + " reps", mode: "none", weight: null, reps: null };
    }
    if (r >= max) {
      const newW = roundToIncrement(w + inc, inc);
      return { text: newW + " kg × " + min + " reps (sube peso, +" + inc + " kg)", mode: "up", weight: newW, reps: min };
    } else {
      const newR = Math.min(r + 1, max);
      return { text: w + " kg × " + newR + " reps (misma carga, +reps)", mode: "hold", weight: w, reps: newR };
    }
  },

  computeWarmup: function (targetWeight, equipment) {
    if (!targetWeight || targetWeight <= 0) return [];
    const inc = getIncrement(equipment);
    let steps;
    if (targetWeight <= 20) steps = [[0.6, 8]];
    else if (targetWeight <= 45) steps = [[0.5, 7], [0.75, 4]];
    else steps = [[0.4, 6], [0.6, 4], [0.8, 2]];
    return steps.map(function (s) {
      const pct = s[0], reps = s[1];
      const w = roundToIncrement(targetWeight * pct, inc);
      return { weight: w, reps: reps, pct: Math.round(pct * 100) };
    });
  }
};
