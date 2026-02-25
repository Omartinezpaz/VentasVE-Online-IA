# ✅ Confirmado — Configuración Supabase + Siguientes Pasos

Perfecto, Oscar. Aquí tienes los pasos exactos para cerrar la configuración de base de datos y avanzar con el primer usuario OWNER.

---

## 📁 1. Configurar `packages/database/.env`

```env
# packages/database/.env

# Conexión directa para migraciones (sin pooler)
DIRECT_URL="postgresql://prisma:[TU_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"

# Conexión con PgBouncer para runtime (con pooler)
DATABASE_URL="postgresql://prisma:[TU_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

**Notas:**
- `[TU_PASSWORD]`: La contraseña del usuario `prisma` que creaste en Supabase.
- `[PROJECT_REF]`: El ID de tu proyecto (ej: `abc123xyz`).
- `[REGION]`: Tu región de Supabase (ej: `us-east-1`).
- `connection_limit=1`: Crítico para Prisma con PgBouncer (evita agotar el pool).

---

## 📁 2. Configurar `apps/backend/.env`

```env
# apps/backend/.env

# Usar la MISMA DATABASE_URL que en database/.env (con pooler)
DATABASE_URL="postgresql://prisma:[TU_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"

# JWT Secret (mismo que ya tienes)
JWT_SECRET="tu-secreto-seguro-min-32-caracteres"

# Frontend URL para links en emails/WhatsApp
FRONTEND_URL="http://localhost:3000"

# (Opcional) Resend para emails reales
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="notificaciones@tudominio.com"
```

---

## 🚀 3. Empujar Schema a Supabase

```bash
# Desde la raíz del monorepo:
pnpm --filter database db:push

