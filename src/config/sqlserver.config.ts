import { registerAs } from '@nestjs/config';

export default registerAs('sqlserver', () => ({
  host:     process.env.SQL_HOST,
  port:     parseInt(process.env.SQL_PORT, 10) || 1433,
  user:     process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  schema:   process.env.SQL_SCHEMA || 'dbo',
  encrypt:  process.env.SQL_ENCRYPT === 'true',
  pool: {
    min:            parseInt(process.env.SQL_POOL_MIN, 10)  || 2,
    max:            parseInt(process.env.SQL_POOL_MAX, 10)  || 10,
    idleTimeoutMs:  parseInt(process.env.SQL_IDLE_TIMEOUT, 10) || 60_000,
  },
}));