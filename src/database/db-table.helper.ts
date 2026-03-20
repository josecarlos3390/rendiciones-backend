/**
 * Helper centralizado para construir nombres de tabla según el motor activo.
 *
 * HANA / SQL Server → "SCHEMA"."TABLA"   (requiere prefijo de schema)
 * PostgreSQL        → "TABLA"            (search_path ya aplica el schema)
 *
 * Uso en cualquier repositorio:
 *   private get DB() { return tbl(this.schema, 'REND_U', this.dbType); }
 */
export function tbl(schema: string, table: string, dbType: string): string {
  if (dbType.toUpperCase() === 'POSTGRES') {
    return `"${table}"`;
  }
  return `"${schema}"."${table}"`;
}