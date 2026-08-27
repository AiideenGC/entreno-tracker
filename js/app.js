/*
 * app.js
 * ----------------------------------------------------------------
 * Renderizado y lógica de interfaz. JavaScript "vanilla", sin
 * frameworks ni paso de compilación.
 * ----------------------------------------------------------------
 */

(function () {
  "use strict";

  let appState = Storage.load();
  let currentWeekId = null;
  let currentSession = null;
  let saveTimer = null;
  const localSaveListeners = [];

  const el = {
    weekSelect: document.getElementById("weekSelect"),
    newWeekBtn: document.getElementById("newWeekBtn"),
    refreshWeekBtn: document.getElementById("refreshWeekBtn"),
    startDateInput: document.getElementById("startDateInput"),
    dateRangeText: document.getElementById("dateRangeText"),
    sessionSelect: document.getElementById("sessionSelect"),
    completeBtn: document.getElementById("completeBtn"),
    exercisesContainer: document.getElementById("exercisesContainer"),
    saveStatus: document.getElementById("saveStatus"),
    exportBtn: document.getElementById("exportBtn"),
    importInput: document.getElementById("importInput"),
    noPrevWeekWarning: document.getElementById("noPrevWeekWarning"),
    syncCodeInput: document.getElementById("syncCodeInput"),
    syncConnectBtn: document.getElementById("syncConnectBtn"),
    syncDisconnectBtn: document.getElementById("syncDisconnectBtn"),
    syncStatusText: document.getElementById("syncStatusText")
  };

  // ---------- utilidades de fecha ----------

  const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  function parseISO(iso) {
    const parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function formatRange(startISO, spanDays) {
    const start = parseISO(startISO);
    const end = addDays(start, spanDays - 1);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return start.getDate() + "–" + end.getDate() + " " + MONTHS_ES[start.getMonth()] + " " + start.getFullYear();
    }
    const sameYear = start.getFullYear() === end.getFullYear();
    const startStr = start.getDate() + " " + MONTHS_ES[start.getMonth()] + (sameYear ? "" : " " + start.getFullYear());
    const endStr = end.getDate() + " " + MONTHS_ES[end.getMonth()] + " " + end.getFullYear();
    return startStr + " – " + endStr;
  }

  // ---------- estado / semanas ----------

  function getCurrentWeek() {
    return Storage.getWeekById(appState, currentWeekId);
  }

  function sortedWeeks() {
    return appState.weeks.slice().sort(function (a, b) { return a.number - b.number; });
  }

  function persist(showStatus) {
    Storage.save(appState);
    localSaveListeners.forEach(function (fn) { fn(appState); });
    if (showStatus) {
      const now = new Date();
      el.saveStatus.textContent = "Guardado automáticamente · " +
        String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0") + ":" + String(now.getSeconds()).padStart(2,"0");
      el.saveStatus.classList.add("visible");
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { persist(true); }, 300);
  }

  // ---------- render: selector de semanas ----------

  function renderWeekSelector() {
    const weeks = sortedWeeks();
    el.weekSelect.innerHTML = "";
    weeks.forEach(function (w) {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = "Semana " + w.number;
      el.weekSelect.appendChild(opt);
    });
    el.weekSelect.value = currentWeekId;
  }

  function renderDateInfo() {
    const week = getCurrentWeek();
    el.startDateInput.value = week.startDate;
    el.dateRangeText.textContent = "Semana " + week.number + " · " + formatRange(week.startDate, 9);
  }

  // ---------- render: selector de sesión ----------

  function renderSessionSelector() {
    const week = getCurrentWeek();
    const sessionNums = Object.keys(week.routineSnapshot.sessions).sort(function (a, b) { return Number(a) - Number(b); });
    el.sessionSelect.innerHTML = "";
    sessionNums.forEach(function (num) {
      const opt = document.createElement("option");
      opt.value = num;
      const done = week.sessions[num] && week.sessions[num].completed;
      opt.textContent = "Sesión " + num + (done ? " ✓" : "");
      el.sessionSelect.appendChild(opt);
    });
    if (!currentSession || sessionNums.indexOf(currentSession) === -1) {
      currentSession = sessionNums[0];
    }
    el.sessionSelect.value = currentSession;
    updateCompleteButton();
  }

  function updateCompleteButton() {
    const week = getCurrentWeek();
    const session = week.sessions[currentSession];
    const done = session && session.completed;
    el.completeBtn.textContent = done ? "✓ Sesión completada" : "Marcar sesión como completada";
    el.completeBtn.classList.toggle("done", !!done);
  }

  // ---------- render: ejercicios ----------

  function buildWarmupBox(exercise, targetWeight) {
    const box = document.createElement("div");
    box.className = "warmup-box";
    const sets = Overload.computeWarmup(targetWeight, exercise.equipment, exercise.customIncrement);
    if (sets.length === 0) {
      box.classList.add("warmup-empty");
      box.textContent = "Escribe el peso de la 1ª serie de trabajo (o espera a la sugerencia con datos previos) para calcular aquí las series de aproximación.";
      return box;
    }
    const title = document.createElement("div");
    title.className = "warmup-title";
    title.textContent = "Series de aproximación (basadas en " + targetWeight + " kg objetivo)";
    box.appendChild(title);
    sets.forEach(function (s, i) {
      const line = document.createElement("div");
      line.className = "warmup-line";
      line.innerHTML =
        "<span>" + (i + 1) + "ª aprox.</span>" +
        "<span>" + s.weight + " kg</span>" +
        "<span>× " + s.reps + " reps</span>" +
        "<span class=\"warmup-pct\">" + s.pct + "%</span>";
      box.appendChild(line);
    });
    return box;
  }

  function refreshWarmupBox(card, exercise, exState) {
    const oldBox = card.querySelector(".warmup-box");
    if (!oldBox) return;
    const liveWeight = exState.sets[0] && exState.sets[0].weight !== "" ? parseFloat(exState.sets[0].weight) : null;
    let targetWeight = liveWeight;
    if (targetWeight == null || isNaN(targetWeight)) {
      targetWeight = card._firstSuggestionWeight != null ? card._firstSuggestionWeight : null;
    }
    const newBox = buildWarmupBox(exercise, targetWeight);
    oldBox.replaceWith(newBox);
  }

  function renderExercises() {
    const week = getCurrentWeek();
    const exercises = week.routineSnapshot.sessions[currentSession];
    const sessionState = week.sessions[currentSession];

    el.exercisesContainer.innerHTML = "";

    // aviso si no hay semana anterior con datos en absoluto
    const hasAnyPrevWeek = appState.weeks.some(function (w) { return w.number < week.number; });
    el.noPrevWeekWarning.style.display = (week.number > 1 && !hasAnyPrevWeek) ? "block" : "none";

    exercises.forEach(function (ex) {
      const exState = sessionState.exercises[ex.name];
      const prevData = Storage.findPreviousExerciseData(appState, week.number, currentSession, ex.name);

      const card = document.createElement("div");
      card.className = "card";

      const head = document.createElement("div");
      head.className = "card-head";
      head.innerHTML =
        "<h3>" + ex.name + "</h3>" +
        "<div class=\"head-right\">" +
          (ex.warmup ? "<span class=\"badge\">🔥 Calentar</span>" : "") +
          "<span class=\"meta\">RIR " + ex.rir + " · " + ex.rest + "</span>" +
        "</div>";
      card.appendChild(head);

      const body = document.createElement("div");
      body.className = "card-body";

      // sugerencia de la 1ª serie (para calentamiento)
      const firstPrev = prevData ? prevData.sets[0] : null;
      const firstSuggestion = Overload.suggestSet(firstPrev, ex.sets[0], ex.equipment, ex.customIncrement);
      card._firstSuggestionWeight = firstSuggestion.weight;

      if (ex.warmup) {
        const liveWeight = exState.sets[0] && exState.sets[0].weight !== "" ? parseFloat(exState.sets[0].weight) : null;
        const targetWeight = (liveWeight != null && !isNaN(liveWeight)) ? liveWeight : firstSuggestion.weight;
        body.appendChild(buildWarmupBox(ex, targetWeight));
      }

      const header = document.createElement("div");
      header.className = "set-row header";
      header.innerHTML = "<div>Serie</div><div>Sugerencia</div><div>Kg</div><div>Reps</div>";
      body.appendChild(header);

      ex.sets.forEach(function (range, i) {
        const prevSet = prevData ? prevData.sets[i] : null;
        const sug = Overload.suggestSet(prevSet, range, ex.equipment, ex.customIncrement);

        const row = document.createElement("div");
        row.className = "set-row";

        const label = document.createElement("div");
        label.textContent = (i + 1) + "ª";

        const sugEl = document.createElement("div");
        sugEl.className = "suggest " + sug.mode;
        sugEl.textContent = sug.text;

        const weightInput = document.createElement("input");
        weightInput.type = "number";
        weightInput.step = "0.5";
        weightInput.placeholder = "kg";
        weightInput.value = exState.sets[i] ? exState.sets[i].weight : "";
        weightInput.addEventListener("input", function () {
          exState.sets[i].weight = weightInput.value;
          scheduleSave();
          if (i === 0 && ex.warmup) {
            refreshWarmupBox(card, ex, exState);
          }
        });

        const repsInput = document.createElement("input");
        repsInput.type = "number";
        repsInput.placeholder = "reps";
        repsInput.value = exState.sets[i] ? exState.sets[i].reps : "";
        repsInput.addEventListener("input", function () {
          exState.sets[i].reps = repsInput.value;
          scheduleSave();
        });

        row.appendChild(label);
        row.appendChild(sugEl);
        row.appendChild(weightInput);
        row.appendChild(repsInput);
        body.appendChild(row);
      });

      card.appendChild(body);
      el.exercisesContainer.appendChild(card);
    });
  }

  // ---------- render completo ----------

  function renderAll() {
    renderWeekSelector();
    renderDateInfo();
    renderSessionSelector();
    renderExercises();
  }

  // ---------- eventos ----------

  el.weekSelect.addEventListener("change", function () {
    currentWeekId = el.weekSelect.value;
    currentSession = null;
    renderDateInfo();
    renderSessionSelector();
    renderExercises();
  });

  el.sessionSelect.addEventListener("change", function () {
    currentSession = el.sessionSelect.value;
    updateCompleteButton();
    renderExercises();
  });

  el.startDateInput.addEventListener("change", function () {
    const week = getCurrentWeek();
    week.startDate = el.startDateInput.value;
    persist(true);
    renderDateInfo();
    renderWeekSelector();
  });

  el.completeBtn.addEventListener("click", function () {
    const week = getCurrentWeek();
    const session = week.sessions[currentSession];
    session.completed = !session.completed;
    persist(true);
    updateCompleteButton();
    renderSessionSelector();
  });

  el.refreshWeekBtn.addEventListener("click", function () {
    const week = getCurrentWeek();
    const proceed = confirm(
      "Esto actualiza la Semana " + week.number + " con la versión ACTUAL de js/routine.js " +
      "(nombres, rangos de reps, RIR, tipo de equipo, calentamiento). " +
      "Los pesos y reps que ya hayas escrito para ejercicios que sigan existiendo se conservan. " +
      "Los ejercicios que hayas quitado de la rutina se descartarán de esta semana.\n\n¿Continuar?"
    );
    if (!proceed) return;
    Storage.refreshWeekFromRoutine(appState, week);
    persist(true);
    currentSession = null;
    renderAll();
  });

  el.newWeekBtn.addEventListener("click", function () {
    const weeks = sortedWeeks();
    let nextStart = todayISO();
    if (weeks.length > 0) {
      const last = weeks[weeks.length - 1];
      nextStart = toISO(addDays(parseISO(last.startDate), 9));
    }
    const newWeek = Storage.createWeek(appState, { startDate: nextStart });
    currentWeekId = newWeek.id;
    currentSession = null;
    renderAll();
  });

  el.exportBtn.addEventListener("click", function () {
    Storage.exportBackup(appState);
  });

  el.importInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const confirmMsg = "Esto reemplazará todos los datos actuales de la app por los del archivo. ¿Continuar?";
    if (!confirm(confirmMsg)) {
      el.importInput.value = "";
      return;
    }
    Storage.importBackup(file).then(function (imported) {
      appState = imported;
      Storage.save(appState);
      const weeks = sortedWeeks();
      currentWeekId = weeks.length ? weeks[weeks.length - 1].id : null;
      currentSession = null;
      if (!currentWeekId) {
        const w = Storage.createWeek(appState, { startDate: todayISO() });
        currentWeekId = w.id;
      }
      renderAll();
      el.saveStatus.textContent = "Copia de seguridad importada correctamente.";
      el.saveStatus.classList.add("visible");
    }).catch(function (err) {
      alert("No se pudo importar el archivo: " + err.message);
    }).finally(function () {
      el.importInput.value = "";
    });
  });

  el.syncConnectBtn.addEventListener("click", function () {
    if (!window.EntrenoSync) {
      el.syncStatusText.textContent = "La sincronización aún está cargando, espera un segundo e inténtalo de nuevo.";
      return;
    }
    window.EntrenoSync.connect(el.syncCodeInput.value);
  });

  el.syncDisconnectBtn.addEventListener("click", function () {
    if (window.EntrenoSync) window.EntrenoSync.disconnect();
  });

  const SYNC_STATUS_TEXT = {
    "not-configured": "Sincronización no configurada (falta completar js/firebase-config.js). La app funciona en local sin problema.",
    "disconnected": "Sin sincronizar. Introduce un código y pulsa Conectar.",
    "connecting": "Conectando…",
    "connected": "Conectado y sincronizado.",
    "error": "Hubo un problema sincronizando. Revisa tu conexión o el código."
  };

  function setSyncStatus(status, customMsg) {
    el.syncStatusText.textContent = customMsg || SYNC_STATUS_TEXT[status] || "";
    el.syncStatusText.className = "sync-status " + status;
    el.syncDisconnectBtn.style.display = (status === "connected") ? "inline-block" : "none";
    el.syncConnectBtn.style.display = (status === "connected") ? "none" : "inline-block";
  }

  // Puente para js/sync-module.js (módulo ES independiente).
  window.EntrenoApp = {
    getState: function () { return appState; },
    onLocalSave: function (cb) { localSaveListeners.push(cb); },
    setSyncStatus: setSyncStatus,
    setSyncCodeDisplay: function (code) { el.syncCodeInput.value = code || ""; },
    hasAnyData: function (state) {
      return state.weeks.some(function (week) {
        return Object.keys(week.sessions).some(function (sNum) {
          const session = week.sessions[sNum];
          return Object.keys(session.exercises).some(function (exName) {
            return session.exercises[exName].sets.some(function (s) {
              return (s.weight !== "" && s.weight != null) || (s.reps !== "" && s.reps != null);
            });
          });
        });
      });
    },
    applyRemoteState: function (remoteState, updatedAt) {
      appState = remoteState;
      appState.updatedAt = updatedAt;
      Storage.save(appState);
      const weeks = sortedWeeks();
      const stillExists = weeks.some(function (w) { return w.id === currentWeekId; });
      if (!stillExists) {
        currentWeekId = weeks.length ? weeks[weeks.length - 1].id : null;
        currentSession = null;
      }
      if (currentWeekId) {
        renderAll();
      }
      el.saveStatus.textContent = "Datos actualizados desde otro dispositivo.";
      el.saveStatus.classList.add("visible");
    }
  };



  function todayISO() {
    return toISO(new Date());
  }

  function init() {
    if (appState.weeks.length === 0) {
      const w = Storage.createWeek(appState, { number: 1, startDate: todayISO() });
      currentWeekId = w.id;
    } else {
      const weeks = sortedWeeks();
      currentWeekId = weeks[weeks.length - 1].id;
    }
    renderAll();
  }

  init();
})();
