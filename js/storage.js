/*
 * storage.js
 * ----------------------------------------------------------------
 * Todo el estado de la app vive en localStorage bajo una única
 * clave. Cada "semana" guarda su propia copia (snapshot) de la
 * rutina tal y como estaba al crearla, así que cambiar routine.js
 * en el futuro nunca reescribe el historial.
 * ----------------------------------------------------------------
 */

const STORAGE_KEY = "entrenoTracker_v1";

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function emptySessionsFromSnapshot(snapshot) {
  const sessions = {};
  Object.keys(snapshot.sessions).forEach(function (sessionNum) {
    const exercises = {};
    snapshot.sessions[sessionNum].forEach(function (ex) {
      exercises[ex.name] = {
        sets: ex.sets.map(function () { return { weight: "", reps: "" }; })
      };
    });
    sessions[sessionNum] = { completed: false, exercises: exercises };
  });
  return sessions;
}

const Storage = {
  load: function () {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn("No se pudo leer localStorage", e);
    }
    if (!raw) {
      return { weeks: [] };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.weeks) parsed.weeks = [];
      return parsed;
    } catch (e) {
      console.warn("Datos corruptos en localStorage, empezando de cero", e);
      return { weeks: [] };
    }
  },

  save: function (state) {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error("Error guardando en localStorage", e);
      return false;
    }
  },

  // Crea una semana nueva a partir de la rutina ACTUAL (routine.js),
  // con todos los campos de entrenamiento vacíos.
  createWeek: function (state, opts) {
    opts = opts || {};
    const existingNumbers = state.weeks.map(function (w) { return w.number; });
    const nextNumber = existingNumbers.length ? Math.max.apply(null, existingNumbers) + 1 : 1;
    const snapshot = deepClone(ROUTINE);
    const week = {
      id: "week-" + Date.now(),
      number: opts.number || nextNumber,
      label: opts.label || ("Semana " + (opts.number || nextNumber)),
      startDate: opts.startDate || todayISO(),
      createdAt: new Date().toISOString(),
      routineSnapshot: snapshot,
      sessions: emptySessionsFromSnapshot(snapshot)
    };
    state.weeks.push(week);
    state.weeks.sort(function (a, b) { return a.number - b.number; });
    Storage.save(state);
    return week;
  },

  getWeekById: function (state, weekId) {
    return state.weeks.find(function (w) { return w.id === weekId; }) || null;
  },

  // Vuelve a copiar la rutina ACTUAL (routine.js) dentro de una semana ya
  // creada -- útil si corriges una clasificación de equipo, un rango de
  // reps, etc. DESPUÉS de haber creado esa semana. Conserva los pesos y
  // reps que ya hubieras escrito para los ejercicios que sigan existiendo
  // (emparejados por nombre); los ejercicios nuevos entran vacíos, y los
  // que hayas quitado de la rutina se descartan de esa semana.
  refreshWeekFromRoutine: function (state, week) {
    const newSnapshot = deepClone(ROUTINE);
    const newSessions = {};
    Object.keys(newSnapshot.sessions).forEach(function (sessionNum) {
      const oldSession = week.sessions[sessionNum];
      const exercises = {};
      newSnapshot.sessions[sessionNum].forEach(function (ex) {
        const oldExData = oldSession && oldSession.exercises[ex.name];
        const sets = ex.sets.map(function (_, i) {
          if (oldExData && oldExData.sets[i]) return oldExData.sets[i];
          return { weight: "", reps: "" };
        });
        exercises[ex.name] = { sets: sets };
      });
      newSessions[sessionNum] = {
        completed: oldSession ? oldSession.completed : false,
        exercises: exercises
      };
    });
    week.routineSnapshot = newSnapshot;
    week.sessions = newSessions;
    Storage.save(state);
    return week;
  },

  // Busca, para un ejercicio de una sesión concreta, el registro
  // histórico válido más reciente ANTES de la semana actual.
  // "Válido" = al menos una serie con peso y reps rellenados.
  findPreviousExerciseData: function (state, currentWeekNumber, sessionNum, exerciseName) {
    const candidates = state.weeks
      .filter(function (w) { return w.number < currentWeekNumber; })
      .sort(function (a, b) { return b.number - a.number; }); // más reciente primero

    for (let i = 0; i < candidates.length; i++) {
      const session = candidates[i].sessions[sessionNum];
      if (!session) continue;
      const exData = session.exercises[exerciseName];
      if (!exData) continue;
      const hasValid = exData.sets.some(function (s) {
        return s.weight !== "" && s.weight != null && s.reps !== "" && s.reps != null;
      });
      if (hasValid) {
        return { weekNumber: candidates[i].number, sets: exData.sets };
      }
    }
    return null;
  },

  // Historial reciente (peso/reps de la 1ª serie) de un ejercicio, semanas
  // anteriores a currentWeekNumber, más reciente primero. Se usa solo para
  // detectar estancamiento -- nunca para calcular la sugerencia de peso,
  // que siempre se basa en la referencia más reciente (findPreviousExerciseData).
  getExerciseHistory: function (state, currentWeekNumber, sessionNum, exerciseName, limit) {
    limit = limit || 4;
    const candidates = state.weeks
      .filter(function (w) { return w.number < currentWeekNumber; })
      .sort(function (a, b) { return b.number - a.number; });

    const history = [];
    for (let i = 0; i < candidates.length && history.length < limit; i++) {
      const session = candidates[i].sessions[sessionNum];
      if (!session) continue;
      const exData = session.exercises[exerciseName];
      if (!exData) continue;
      const firstSet = exData.sets[0];
      if (firstSet && firstSet.weight !== "" && firstSet.weight != null && firstSet.reps !== "" && firstSet.reps != null) {
        history.push({
          weekNumber: candidates[i].number,
          weight: parseFloat(firstSet.weight),
          reps: parseInt(firstSet.reps, 10)
        });
      }
    }
    return history; // más reciente primero
  },

  exportBackup: function (state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = todayISO();
    a.href = url;
    a.download = "entreno-backup-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importBackup: function (file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed || !Array.isArray(parsed.weeks)) {
            reject(new Error("El archivo no tiene el formato esperado."));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(file);
    });
  }
};
