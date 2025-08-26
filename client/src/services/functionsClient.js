import { projectId as firebaseProjectId } from '../firebase';

const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const projectId = firebaseProjectId || process.env.REACT_APP_FIREBASE_PROJECT_ID;
const baseUrl = isLocal
  ? (projectId ? `http://localhost:5001/${projectId}/europe-west1` : '')
  : (projectId ? `https://europe-west1-${projectId}.cloudfunctions.net` : '');

export async function callHttpFunction(name, payload) {
  if (!baseUrl) {
    throw new Error('Firebase projectId is not set. Define REACT_APP_FIREBASE_PROJECT_ID in client/.env.local');
  }
  const res = await fetch(`${baseUrl}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload || {} })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}
