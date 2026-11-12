/* Sincronización de Taller con Firebase (Auth + Firestore).
 * Fuente: se empaqueta con esbuild en ../sync.bundle.js (ver src/README.md).
 *
 * Modelo: users/{uid}/items/{col}_{id} = { col, data, o, updatedAt }
 * Cada clase, entrega, tarea, proyecto, nota o enlace es un documento propio,
 * así los cambios hechos en dos dispositivos a la vez no se pisan entre sí.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, signInWithCredential, connectAuthEmulator, browserLocalPersistence, setPersistence,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, onSnapshot, writeBatch, getDocs, getDocsFromServer, serverTimestamp, connectFirestoreEmulator,
} from 'firebase/firestore';

const COLS = ['classes', 'events', 'tasks'];
const MCOLS = ['projects', 'notes', 'links'];
const UID_KEY = 'taller.syncUid';

export function start(host) {
  const { config } = host;
  const app = initializeApp(config);
  const auth = getAuth(app);
  let db;
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  }
  if (config.emulator) {
    connectAuthEmulator(auth, `http://${config.emulator}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, config.emulator, 8080);
    // Solo para pruebas con el emulador: inicia sesión con una cuenta de Google simulada.
    window.__tallerTestSignIn = email => signInWithCredential(auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })));
  }
  setPersistence(auth, browserLocalPersistence).catch(() => {});

  let user = null;
  let unsub = null;
  let ready = false;          // true cuando ya escuchamos la nube y podemos subir cambios
  let synced = new Map();     // key -> JSON de lo que hay (o habrá) en la nube
  let status = 'signedout';
  let meta = null;            // metadatos de la última instantánea

  const setStatus = s => { status = s; host.onStatus(status, user); };
  const itemsRef = () => collection(db, 'users', user.uid, 'items');
  const clean = v => JSON.parse(JSON.stringify(v));

  function flatten(s) {
    const m = new Map();
    for (const c of COLS) s[c].forEach((x, i) => m.set(`${c}_${x.id}`, { col: c, data: x, o: i }));
    for (const c of MCOLS) s.master[c].forEach((x, i) => m.set(`${c}_${x.id}`, { col: c, data: x, o: i }));
    m.set('meta', { col: 'meta', data: { name: s.master.name }, o: 0 });
    return m;
  }

  function build(docs) {
    const s = host.emptyState();
    const rows = docs.map(d => d.data()).sort((a, b) => (a.o ?? 0) - (b.o ?? 0));
    for (const v of rows) {
      if (!v || !v.data) continue;
      if (v.col === 'meta') { if (v.data.name) s.master.name = v.data.name; }
      else if (COLS.includes(v.col)) s[v.col].push(v.data);
      else if (MCOLS.includes(v.col)) s.master[v.col].push(v.data);
    }
    return host.normalize(s);
  }

  async function commitOps(ops) {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 400)) {
        const ref = doc(itemsRef(), op.key);
        if (op.del) batch.delete(ref);
        else batch.set(ref, { col: op.col, data: clean(op.data), o: op.o, updatedAt: serverTimestamp() });
      }
      // Sin conexión, la promesa no se resuelve hasta volver a estar en línea; no la esperamos.
      batch.commit().catch(err => { console.error('[Taller] sync', err); setStatus('error'); });
    }
  }

  // Sube a la nube lo que haya cambiado desde la última vez.
  function push(state) {
    if (!ready || !user) return;
    const cur = flatten(state);
    const ops = [];
    for (const [key, v] of cur) {
      const json = JSON.stringify(v.data);
      if (synced.get(key) !== json) ops.push({ key, ...v });
    }
    for (const key of synced.keys()) if (!cur.has(key)) ops.push({ key, del: true });
    synced = new Map([...cur].map(([k, v]) => [k, JSON.stringify(v.data)]));
    if (ops.length) commitOps(ops);
  }

  // Primera vez que este dispositivo entra con esta cuenta: junta lo local con la nube.
  async function firstMerge() {
    let remote;
    try { remote = await getDocsFromServer(itemsRef()); }
    catch (e) { remote = await getDocs(itemsRef()); }
    const local = host.getState();
    const remoteKeys = new Set(remote.docs.map(d => d.id));
    if (!local.demo) {
      const ops = [];
      for (const [key, v] of flatten(local)) {
        if (remoteKeys.has(key)) continue;
        if (key === 'meta' && (remoteKeys.size || v.data.name === 'Mi máster')) continue;
        ops.push({ key, ...v, o: v.o + 100000 });
      }
      if (ops.length) await commitOps(ops);
    }
    try { localStorage.setItem(UID_KEY, user.uid); } catch (e) {}
  }

  async function connect() {
    setStatus('connecting');
    let last = null;
    try { last = localStorage.getItem(UID_KEY); } catch (e) {}
    try {
      if (last !== user.uid) await firstMerge();
    } catch (e) {
      console.error('[Taller] merge', e);
      setStatus('error');
      return;
    }
    let first = true;
    meta = null;
    unsub = onSnapshot(itemsRef(), { includeMetadataChanges: true }, snap => {
      const changed = snap.docChanges().length > 0;
      if (first || changed) {
        synced = new Map(snap.docs.map(d => [d.id, JSON.stringify(d.data().data)]));
        ready = true;
        host.replaceState(build(snap.docs));
        first = false;
      }
      meta = snap.metadata;
      refreshStatus();
    }, err => {
      console.error('[Taller] listen', err);
      setStatus('error');
    });
  }

  function disconnect() {
    if (unsub) unsub();
    unsub = null; ready = false; synced = new Map();
  }

  getRedirectResult(auth).catch(err => host.onError(describe(err)));

  onAuthStateChanged(auth, u => {
    disconnect();
    user = u;
    if (u) connect(); else setStatus('signedout');
  });

  function refreshStatus() {
    if (!user || !meta) return;
    setStatus(!navigator.onLine ? 'offline' : meta.hasPendingWrites ? 'saving' : meta.fromCache ? 'connecting' : 'synced');
  }
  window.addEventListener('online', refreshStatus);
  window.addEventListener('offline', refreshStatus);

  async function signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-environment', 'auth/cancelled-popup-request'].includes(err.code)) {
        await signInWithRedirect(auth, provider);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        host.onError(describe(err));
      }
    }
  }

  async function logOut() {
    disconnect();
    try { localStorage.removeItem(UID_KEY); } catch (e) {}
    await signOut(auth);
  }

  return { push, signIn, signOut: logOut, getStatus: () => status, getUser: () => user };
}

function describe(err) {
  const map = {
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).',
    'auth/network-request-failed': 'Sin conexión. Inténtalo de nuevo cuando tengas internet.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
  };
  return map[err && err.code] || 'No se ha podido iniciar sesión.';
}
