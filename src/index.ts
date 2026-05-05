import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { connectDatabase } from './shared/database/connection';
import { logger } from './shared/utils/logger';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    const server = app.listen(PORT, () => {
      logger.info(`Medical Inventory System en puerto ${PORT}`);
    });
    const shutdown = async (signal: string) => {
      logger.info(`${signal} recibido. Cerrando...`);
      server.close(async () => {
        const { disconnectDatabase } = await import('./shared/database/connection');
        await disconnectDatabase();
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Error fatal:', error);
    process.exit(1);
  }
}

bootstrap();
