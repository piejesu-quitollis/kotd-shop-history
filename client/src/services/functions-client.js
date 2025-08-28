import { projectId as firebaseProjectId } from '../firebase';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const forceProd = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('useProdFunctions') === 'true')
  || String(process.env.REACT_APP_USE_PROD_FUNCTIONS || '').toLowerCase() === 'true';
const projectId = firebaseProjectId || process.env.REACT_APP_FIREBASE_PROJECT_ID;
const useEmulator = isLocal && !forceProd;
const baseUrl = useEmulator
  ? (projectId ? `http://localhost:5001/${projectId}/europe-west1` : '')
  : (projectId ? `https://europe-west1-${projectId}.cloudfunctions.net` : '');

if (typeof window !== 'undefined') {
  // Minimal diagnostics to verify environment selection in production vs emulator
  // eslint-disable-next-line no-console
  console.debug('[functionsClient] env', { isLocal, forceProd, projectId, useEmulator, baseUrl, host: window.location.hostname });
}

export async function callHttpFunction(name, payload) {
  if (!baseUrl) {
    throw new Error('Firebase projectId is not set. Define REACT_APP_FIREBASE_PROJECT_ID in client/.env.local');
  }
  const res = await fetch(`${baseUrl}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ data: payload || {} })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

// get latest day with items (optionally joined)
export async function getLatestDaily(includeStatic = false) {
  if (useEmulator) {
    const qs = new URLSearchParams();
    if (includeStatic) qs.set('includeStatic', 'true');
    const url = `${baseUrl}/getLatestDaily?${qs.toString()}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
    const json = await res.json();
    return json?.data || { date: null, items: [] };
  }
  const res = await callHttpFunction('getLatestDaily', { includeStatic });
  return res?.data || { date: null, items: [] };
}

// get history by weapon id (for charts)
export async function getHistoryByWeapon(weaponId, startDate, endDate, includeStatic = false) {
  if (useEmulator) {
    const qs = new URLSearchParams();
    if (weaponId != null) qs.set('weaponId', String(weaponId));
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);
    if (includeStatic) qs.set('includeStatic', 'true');
    const url = `${baseUrl}/getHistoryByWeapon?${qs.toString()}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
    const json = await res.json();
    return json?.data || [];
  }
  const payload = { weaponId, startDate, endDate, includeStatic };
  const res = await callHttpFunction('getHistoryByWeapon', payload);
  return res?.data || [];
}

// Fetch per-weapon P/D series (server-precomputed)
// getWeaponSeries removed (series deprecated)
