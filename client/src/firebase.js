import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Configuración web de Firebase (es pública por diseño; la protegen los "Dominios autorizados" de la consola)
const firebaseConfig = {
apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBogerA_4g4t8Slt138kCxTDsXheddpEKM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'comprihn.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'comprihn',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'comprihn.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '714687697375',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:714687697375:web:5fb1fd243267982b41f46a',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' }); // deja elegir la cuenta de Google
