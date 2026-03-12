# Rendiciones Backend — NestJS + SAP HANA

## Stack
- **NestJS** (Node.js + TypeScript)
- **SAP HANA** via `@sap/hana-client`
- **JWT** para autenticacion
- **Winston** para logging
- **Swagger** para documentacion
- **Patron Repository** para intercambio de BD sin tocar endpoints

## Instalacion
```bash
npm install
cp .env.example .env
# Editar .env con los datos reales
```

## Ejecucion
```bash
npm run start:dev    # Desarrollo con hot-reload
npm run build        # Compilar
npm run start:prod   # Produccion
```

## Endpoints
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/v1/auth/login | Autenticacion |
| GET  | /api/v1/rendiciones | Listar rendiciones |
| GET  | /api/v1/rendiciones/:id | Ver rendicion |
| POST | /api/v1/rendiciones | Crear rendicion |
| PUT  | /api/v1/rendiciones/:id | Actualizar rendicion |
| DELETE | /api/v1/rendiciones/:id | Eliminar rendicion |

Swagger: `http://localhost:3000/api/docs`

## Cambiar de HANA a SQL Server
1. Implementar `rendiciones.sql.repository.ts`
2. Cambiar en `.env`: `DB_TYPE=SQL`
3. Reiniciar — el Controller y Service no cambian.

## Estructura de archivos clave
```
src/
├── database/hana.service.ts              # Conexion y queries HANA
├── modules/rendiciones/
│   ├── repositories/
│   │   ├── *.interface.ts                # Contrato unico
│   │   ├── *.hana.repository.ts          # Implementacion HANA (activa)
│   │   └── *.sql.repository.ts           # Implementacion SQL (futuro)
│   ├── rendiciones.service.ts            # Logica de negocio (no cambia)
│   └── rendiciones.controller.ts         # Endpoints REST (no cambia)
└── modules/rendiciones/rendiciones.module.ts  # Selecciona repo segun DB_TYPE
```
