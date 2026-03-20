import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  /** Motor de base de datos activo: HANA | SQLSERVER | POSTGRES */
  dbType: process.env.DB_TYPE || 'HANA',

  /** Modo de operación: ONLINE = conectado a SAP SL | OFFLINE = solo Postgres */
  mode: (process.env.APP_MODE || 'ONLINE').toUpperCase(),

  rendConceptoMaxCaracteres: parseInt(process.env.REND_CONCEPTO_MAX_CARACTERES, 10) || 200,
  aplicaCuentaNormaReparto: process.env.APLICA_CUENTA_NORMA_REPARTO === '1',
  aplicaLectorQR: process.env.APLICA_LECTOR_QR === '1',
  aplicaNroOT: process.env.APLICA_NRO_OT === '1',
  /** 'LOCAL' = moneda local es BS, 'SISTEMA' = moneda local es USD */
  bolivianosEs: (process.env.BolivianosEs ?? 'LOCAL').toUpperCase() as 'LOCAL' | 'SISTEMA',
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8,
    maxIntentos: parseInt(process.env.PASSWORD_MAX_INTENTOS, 10) || 10,
    duracionDias: parseInt(process.env.PASSWORD_DURACION_DIAS, 10) || 365,
  },
}));