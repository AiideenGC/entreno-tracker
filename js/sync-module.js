/*
 * sync-module.js
 * ----------------------------------------------------------------
 * Sincronización opcional entre dispositivos vía Firebase Firestore.
 * Se ejecuta como módulo ES (por eso usa import/export). Se conecta
 * con el resto de la app (app.js, script clásico) a través de
 * window.EntrenoApp, que app.js define antes de que este módulo
 * corra (los scripts clásicos sin defer/async se ejecutan antes
 * que cualquier módulo, siempre).
 *
 * Estrategia de conflicto: "gana el último guardado" (last-write-
 * wins) comparando el campo state.updatedAt. No hace merge campo a
 * campo. Para uso normal (entrenas en un sitio a la vez) no da
 * problemas; si edita a la vez en dos sitios, se queda uno de los
 * dos completo.
 * ----------------------------------------------------------------
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const SYNC_CODE_KEY = "entrenoSyncCode";
const COLLECTION = "entrenoSync";

let app = null;
let db = null;
let unsubscribe = null;
let pushTimer = null;

function getSyncCode() {
  return localStorage.getItem(SYNC_CODE_KEY) || "";
}
function setSyncCodeStorage(code) {
  if (code) localStorage.setItem(SYNC_CODE_KEY, code);
  else localStorage.removeItem(SYNC_CODE_KEY);
}

function isConfigured() {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0);
}

function ensureFirebase() {
  if (!isConfigured()) return false;
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return true;
}

async function pullOnce(code) {
  const ref = doc(db, COLLECTION, code);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

async function pushNow(code, state) {
  const ref = doc(db, COLLECTION, code);
  await setDoc(ref, { data: JSON.stringify(state), updatedAt: state.updatedAt || Date.now() });
}

function schedulePush(code, state) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(function () {
    pushNow(code, state)
      .then(function () { window.EntrenoApp.setSyncStatus("connected"); })
      .catch(function (e) { console.error("Error sincronizando:", e); window.EntrenoApp.setSyncStatus("error"); });
  }, 800);
}

function listen(code) {
  if (unsubscribe) unsubscribe();
  const ref = doc(db, COLLECTION, code);
  unsubscribe = onSnapshot(ref, function (snap) {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites) return; // eco de nuestra propia escritura, ignorar
    const remote = snap.data();
    window.EntrenoApp.applyRemoteState(JSON.parse(remote.data), remote.updatedAt);
  }, function (err) {
    console.error("Error escuchando cambios remotos:", err);
    window.EntrenoApp.setSyncStatus("error");
  });
}

function stripTimestamp(state) {
  const clone = JSON.parse(JSON.stringify(state));
  delete clone.updatedAt;
  return clone;
}

function statesEqual(a, b) {
  return JSON.stringify(stripTimestamp(a)) === JSON.stringify(stripTimestamp(b));
}

async function connect(code) {
  code = (code || "").trim();
  if (!code) {
    window.EntrenoApp.setSyncStatus("error", "Escribe un código de sincronización.");
    return;
  }
  if (!ensureFirebase()) {
    window.EntrenoApp.setSyncStatus("not-configured");
    return;
  }
  window.EntrenoApp.setSyncStatus("connecting");
  try {
    const remote = await pullOnce(code);
    const local = window.EntrenoApp.getState();

    if (remote) {
      const remoteState = JSON.parse(remote.data);
      const localHasData = window.EntrenoApp.hasAnyData(local);
      const same = statesEqual(remoteState, local);

      if (localHasData && !same) {
        const proceed = window.confirm(
          "Ya hay datos guardados en la nube con este código, y este dispositivo también tiene datos propios distintos. " +
          "Al conectar, se sustituirán los datos de ESTE dispositivo por los de la nube (para no duplicar el histórico). " +
          "Si no estás seguro, cancela y haz antes una copia de seguridad desde este dispositivo.\n\n¿Continuar y cargar los datos de la nube aquí?"
        );
        if (!proceed) {
          window.EntrenoApp.setSyncStatus("disconnected", "Conexión cancelada. Tus datos de este dispositivo no se han tocado.");
          return;
        }
      }

      setSyncCodeStorage(code);
      window.EntrenoApp.applyRemoteState(remoteState, remote.updatedAt);
    } else {
      // Nadie ha usado este código todavía: este dispositivo es el primero,
      // así que sube lo que tiene aquí sin preguntar (no hay nada que pisar).
      setSyncCodeStorage(code);
      await pushNow(code, local);
    }

    listen(code);
    window.EntrenoApp.setSyncStatus("connected");
  } catch (e) {
    console.error("Error conectando sincronización:", e);
    window.EntrenoApp.setSyncStatus("error");
  }
}

function disconnect() {
  setSyncCodeStorage("");
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  window.EntrenoApp.setSyncStatus("disconnected");
}

window.EntrenoSync = { connect: connect, disconnect: disconnect, getSyncCode: getSyncCode, isConfigured: isConfigured };

window.EntrenoApp.onLocalSave(function (state) {
  const code = getSyncCode();
  if (code && db) schedulePush(code, state);
});

// Auto-arranque si ya había un código guardado de una sesión anterior
const savedCode = getSyncCode();
window.EntrenoApp.setSyncCodeDisplay(savedCode);
if (savedCode) {
  if (ensureFirebase()) {
    connect(savedCode);
  } else {
    window.EntrenoApp.setSyncStatus("not-configured");
  }
} else {
  window.EntrenoApp.setSyncStatus(isConfigured() ? "disconnected" : "not-configured");
}
