# Guía de Integración Supabase + Prisma (VentasVE)

Este documento detalla la configuración actual, solución de problemas comunes y flujos de trabajo para la base de datos en Supabase.

## 1. Configuración de Conexión (Importante)

Supabase ofrece dos tipos de conexión a través de Supavisor (Pooler). Debido a restricciones de redes IPv4 vs IPv6, usamos la siguiente configuración:

### Variables de Entorno (`packages/database/.env`)

```env
# Transaction Pooler (Puerto 6543) - Para el Backend/Prisma
# Soporta IPv4 y es ideal para entornos Serverless/Lambda
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"

# Session Pooler (Puerto 5432) - Para Migraciones (opcional) o conexiones directas
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require"
```

## 2. Solución de Errores SSL (Windows/Dev)

Al usar el Transaction Pooler en modo "Transaction", el certificado SSL puede ser interpretado como "self-signed" por el driver de Node.js.

### Solución en Código (`src/index.ts`)
Hemos configurado `PrismaPg` para relajar la validación SSL en desarrollo:

```typescript
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Necesario para Supabase Transaction Pooler
});
```

### Solución por Variable de Entorno (Emergencia)
Si el error persiste (`self-signed certificate in certificate chain`), ejecutar en la terminal antes de los comandos:

**PowerShell:**
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
```

**Bash:**
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

## 3. Políticas de Seguridad (RLS)

Supabase activa RLS (Row Level Security) por defecto. Si no hay políticas, **nadie** puede leer/escribir (excepto el rol `postgres/service_role`).

### Estado Actual
- Tablas: `Business`, `StoreUser` (mapeada como `User` en Prisma).
- RLS: Activado.

### SQL para corregir "RLS activado sin política"

Ejecutar en [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new):

```sql
-- 1. Permitir lectura pública de Negocios (necesario para la tienda online)
CREATE POLICY "Public Read Access" ON "Business"
FOR SELECT TO public USING (true);

-- 2. Permitir acceso total al Backend (service_role)
CREATE POLICY "Service Role Full Access" ON "Business"
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Habilitar RLS en Usuarios (si no estaba)
ALTER TABLE "StoreUser" ENABLE ROW LEVEL SECURITY;

-- 4. Política de Usuarios (Service Role)
CREATE POLICY "Service Role User Access" ON "StoreUser"
FOR ALL TO service_role USING (true) WITH CHECK (true);
```

## 4. Comandos Frecuentes

### Generar Cliente Prisma
Cada vez que cambies `schema.prisma`:
```bash
pnpm exec prisma generate
```

### Crear Migración SQL (Sin conexión)
Si la conexión falla, genera el SQL y ejecútalo manualmente en Supabase:
```bash
pnpm exec prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script > migration.sql
```

### Ejecutar Seed (Datos Iniciales)
```bash
# Con fix de SSL temporal
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; pnpm dlx tsx prisma/seed-owner.ts
```
