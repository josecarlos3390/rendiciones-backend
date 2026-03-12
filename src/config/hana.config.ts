import { registerAs } from '@nestjs/config';

export default registerAs('hana', () => ({
  host: process.env.HANA_HOST,
  port: parseInt(process.env.HANA_PORT, 10) || 30015,
  user: process.env.HANA_USER,
  password: process.env.HANA_PASSWORD,
  schema: process.env.HANA_SCHEMA,
  encrypt: process.env.HANA_ENCRYPT === 'true',
  sslValidateCertificate: process.env.HANA_SSL_VALIDATE_CERTIFICATE === 'true',
}));
