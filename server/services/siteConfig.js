import SiteConfig from '../models/SiteConfig.js';

let cache = null;
let at = 0;

export async function getSiteConfig(fresh = false) {
  if (!fresh && cache && Date.now() - at < 30_000) return cache;
  cache = await SiteConfig.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  at = Date.now();
  return cache;
}

export const invalidateSiteConfig = () => {
  cache = null;
};

export const storeWhatsapp = (cfg) => cfg.whatsapp || process.env.STORE_WHATSAPP || '';
