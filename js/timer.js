/*
 * timer.js
 * ----------------------------------------------------------------
 * Cronómetro de descanso reutilizable. Se muestra como una barra
 * fija en la parte inferior de la pantalla. Puede iniciarse de
 * forma manual (botón de reloj en cada serie / serie de
 * aproximación) o automáticamente al rellenar peso y reps de una
 * serie de trabajo.
 * ----------------------------------------------------------------
 */

(function () {
  "use strict";

  let barEl = null;
  let clockEl, fillEl, labelExName, pauseBtn;
  let intervalId = null;
  let totalSeconds = 0;
  let remaining = 0;
  let running = false;
  let activeBtn = null;

  function ensureBar() {
    if (barEl) return;
    barEl = document.createElement("div");
    barEl.className = "rest-timer-bar";
    barEl.innerHTML =
      '<div class="rest-timer-inner">' +
        '<div class="rest-timer-top">' +
          '<div class="rest-timer-label">Descanso<span class="rest-exname" id="restExName"></span></div>' +
          '<div class="rest-timer-clock" id="restClock">0:00</div>' +
        "</div>" +
        '<div class="rest-timer-track"><div class="rest-timer-fill" id="restFill"></div></div>' +
        '<div class="rest-timer-actions">' +
          '<button type="button" id="restMinus15">−15s</button>' +
          '<button type="button" id="restPause">Pausar</button>' +
          '<button type="button" id="restPlus15">+15s</button>' +
          '<button type="button" class="primary" id="restSkip">Saltar</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(barEl);

    clockEl = barEl.querySelector("#restClock");
    fillEl = barEl.querySelector("#restFill");
    labelExName = barEl.querySelector("#restExName");
    pauseBtn = barEl.querySelector("#restPause");

    barEl.querySelector("#restMinus15").addEventListener("click", function () { adjust(-15); });
    barEl.querySelector("#restPlus15").addEventListener("click", function () { adjust(15); });
    pauseBtn.addEventListener("click", togglePause);
    barEl.querySelector("#restSkip").addEventListener("click", finish);
  }

  function formatClock(s) {
    const sign = s < 0 ? "+" : "";
    const abs = Math.abs(s);
    const m = Math.floor(abs / 60);
    const sec = abs % 60;
    return sign + m + ":" + String(sec).padStart(2, "0");
  }

  function render() {
    clockEl.textContent = formatClock(remaining);
    clockEl.classList.toggle("overtime", remaining <= 0);
    const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, (remaining / totalSeconds) * 100)) : 0;
    fillEl.style.width = pct + "%";
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
        osc.onended = function () { ctx.close(); };
      }
    } catch (e) { /* silencioso: audio no disponible */ }
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200]); } catch (e) { /* silencioso */ }
    }
  }

  function tick() {
    remaining -= 1;
    render();
    if (remaining === 0) beep();
  }

  function clearTick() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  }

  function start(seconds, exerciseName, triggerBtn) {
    ensureBar();
    if (activeBtn && activeBtn !== triggerBtn) activeBtn.classList.remove("running");
    activeBtn = triggerBtn || null;
    if (activeBtn) activeBtn.classList.add("running");

    totalSeconds = Math.max(1, seconds || 120);
    remaining = totalSeconds;
    running = true;
    pauseBtn.textContent = "Pausar";
    labelExName.textContent = exerciseName || "";
    barEl.classList.add("visible");
    render();

    clearTick();
    intervalId = setInterval(function () {
      if (running) tick();
    }, 1000);
  }

  function adjust(delta) {
    if (!barEl) return;
    remaining += delta;
    if (remaining > totalSeconds) totalSeconds = remaining;
    render();
  }

  function togglePause() {
    running = !running;
    pauseBtn.textContent = running ? "Pausar" : "Reanudar";
  }

  function finish() {
    clearTick();
    running = false;
    if (barEl) barEl.classList.remove("visible");
    if (activeBtn) { activeBtn.classList.remove("running"); activeBtn = null; }
  }

  // Convierte el texto de descanso de la rutina a segundos. Formatos
  // admitidos: "3'" (3 min), "2'30" (2 min 30 s), "90s" (90 segundos).
  function parseSeconds(restStr) {
    if (!restStr) return 120;
    const str = String(restStr).trim();

    const minSec = str.match(/^(\d+)'(\d{1,2})?$/);
    if (minSec) {
      const mins = parseInt(minSec[1], 10);
      const secs = minSec[2] ? parseInt(minSec[2], 10) : 0;
      return mins * 60 + secs;
    }

    const secOnly = str.match(/^(\d+(?:[.,]\d+)?)\s*s$/i);
    if (secOnly) {
      return Math.round(parseFloat(secOnly[1].replace(",", ".")));
    }

    // Fallback: primer número encontrado, asumido en minutos.
    const match = str.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return 120;
    const num = parseFloat(match[1].replace(",", "."));
    if (isNaN(num)) return 120;
    return Math.round(num * 60);
  }

  // Formatea segundos como texto "M:SS" para mostrar en pantalla.
  function formatLabel(restStr) {
    const secs = parseSeconds(restStr);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  window.RestTimer = {
    start: start,
    finish: finish,
    parseSeconds: parseSeconds,
    formatLabel: formatLabel,
    WARMUP_REST_SECONDS: 60
  };
})();
