import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './lib/logger';
import { v1Router } from './routes';
import webhookRoutes from './routes/webhooks.routes';
import { errorHandler } from './middleware/error-handler';
import { env } from './lib/env';

const app = express();

app.use((req, res, next) => {
  const id = uuidv4();
  (req as any).requestId = id;
  (req as any).log = logger.child({ requestId: id });
  res.setHeader('X-Request-Id', id);
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

morgan.token('id', req => (req as any).requestId);
const morganFormat = env.NODE_ENV === 'production'
  ? ':date[iso] :id :method :url :status :res[content-length] - :response-time ms'
  : 'dev';
app.use(morgan(morganFormat));

app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/webhooks', webhookRoutes);
app.use('/api/v1', apiLimiter, v1Router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    code: 'RESOURCE_NOT_FOUND',
    details: `Route ${req.method} ${req.url} not found`,
    requestId: (req as any).requestId
  });
});

app.use(errorHandler);

export default app;
