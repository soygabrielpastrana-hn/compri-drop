import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const DEFAULT = {
  siteName: 'Yo lo Quiero HN', logoUrl: '', whatsapp: import.meta.env.VITE_STORE_WHATSAPP || '',
  sideBanners: [], freeShippingMin: 0, cashbackPercent: 5, guestCashbackDays: 45, bankAccounts: [],
};

const SiteCtx = createContext(DEFAULT);

// Configuración editable desde /admin → Configuración (logo, WhatsApp, envío gratis, bancos, banners laterales)
export function SiteProvider({ children }) {
  const [cfg, setCfg] = useState(DEFAULT);

  const reload = useCallback(
    () => api.siteConfig().then((c) => setCfg({ ...DEFAULT, ...c })).catch(() => {}),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => ({ ...cfg, reload }), [cfg, reload]);
  return <SiteCtx.Provider value={value}>{children}</SiteCtx.Provider>;
}

export const useSite = () => useContext(SiteCtx);
