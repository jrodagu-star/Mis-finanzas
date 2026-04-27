// ─── Firebase Sync ───────────────────────────────────────────────────────────
// Escucha cambios en Firestore en tiempo real (onSnapshot).
// Cuando otro dispositivo guarda datos, esta página se actualiza sola.
// Intercepta localStorage.setItem para subir cambios locales a Firestore.

const _FB_CFG = {
  apiKey:            "AIzaSyBBQHSzPfGdqLWTfOClm4IFmP2m9tfIKPk",
  authDomain:        "mis-finanzas-81d6c.firebaseapp.com",
  projectId:         "mis-finanzas-81d6c",
  storageBucket:     "mis-finanzas-81d6c.firebasestorage.app",
  messagingSenderId: "364950626110",
  appId:             "1:364950626110:web:339859a33dd992b39d966f"
};

const _SYNC_KEYS = [
  'conta_txs', 'conta_settings', 'conta_learned', 'conta_esperados',
  'inv_positions', 'inv_notes', 'user_cripto',
  'nom_nominas', 'nom_ganancias', 'nom_ganancia_cfg'
];

if (!firebase.apps.length) firebase.initializeApp(_FB_CFG);
const _fbDb  = firebase.firestore();
const _fbDoc = _fbDb.collection('finanzas').doc('datos');

// Persistencia offline: funciona sin internet y sincroniza al reconectar
_fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// Referencia al setItem original (sin interceptar)
const _lsSet = localStorage.setItem.bind(localStorage);

// ── Interceptor: cada guardado local también sube a Firestore ─────────────────
// Debounce: agrupa escrituras rápidas (ej: tecla por tecla en notas)
// en una sola subida a Firestore tras 1 segundo de inactividad.
let _fbSaveTimer = null;
let _fbPendingData = {};

localStorage.setItem = function(key, value) {
  _lsSet(key, value);
  if (_SYNC_KEYS.includes(key)) {
    try { _fbPendingData[key] = JSON.parse(value); } catch(e) { return; }
    clearTimeout(_fbSaveTimer);
    _fbSaveTimer = setTimeout(() => {
      const payload = Object.assign({}, _fbPendingData);
      _fbPendingData = {};
      _fbDoc.set(payload, { merge: true })
        .then(() => _fbBanner('☁️ Guardado en la nube', 1500))
        .catch(() => _fbBanner('⚠️ Error al guardar — sin conexión', 3000));
    }, 1000);
  }
};

// ── Banner de estado ──────────────────────────────────────────────────────────
const _SPIN = '<span style="display:inline-block;width:10px;height:10px;border:2px solid #334155;border-top-color:#6c63ff;border-radius:50%;animation:_fbs .7s linear infinite;flex-shrink:0"></span><style>@keyframes _fbs{to{transform:rotate(360deg)}}</style>';

function _fbBanner(html, autoHide) {
  if (!document.body) return;
  let el = document.getElementById('_fb-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = '_fb-banner';
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:.75rem;padding:8px 14px;border-radius:8px;z-index:9999;display:flex;align-items:center;gap:8px;font-family:Segoe UI,sans-serif;transition:opacity .4s';
    document.body.appendChild(el);
  }
  el.style.opacity = '1';
  el.innerHTML = html;
  if (autoHide) setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, autoHide);
}

// ── Listener en tiempo real ───────────────────────────────────────────────────
window.fbReady = new Promise(resolve => {
  let firstLoad = true;

  // Mostrar "Sincronizando..." en cuanto el DOM esté listo
  const showSpinner = () => _fbBanner(_SPIN + ' Sincronizando…');
  if (document.body) showSpinner();
  else document.addEventListener('DOMContentLoaded', showSpinner, { once: true });

  _fbDoc.onSnapshot({ includeMetadataChanges: true }, snap => {
    // Ignorar snapshots causados por nuestra propia escritura local
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists) {
      if (firstLoad) { firstLoad = false; _fbBanner('☁️ Firebase conectado', 2000); resolve(); }
      return;
    }

    const data = snap.data();
    let changed = false;

    _SYNC_KEYS.forEach(key => {
      if (data[key] !== undefined) {
        const incoming = JSON.stringify(data[key]);
        // Solo actualizar si el dato es diferente al que ya hay en localStorage
        if (localStorage.getItem(key) !== incoming) {
          _lsSet(key, incoming);
          changed = true;
        }
      }
    });

    if (changed && typeof window.fbRefresh === 'function') {
      // Si es una actualización en tiempo real (no la carga inicial),
      // mostrar aviso de que otro dispositivo ha cambiado algo
      if (!firstLoad) _fbBanner('↻ Actualizando desde otro dispositivo…');
      window.fbRefresh();
    }

    if (firstLoad) {
      firstLoad = false;
      _fbBanner('☁️ Sincronizado con Firebase', 2000);
      resolve();
    } else if (changed) {
      _fbBanner('✓ Datos actualizados', 2000);
    }

  }, err => {
    console.warn('[Firebase] Sin conexión — usando datos locales.');
    _fbBanner('📴 Sin conexión — datos locales', 4000);
    resolve();
  });
});
