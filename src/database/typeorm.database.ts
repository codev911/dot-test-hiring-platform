import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { validateEnv } from '../utils/config/env.schema';

loadEnv();

const env = validateEnv(process.env);

export const typeOrmDataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  username: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  logging: env.MYSQL_LOGGING,
  synchronize: false,
  migrationsRun: false,
  entities: [path.join(__dirname, '..', 'entities', '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '**', '*.{ts,js}')],
};
const appDataSource = new DataSource(typeOrmDataSourceOptions);

export default appDataSource;
