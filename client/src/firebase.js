import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Configuración web de Firebase (es pública por diseño; la protegen los "Dominios autorizados" de la consola)
const firebaseConfig = {
  apiKey: 'AIzaSyCCMLO0DNrwHDloNRK2mHxsLqtV_F6ZJ6w',
  authDomain: 'yoloquiero-76a81.firebaseapp.com',
  projectId: 'yoloquiero-76a81',
  storageBucket: 'yoloquiero-76a81.firebasestorage.app',
  messagingSenderId: '410182713019',
  appId: '1:410182713019:web:a9e3166e6e0ad01e79b39e',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' }); // deja elegir la cuenta de Google
