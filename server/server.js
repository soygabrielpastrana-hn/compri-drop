import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import couponRoutes from './routes/coupons.js';
import reviewRoutes from './routes/reviews.js';
import shareRoutes from './routes/share.js';
import adminRoutes from './routes/admin.js';
import bannerRoutes from './routes/banners.js';
import categoryRoutes from './routes/categories.js';
import siteConfigRoutes from './routes/siteConfig.js';
import trackingRoutes from './routes/tracking.js';
import meRoutes from './routes/me.js';
import mediaRoutes from './routes/media.js';
import popupRoutes from './routes/popups.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { firebaseStatus } from './middleware/auth.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// CORS estricto: solo los dominios de CLIENT_URL (separados por coma). Sin comodines; el token viaja en headers, no en cookies.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true); // sin Origin = herramientas del servidor / rastreadores
      cb(new Error('CORS_BLOCKED'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
    maxAge: 600,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/admin', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 })); // además del límite general
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/site-config', siteConfigRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/me', meRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/popups', popupRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/p', shareRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
connectDB()
  .then(() =>
    app.listen(PORT, () => {
      console.log(`API en http://localhost:${PORT}`);
      console.log(`Firebase Auth: ${firebaseStatus()}`); // service-account | project-id | disabled
    })
  )
  .catch((err) => {
    console.error('No se pudo conectar a MongoDB:', err.message);
    process.exit(1);
  });
