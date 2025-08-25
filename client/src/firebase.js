import { initializeApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'europe-west1');


if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Connected Firebase Functions SDK to emulator at localhost:5001');
  } catch (e) {
    console.warn('Failed to connect Functions emulator:', e);
  }
}

const projectId = app?.options?.projectId;

export { functions, projectId };