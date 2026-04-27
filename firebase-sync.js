// ─── Firebase Sync ───────────────────────────────────────────────────────────
// Carga Firestore → localStorage al iniciar.
// Intercepta localStorage.setItem para guardar cambios en Firestore.
// Cada página define window.fbRefresh() para re-renderizar con datos frescos.

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

// Inicializar Firebase solo una vez
if (!firebase.apps.length) firebase.initializeApp(_FB_CFG);
const _fbDb  = firebase.firestore();
const _fbDoc = _fbDb.collection('finanzas').doc('datos');

// Persistencia offline: la app funciona sin internet
_fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// Guardar en localStorage nativo (sin pasar por el interceptor)
const _lsSet = localStorage.setItem.bind(localStorage);

// ── Interceptor de escritura ──────────────────────────────────────────────────
// Cada vez que la app guarda en localStorage, también sube a Firestore.
localStorage.setItem = function(key, value) {
  _lsSet(key, value);
  if (_SYNC_KEYS.includes(key)) {
    try {
      _fbDoc.set({ [key]: JSON.parse(value) }, { merge: true }).catch(() => {});
    } catch(e) {}
  }
};

// ── Banner de sincronización ──────────────────────────────────────────────────
const _BANNER_CSS = 'position:fixed;bottom:16px;right:16px;background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:.75rem;padding:8px 14px;border-radius:8px;z-index:9999;display:flex;align-items:center;gap:8px;font-family:Segoe UI,sans-serif;transition:opacity .4s';
const _SPIN_CSS   = 'width:10px;height:10px;border:2px solid #334155;border-top-color:#6c63ff;border-radius:50%;animation:_fbspin .7s linear infinite;flex-shrink:0';
const _SPIN_KF    = '<style>@keyframes _fbspin{to{transform:rotate(360deg)}}</style>';

function _fbShowBanner(html) {
  let el = document.getElementById('_fb-banner');
  if (!el) { el = document.createElement('div'); el.id = '_fb-banner'; el.style.cssText = _BANNER_CSS; document.body.appendChild(el); }
  el.style.opacity = '1';
  el.innerHTML = html;
}
function _fbHideBanner() {
  const el = document.getElementById('_fb-banner');
  if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }
}

// ── Carga inicial desde Firestore ─────────────────────────────────────────────
window.fbReady = (async function () {
  // Esperar a que exista document.body para poder mostrar el banner
  if (!document.body) {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }

  _fbShowBanner(`<span style="${_SPIN_CSS}"></span>${_SPIN_KF} Sincronizando con la nube…`);

  try {
    const snap = await _fbDoc.get();

    if (snap.exists) {
      const data = snap.data();
      let changed = false;
      _SYNC_KEYS.forEach(key => {
        if (data[key] !== undefined) {
          _lsSet(key, JSON.stringify(data[key]));
          changed = true;
        }
      });

      // Re-renderizar la página con los datos de Firestore
      if (changed && typeof window.fbRefresh === 'function') {
        window.fbRefresh();
      }
    }

    _fbShowBanner('✓ Sincronizado');
    setTimeout(_fbHideBanner, 1500);

  } catch (e) {
    console.warn('[Firebase] Sin conexión — usando datos locales.');
    _fbShowBanner('📴 Sin conexión — datos locales');
    setTimeout(_fbHideBanner, 3000);
  }
})();
