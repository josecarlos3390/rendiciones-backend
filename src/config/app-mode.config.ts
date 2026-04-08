/**
 * Configuración del modo de operación de la aplicación
 * 
 * Variables de entorno:
 * - DB_TYPE: HANA | SQLSERVER | POSTGRES
 * - APP_MODE: ONLINE (SAP Service Layer) | OFFLINE (solo Postgres)
 * 
 * Combinaciones válidas:
 *   DB_TYPE=HANA      + APP_MODE=ONLINE   → HANA + SAP Service Layer
 *   DB_TYPE=SQLSERVER + APP_MODE=ONLINE   → SQL Server + SAP Service Layer
 *   DB_TYPE=POSTGRES  + APP_MODE=OFFLINE  → Postgres sin SAP Service Layer
 */

export type DbType = 'HANA' | 'SQLSERVER' | 'POSTGRES';
export type AppMode = 'ONLINE' | 'OFFLINE';

export interface AppModeConfig {
  /** Tipo de base de datos configurada */
  dbType: DbType;
  /** Modo de operación: ONLINE u OFFLINE */
  appMode: AppMode;
  /** true si APP_MODE=ONLINE */
  isOnline: boolean;
  /** true si APP_MODE=OFFLINE */
  isOffline: boolean;
  /** true si usa SAP Service Layer (ONLINE + HANA/SQLSERVER) */
  usesServiceLayer: boolean;
  /** Valida que la combinación DB_TYPE + APP_MODE sea correcta */
  isValidConfiguration: boolean;
}

/**
 * Valida que la combinación de DB_TYPE y APP_MODE sea válida
 */
function validateConfiguration(dbType: string, appMode: string): boolean {
  const validCombinations = [
    { dbType: 'HANA', appMode: 'ONLINE' },
    { dbType: 'SQLSERVER', appMode: 'ONLINE' },
    { dbType: 'POSTGRES', appMode: 'OFFLINE' },
  ];

  return validCombinations.some(
    combo => combo.dbType === dbType && combo.appMode === appMode
  );
}

/**
 * Determina si el modo usa SAP Service Layer
 */
function usesServiceLayer(dbType: string, appMode: string): boolean {
  return (
    appMode === 'ONLINE' && 
    ['HANA', 'SQLSERVER'].includes(dbType)
  );
}

export default (): { appMode: AppModeConfig } => {
  const dbType = (process.env.DB_TYPE || 'HANA').toUpperCase() as DbType;
  const appMode = (process.env.APP_MODE || 'ONLINE').toUpperCase() as AppMode;

  const isOnline = appMode === 'ONLINE';
  const isOffline = appMode === 'OFFLINE';
  const usesSL = usesServiceLayer(dbType, appMode);
  const isValid = validateConfiguration(dbType, appMode);

  // Log de advertencia si la configuración es inválida
  if (!isValid) {
    console.warn(`⚠️  Configuración inválida: DB_TYPE=${dbType} + APP_MODE=${appMode}`);
    console.warn('   Combinaciones válidas:');
    console.warn('   - HANA/SQLSERVER + ONLINE');
    console.warn('   - POSTGRES + OFFLINE');
  }

  return {
    appMode: {
      dbType,
      appMode,
      isOnline,
      isOffline,
      usesServiceLayer: usesSL,
      isValidConfiguration: isValid,
    },
  };
};