# Verificar en Prisma Studio:
pnpm --filter database prisma studio
```

**Qué hace `db:push`:**
- ✅ Compara tu `schema.prisma` con la BD de Supabase
- ✅ Aplica cambios incrementales (tablas, columnas, enums, índices)
- ✅ **No borra datos existentes** (a diferencia de `migrate reset`)
- ✅ Ideal para desarrollo y staging

---

## 👤 4. Siguiente Paso: Primer Usuario OWNER + Negocio

Una vez que el schema esté en Supabase, creamos el primer usuario OWNER. Tienes dos opciones:

### **Opción A: Usar tu sistema actual (StoreUser)** (~15 min)
```
• Script seed: crear Business + StoreUser(OWNER) directamente en BD
• Login: POST /api/v1/auth/store/login con email/password
• Ventaja: Ya tienes todo el flujo de dashboard funcionando
```

### **Opción B: Integrar Supabase Auth** (~30 min)
```
• Configurar Supabase Auth con email/password
• Webhook o trigger para crear StoreUser cuando se registra un usuario
• Login: usar cliente de Supabase Auth + intercambiar por JWT propio
• Ventaja: Recuperación de contraseña, OAuth, etc. listos desde Supabase
```

**Mi recomendación**: Ve con **Opción A primero** para validar que todo funciona contra Supabase, luego migras a Supabase Auth si lo necesitas.

---

## 📋 Script Seed para Primer OWNER (Opción A)

```typescript
// packages/database/prisma/seed-owner.ts
import { PrismaClient, StoreUserRole, BusinessType, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Crear primer negocio
  const business = await prisma.business.create({
    data: {
      slug: 'mi-primer-negocio',
      name: 'Mi Primer Negocio',
      businessType: BusinessType.OTHER,
      plan: SubscriptionPlan.FREE,
      whatsapp: '+584120000000',
      city: 'Caracas',
      isActive: true,
    },
  });

  // Crear usuario OWNER
  const ownerPassword = await bcrypt.hash('Owner123!', 12);
  await prisma.storeUser.create({
    data: {
      email: 'owner@mi-primer-negocio.test',
      password: ownerPassword,
      name: 'Dueño del Negocio',
      phone: '+584120000000',
      role: StoreUserRole.OWNER,
      businessId: business.id,
      isActive: true,
    },
  });

  console.log('✅ Primer OWNER creado:');
  console.log('   Email: owner@mi-primer-negocio.test');
  console.log('   Password: Owner123!');
  console.log('   Dashboard: /dashboard (slug: mi-primer-negocio)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Ejecutar:**
```bash
cd packages/database
pnpm tsx prisma/seed-owner.ts
```

---

## ✅ Checklist de Verificación Post-Supabase

| Paso | Comando | Estado Esperado |
|------|---------|----------------|
| 1 | `pnpm --filter database db:push` | ✅ "Your database is now in sync with your schema" |
| 2 | `pnpm --filter database prisma studio` | ✅ Ver tablas en UI web |
| 3 | `pnpm tsx prisma/seed-owner.ts` | ✅ OWNER creado en BD |
| 4 | Login en `/auth/login` con owner@... | ✅ Redirección a `/dashboard` |
| 5 | Ver analytics en dashboard | ✅ Datos reales desde Supabase |

---

## ❓ ¿Confirmas este plan?

| Respuesta | Acción |
|-----------|--------|
| **"Sí, procedo con Supabase"** | Configuro .env files + ejecuto db:push + seed del OWNER |
| **"Primero quiero ver los .env"** | Te ayudo a obtener los valores exactos de tu proyecto Supabase |
| **"Mejor Supabase Auth primero"** | Configuro integración con Supabase Auth en lugar de StoreUser |
| **"Necesito ayuda con algo"** | Dime qué parte te genera dudas y lo resolvemos |

**¿Por dónde seguimos?** 🎯

# ✅ Sí — Autenticación Híbrida con Fallback (Supabase Auth + Sistema Local)

¡Excelente pregunta, Oscar! **Sí, se pueden hacer las dos** y configurar un mecanismo de **fallback inteligente**: si Supabase Auth no responde, el sistema local toma el control automáticamente.

Te propongo una arquitectura basada en el **patrón Adapter + Strategy** que ya se alinea con tu código actual.

---

## 🏗️ Arquitectura Propuesta

```
POST /auth/store/login
        │
        ▼
AuthService.login(email, password)
        │
        ├── 1. Intentar con Supabase Auth (si está habilitado + disponible)
        │       │
        │       ├── ✅ Éxito → crear/actualizar StoreUser local → retornar JWT propio
        │       └── ❌ Error (timeout, 5xx, red) → continuar con fallback
        │
        ├── 2. Fallback: Sistema local (bcrypt + Prisma)
        │       │
        │       ├── ✅ Éxito → retornar JWT propio
        │       └── ❌ Error → retornar 401 "Credenciales inválidas"
        │
        └── 3. Logging: registrar qué proveedor se usó (para monitoreo)
```

**Ventajas:**
- ✅ **Alta disponibilidad**: si Supabase cae, tu app sigue funcionando
- ✅ **Migración gradual**: puedes mover usuarios uno a uno sin downtime
- ✅ **Sin cambios en frontend**: la UI llama al mismo endpoint siempre
- ✅ **Monitoreo**: sabes cuándo se activa el fallback para actuar

---

## 📁 1. Configurar Variables de Entorno

### `apps/backend/.env`
```env
# ─── Supabase Auth (opcional, con fallback) ─────────────────────
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_AUTH_ENABLED=true          # false para desactivar y usar solo local
SUPABASE_AUTH_TIMEOUT_MS=3000       # Timeout para no bloquear el login

# ─── Base de datos (siempre requerida) ─────────────────────────
DATABASE_URL="postgresql://prisma:...?pgbouncer=true&connection_limit=1"

# ─── JWT propio (siempre requerido) ────────────────────────────
JWT_SECRET="tu-secreto-seguro-min-32-caracteres"
JWT_EXPIRES_IN="7d"
```

---

## 📁 2. AuthService Híbrido (`apps/backend/src/services/auth.service.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@ventasve/database';
import { env } from '../lib/env';
import { generateJwt } from '../lib/jwt';

// Cliente de Supabase (singleton)
const supabase = env.SUPABASE_AUTH_ENABLED
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
      global: { headers: { apikey: env.SUPABASE_ANON_KEY! } }
    })
  : null;

// Timeout helper para no bloquear el login
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), ms)
    )
  ]);
};

