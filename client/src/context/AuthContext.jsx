import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';
import { api, setTokenGetter } from '../lib/api.js';

const AuthCtx = createContext(null);
const CACHE_KEY = 'yolq-user';

// Copia ligera del usuario para pintar la interfaz al instante. La seguridad real es el token de Firebase.

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
};
const writeCache = (p) => {
  try {
    if (p) {
      const { _id, name, email, photo, walletBalance, isAdmin } = p;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ _id, name, email, photo, walletBalance, isAdmin }));
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch {
    /* almacenamiento no disponible */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // usuario de Firebase
  const [profile, setProfile] = useState(readCache); // usuario en MongoDB: _id, walletBalance, addresses, isAdmin
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setProfile((p) => ({ ...(p || {}), ...me }));
    } catch {
      /* sin sesión o sin conexión */
    }
  }, []);

  useEffect(() => {
    // Todas las peticiones llevan el token si hay sesión; sin sesión se compra como invitado
    setTokenGetter(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));

    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        // Crea o encuentra al usuario en MongoDB y vincula sus pedidos previos por correo
        const saved = await api.googleLogin({ email: u.email, name: u.displayName, googleUid: u.uid, photoURL: u.photoURL });
        setProfile(saved);
        await refresh();
      } catch {
        /* el login de Firebase sigue válido aunque falle la sincronización */
      }
      setLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    writeCache(profile);
  }, [profile]);

  const login = useCallback(async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err.code)) {
      return signInWithRedirect(auth, googleProvider); // el navegador bloqueó el popup
    }
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') console.error(err);
  }
}, []);

  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({ user, profile, loading, refresh, enabled: true, login, logout }),
    [user, profile, loading, refresh, login, logout]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
