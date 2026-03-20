import { registerAs } from '@nestjs/config';

export default registerAs('postgres', () => ({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT, 10) || 5432,
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'rend_retail',
  schema:   process.env.PG_SCHEMA   || 'rend_retail',
  ssl:      process.env.PG_SSL === 'true',
  pool: {
    min:           parseInt(process.env.PG_POOL_MIN, 10)      || 2,
    max:           parseInt(process.env.PG_POOL_MAX, 10)      || 10,
    idleTimeoutMs: parseInt(process.env.PG_IDLE_TIMEOUT, 10)  || 60_000,
  },
}));