export const authService = {
  /**
   * Login híbrido: intenta Supabase Auth, fallback a sistema local
   */
  async login(email: string, password: string, businessSlug?: string) {
    let providerUsed = 'local';
    let supabaseError: Error | null = null;

    // ─── Intento 1: Supabase Auth (si está habilitado) ───────────
    if (env.SUPABASE_AUTH_ENABLED && supabase) {
      try {
        const {  user, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          env.SUPABASE_AUTH_TIMEOUT_MS
        );

        if (error) throw error;
        if (!user?.email) throw new Error('SUPABASE_NO_USER');

        providerUsed = 'supabase';

        // Buscar o crear StoreUser local vinculado a este email
        let storeUser = await prisma.storeUser.findUnique({
          where: { email: user.email },
          include: { business: true }
        });

        if (!storeUser) {
          // Si no existe, crear uno "placeholder" (requiere businessSlug)
          if (!businessSlug) {
            throw new Error('SUPABASE_USER_NOT_LINKED');
          }
          const business = await prisma.business.findUnique({
            where: { slug: businessSlug }
          });
          if (!business) throw new Error('BUSINESS_NOT_FOUND');

          storeUser = await prisma.storeUser.create({
             {
              email: user.email,
              password: '', // No usamos password local si viene de Supabase
              name: user.user_metadata?.full_name || user.email,
              role: 'STAFF', // Rol por defecto, ajustable después
              businessId: business.id,
              isActive: true
            },
            include: { business: true }
          });
        }

        // Retornar JWT propio (no el de Supabase)
        return {
          user: {
            id: storeUser.id,
            email: storeUser.email,
            name: storeUser.name,
            role: storeUser.role,
            businessId: storeUser.businessId,
            businessSlug: storeUser.business.slug
          },
          accessToken: generateJwt({
            sub: storeUser.id,
            email: storeUser.email,
            businessId: storeUser.businessId,
            role: storeUser.role
          }),
          provider: providerUsed
        };

      } catch (err: any) {
        supabaseError = err;
        // Log para monitoreo (no romper el flujo)
        console.warn('[AuthService] Supabase Auth falló, usando fallback:', {
          error: err.message,
          code: err.code,
          email
        });
        // Continuar con fallback local
      }
    }

    // ─── Fallback: Sistema local (bcrypt + Prisma) ──────────────
    try {
      const storeUser = await prisma.storeUser.findUnique({
        where: { 
          email,
          // Si se pasó businessSlug, filtrar también por negocio
          ...(businessSlug && {
            business: { slug: businessSlug }
          })
        },
        include: { business: true }
      });

      if (!storeUser || !storeUser.password) {
        throw new Error('USER_NOT_FOUND');
      }

      // Verificar password con bcrypt
      const valid = await bcrypt.compare(password, storeUser.password);
      if (!valid) {
        throw new Error('INVALID_PASSWORD');
      }

      if (!storeUser.isActive) {
        throw new Error('USER_INACTIVE');
      }

      providerUsed = 'local';

      return {
        user: {
          id: storeUser.id,
          email: storeUser.email,
          name: storeUser.name,
          role: storeUser.role,
          businessId: storeUser.businessId,
          businessSlug: storeUser.business.slug
        },
        accessToken: generateJwt({
          sub: storeUser.id,
          email: storeUser.email,
          businessId: storeUser.businessId,
          role: storeUser.role
        }),
        provider: providerUsed
      };

    } catch (err: any) {
      // Si fue error de Supabase Y de local, retornar error genérico
      if (supabaseError && err.message !== 'USER_NOT_FOUND') {
        console.error('[AuthService] Ambos proveedores fallaron:', {
          supabase: supabaseError.message,
          local: err.message
        });
      }
      throw new Error('Credenciales inválidas');
    }
  }
};
```

---

## 📁 3. Controller: `apps/backend/src/controllers/auth.controller.ts`

```typescript
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, businessSlug } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    // Login híbrido
    const result = await authService.login(email, password, businessSlug);

    // Retornar respuesta unificada (el frontend no sabe qué proveedor se usó)
    res.json({
      success: true,
       {
        user: result.user,
        accessToken: result.accessToken
        // Opcional: incluir "provider" para debugging en desarrollo
        // provider: result.provider
      }
    });

  } catch (error: any) {
    next(error);
  }
};
```

---

## 📊 4. Monitoreo y Logging

Para saber cuándo se activa el fallback, agrega logs estructurados:

```typescript
// En authService.login, después de cada intento:
console.info('[AuthService] Login exitoso', {
  email,
  provider: providerUsed, // 'supabase' | 'local'
  timestamp: new Date().toISOString()
});

