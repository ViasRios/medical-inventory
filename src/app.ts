import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { suppliersRouter } from './modules/suppliers/supplier.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { alertsRouter } from './modules/alerts/alerts.routes';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware';
import { logger } from './shared/utils/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => { logger.info(`${req.method} ${req.path}`); next(); });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Medical Inventory System', timestamp: new Date().toISOString() });
});

const API = '/api/v1';
app.use(`${API}/inventory`, inventoryRouter);
app.use(`${API}/suppliers`, suppliersRouter);
app.use(`${API}/orders`, ordersRouter);
app.use(`${API}/alerts`, alertsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
