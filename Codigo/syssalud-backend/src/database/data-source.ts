import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Usuario } from '../modules/auth/entities/usuario.entity';

/**
 * DataSource standalone (fuera del ciclo de vida de Nest) usado por el script
 * de seed. La app en sí se conecta vía TypeOrmModule.forRootAsync en app.module.ts
 * con autoLoadEntities, así que no hace falta listar entidades ahí.
 *
 * Si tu módulo agrega una entidad y necesitás seedearla, importala y sumala
 * al arreglo `entities` de abajo.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'syssalud',
  password: process.env.DB_PASSWORD || 'syssalud',
  database: process.env.DB_NAME || 'syssalud',
  entities: [Usuario],
  synchronize: true,
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