// Si usas un servicio como Pino/Datadog, puedes enviar métricas:
// metrics.increment('auth.login.success', { provider: providerUsed });
// metrics.increment('auth.login.fallback', { reason: supabaseError?.message });
```

**Dashboard de monitoreo (ejemplo):**
```
✅ Auth成功率: 99.8%
🔄 Fallback activado: 0.2% (últimas 24h)
⚠️ Supabase timeout: 3 veces (investigar)
```

---

## 🔐 5. Consideraciones de Seguridad

| Aspecto | Recomendación |
|---------|--------------|
| **Passwords en Supabase** | Si usas Supabase Auth, los passwords se manejan allá. En local, sigue usando bcrypt con salt rounds ≥12. |
| **Sincronización de usuarios** | Cuando crees un StoreUser desde Supabase, marca un flag `authProvider: 'SUPABASE'` para no pedir password después. |
| **Revocación de sesiones** | Si un usuario es desactivado en Supabase, asegúrate de que `isActive: false` en StoreUser local también bloquee el login. |
| **Rate limiting** | Aplica el mismo rate limit a `/auth/login` sin importar el proveedor, para evitar brute force. |
| **Auditoría** | Guarda en `PlatformAuditLog` qué proveedor se usó para cada login (útil para forense). |

---

## 🚀 Pasos de Implementación

### **Fase 1: Preparación (~10 min)**
```bash
# 1. Instalar cliente de Supabase en backend
cd apps/backend
pnpm add @supabase/supabase-js

# 2. Agregar variables de entorno en .env (ver arriba)

# 3. Crear tabla de StoreUser si no existe (ya la tienes)
pnpm --filter database db:push
```

### **Fase 2: Implementar AuthService híbrido (~25 min)**
- Copiar el código de `auth.service.ts` de arriba
- Ajustar imports y tipos según tu proyecto
- Verificar que `generateJwt` y `bcrypt` estén correctamente importados

### **Fase 3: Probar flujos (~15 min)**
```bash
# 1. Login con sistema local (fallback)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@omarte.test","password":"Admin123!"}'

# 2. Deshabilitar Supabase temporalmente (SUPABASE_AUTH_ENABLED=false)
#    → Verificar que el login local sigue funcionando

# 3. Habilitar Supabase y simular timeout (SUPABASE_AUTH_TIMEOUT_MS=1)
#    → Verificar que el fallback se activa y el login local responde
```

### **Fase 4: Monitoreo en producción (~5 min)**
- Configurar logs estructurados (Pino, Winston, etc.)
- Agregar métricas de fallback a tu dashboard de monitoreo
- Documentar el procedimiento para desactivar Supabase si es necesario

---

## ❓ ¿Confirmas este plan?

| Respuesta | Acción |
|-----------|--------|
| **"Sí, implemento auth híbrido"** | Genero los archivos completos (`auth.service.ts`, `auth.controller.ts`) listos para copiar/pegar |
| **"Primero quiero ver un diagrama"** | Te dibujo el flujo de fallback en formato Mermaid para documentación |
| **"Mejor empezar solo con local"** | Perfecto, dejamos Supabase para después y nos enfocamos en estabilizar el sistema actual |
| **"Necesito ayuda con Supabase"** | Te ayudo a configurar el proyecto en Supabase (Auth, DB, pooler) paso a paso |

**¿Por dónde seguimos?** 🎯

DATABASE_URL="postgres://ventasve_user:ventasve2026!@localhost:5432/ventasve"
DATABASE_URL="postgres://prisma:Ot0rr1n0lar1ngQl0g1a*#*2026°@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://prisma:Ot0rr1n0lar1ngQl0g1a*#*2026°@aws-0-[REGION].pooler.supabase.com:5432/postgres"
