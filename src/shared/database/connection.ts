import { Sequelize } from 'sequelize-typescript';
import { logger } from '../utils/logger';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'medical_inventory',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: false,
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  define: { underscored: true, timestamps: true, paranoid: true },
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Conexión a PostgreSQL establecida');
  if (process.env.NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true });
  }
}

export async function disconnectDatabase(): Promise<void> {
  await sequelize.close();
}
