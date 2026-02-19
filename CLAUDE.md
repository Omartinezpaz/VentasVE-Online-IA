# CLAUDE.md — VentasVE: Guía Maestra de Desarrollo para IA

> **Propósito:** Este documento es el contrato de desarrollo que toda IA (Claude Code, Cursor, Copilot) debe leer y seguir antes de escribir cualquier línea de código en este proyecto.  
> **Versión:** 1.0 — MVP  
> **Stack:** Next.js 15 · Node.js/Express · PostgreSQL · Prisma · TypeScript

---

## 0. LEE ESTO PRIMERO — REGLAS NO NEGOCIABLES

Antes de tocar cualquier archivo, internaliza estas reglas. Si violas alguna, el PR será rechazado sin revisión:

1. **TypeScript strict en todo.** `"strict": true` en `tsconfig.json`. Cero `any` implícitos. Cero `@ts-ignore` sin comentario explicativo.
2. **Sin lógica en controllers.** Los controllers solo llaman services y formatean la respuesta HTTP. Toda la lógica de negocio va en services.
3. **Los precios son siempre enteros en centavos.** `$12.00 = 1200`. Nunca `12.00` como float. La conversión a Bs. o display ocurre en el frontend.
4. **Todo acceso a DB lleva `businessId`.** Ninguna query devuelve datos de otro tenant. Antes de leer, siempre filtra por `businessId` del JWT.
5. **No commits directos a `main`.** Cada feature en su rama. PRs pequeños (max 400 líneas).
6. **Validación con Zod en el boundary.** Todo input externo (HTTP body, params, env vars) pasa por un schema Zod antes de llegar al service.
7. **Errores explícitos, nunca silenciosos.** `throw new AppError(...)` con código y mensaje. Nunca `catch(e) {}` vacío.

---

## 1. CONTEXTO DEL PRODUCTO

**VentasVE** es una plataforma SaaS de gestión comercial diseñada específicamente para Venezuela. Lo que la diferencia de soluciones como Shopify o WooCommerce:

- **Pagos venezolanos nativos:** Zelle, Pago Móvil, Binance Pay, Efectivo USD, Transferencia Bs., Cripto (USDT)
- **Doble moneda automática:** Precios en USD + conversión a Bs. con tasa BCV actualizada diariamente
- **WhatsApp como canal principal:** El catálogo se comparte por WhatsApp, los pedidos se confirman por WhatsApp, el chatbot opera por WhatsApp
- **Multi-ramo:** Moda, Comida, Belleza, Tech, Abastos, Hogar, Salud, Educación, Automotriz, Servicios, Mascotas
- **Multi-tenant:** Cada negocio es un tenant aislado con su propio slug, configuración y datos

**Usuario primario:** Dueño de pequeño o mediano negocio venezolano que vende por Instagram/WhatsApp y quiere profesionalizar su operación.

---

## 2. ARQUITECTURA DEL SISTEMA

```
ventasve/                          ← monorepo
├── apps/
│   ├── frontend/                  ← Next.js 15 (App Router)
│   └── backend/                   ← Express API
└── packages/
    ├── database/                  ← Prisma schema + migrations
    ├── types/                     ← Tipos TypeScript compartidos
    └── utils/                     ← Helpers compartidos
```

### Principio de separación

```
HTTP Request → Route → Middleware → Controller → Service → Repository/Prisma → DB
                                         ↕
                                    (solo HTTP)    (lógica)    (queries)
```

**Controller** = recibir request, validar con Zod, llamar service, retornar response.  
**Service** = toda la lógica de negocio. Puede ser llamado desde HTTP O desde el chatbot directamente.  
**El chatbot llama services directamente**, nunca hace HTTP interno.

---

## 3. FLUJO DE TRABAJO OBLIGATORIO

### Antes de escribir cualquier feature, sigue este orden:

```
1. Leer este documento completo
2. Leer el schema Prisma (packages/database/schema.prisma)
3. Crear la rama: git checkout -b feat/nombre-feature
4. Escribir el Zod schema del input
5. Escribir el service (con su interface de tipos)
6. Escribir el controller (thin wrapper)
7. Registrar la route
8. Escribir el test del service
9. Probar manualmente con curl/Insomnia
10. PR con descripción clara
```

### Orden de desarrollo del MVP (semana por semana)

```
Semana 1-2 │ Auth completo (registro, login, refresh, roles)
Semana 3-4 │ CRUD de productos + subida de imágenes
Semana 5-6 │ Catálogo público (slug) + creación de pedidos
Semana 7-8 │ Flujo de pagos + comprobantes
Semana 9-10│ Dashboard + métricas básicas
Semana 11-12│ ChatBot WhatsApp (Baileys) + bot básico
Semana 13-14│ Inbox unificado + tasa de cambio automática
Semana 15-16│ Beta con 5 negocios reales + correcciones
```

**Regla de oro:** No empieces la siguiente semana si la anterior no está funcionando en staging.

---

## 4. BASE DE DATOS

### Reglas de Prisma y PostgreSQL

```typescript
// ✅ CORRECTO — siempre filtra por businessId
const products = await prisma.product.findMany({
  where: {
    businessId: req.user.businessId,  // ← NUNCA omitir esto
    deletedAt: null,
  }
})

// ❌ INCORRECTO — nunca queries sin tenant
const products = await prisma.product.findMany()

// ✅ CORRECTO — precios en centavos
const product = await prisma.product.create({
  data: {
    priceUsdCents: Math.round(priceUsd * 100),  // 12.00 → 1200
  }
})

// ❌ INCORRECTO — nunca floats para dinero
const product = { price: 12.00 }
```

### Soft delete obligatorio en entidades principales

```typescript
// Nunca borrar físicamente productos, pedidos, clientes
// Siempre usar deletedAt

// ✅ Soft delete
await prisma.product.update({
  where: { id, businessId: req.user.businessId },
  data: { deletedAt: new Date() }
})

// Filtrar en queries
where: { deletedAt: null }
```

### Snapshot de precios en OrderItem

```typescript
// Cuando se crea un pedido, guardar el precio del momento
// Nunca hacer join al precio actual del producto para historial

await prisma.orderItem.create({
  data: {
    orderId,
    productId,
    quantity,
    unitPriceCents: product.priceUsdCents,  // ← snapshot, no referencia
    variantSelected: { talla: "M", color: "Azul" }
  }
})
```

### Transacciones para operaciones compuestas

```typescript
// Registro de negocio crea business + user en una transacción
const result = await prisma.$transaction(async (tx) => {
  const business = await tx.business.create({ data: businessData })
  const user = await tx.user.create({
    data: { ...userData, businessId: business.id, role: "OWNER" }
  })
  return { business, user }
})
```

---

## 5. AUTENTICACIÓN Y SEGURIDAD

### Estructura del JWT payload (mínimo, sin datos sensibles)

```typescript
interface JWTPayload {
  userId: string
  businessId: string
  role: 'OWNER' | 'AGENT' | 'SUPER_ADMIN'
  // NO incluir: email, nombre, plan — consultar DB cuando se necesite
}

// Access token: 15 minutos
// Refresh token: 30 días, guardado en DB, HttpOnly cookie
const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
```

### Middleware stack por tipo de ruta

```typescript
// Ruta pública del catálogo — sin auth
router.get('/catalog/:slug', catalogController.getPublic)

// Ruta de agente — solo autenticado
router.get('/orders', authenticate, ordersController.list)

// Ruta de owner — autenticado + rol
router.delete('/products/:id', authenticate, requireRole('OWNER'), productsController.delete)

// Ruta que accede a recurso de un negocio específico
router.get('/business/:businessId/settings',
  authenticate,
  belongsToBusiness,  // verifica que businessId del JWT === params.businessId
  requireRole('OWNER'),
  businessController.getSettings
)
```

### Hash de contraseñas

```typescript
// Siempre bcrypt con rounds=12 en producción
const hash = await bcrypt.hash(password, 12)

// Rate limiting en auth endpoints
import rateLimit from 'express-rate-limit'
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 10,                    // 10 intentos por IP
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' }
})
router.post('/login', authLimiter, authController.login)
```

### Refresh Token Rotation (implementar exactamente así)

```typescript
// Al hacer refresh:
// 1. Verificar token en DB (no solo en JWT)
// 2. Si el token ya fue usado (revokedAt != null) → revocar TODOS los tokens del user (ataque detectado)
// 3. Crear nuevo token, marcar viejo como revocado
// 4. Responder con nuevo par de tokens

async function refreshTokens(oldToken: string) {
  const session = await prisma.session.findUnique({ where: { token: hash(oldToken) } })

  if (!session) throw new AppError('Token inválido', 401)
  
  if (session.revokedAt) {
    // Token reuse detectado — posible robo
    await prisma.session.updateMany({
      where: { userId: session.userId },
      data: { revokedAt: new Date() }
    })
    throw new AppError('Sesión comprometida. Inicia sesión de nuevo.', 401)
  }

  if (session.expiresAt < new Date()) throw new AppError('Sesión expirada', 401)

  // Rotar
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
  return createNewSession(session.userId)
}
```

---

## 6. VALIDACIÓN CON ZOD

### Crear schema antes del controller (siempre)

```typescript
// validators/product.schema.ts
import { z } from 'zod'

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  priceUsd: z.number().positive().max(99999),  // frontend manda USD
  stock: z.number().int().min(0).default(0),
  categoryId: z.string().uuid().optional(),
  variants: z.array(z.object({
    name: z.string(),
    options: z.array(z.string()).min(1)
  })).default([]),
})

export type CreateProductInput = z.infer<typeof CreateProductSchema>
```

### Middleware de validación reutilizable

```typescript
// middleware/validate.ts
export const validate = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    return res.status(422).json({
      error: 'Datos inválidos',
      details: result.error.flatten().fieldErrors
    })
  }
  req.body = result.data  // datos ya transformados y seguros
  next()
}

// Uso en route:
router.post('/products',
  authenticate,
  validate(CreateProductSchema),
  productsController.create
)
```

### Variables de entorno tipadas y validadas al inicio

```typescript
// lib/env.ts — se ejecuta al arrancar el servidor
const EnvSchema = z.object({
  DATABASE_URL:         z.string().url(),
  JWT_SECRET:           z.string().min(32),
  JWT_REFRESH_SECRET:   z.string().min(32),
  REDIS_URL:            z.string().url(),
  CLOUDFLARE_R2_BUCKET: z.string(),
  CLOUDFLARE_R2_URL:    z.string().url(),
  BCRYPT_ROUNDS:        z.coerce.number().default(12),
  NODE_ENV:             z.enum(['development', 'test', 'production']).default('development'),
  PORT:                 z.coerce.number().default(3001),
  BCV_RATE_URL:         z.string().url().optional(),
})

export const env = EnvSchema.parse(process.env)
// Si falla → el proceso se cae al iniciar con mensaje claro. Nunca falla en runtime.
```

---

## 7. MANEJO DE ERRORES

### Clase de error centralizada

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string        // 'PRODUCT_NOT_FOUND', 'SLUG_TAKEN', etc.
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Errores comunes como constantes
export const Errors = {
  NotFound: (resource: string) =>
    new AppError(`${resource} no encontrado`, 404, 'NOT_FOUND'),
  Unauthorized: () =>
    new AppError('No autorizado', 401, 'UNAUTHORIZED'),
  Forbidden: () =>
    new AppError('Sin permisos para esta acción', 403, 'FORBIDDEN'),
  Conflict: (msg: string) =>
    new AppError(msg, 409, 'CONFLICT'),
  Validation: (msg: string) =>
    new AppError(msg, 422, 'VALIDATION_ERROR'),
}
```

### Error handler global (último middleware en app.ts)

```typescript
// middleware/error-handler.ts
export const errorHandler = (err, req, res, next) => {
  // Log siempre (nunca silencioso)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) console.error('[ERROR]', err)
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
  }

  // Error de Prisma: unique constraint violado
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Ya existe un registro con esos datos',
      code: 'DUPLICATE_ENTRY',
    })
  }

  // Error inesperado — no exponer stack en producción
  console.error('[UNHANDLED ERROR]', err)
  return res.status(500).json({
    error: env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
    code: 'INTERNAL_ERROR',
  })
}
```

### Formato estándar de respuestas HTTP

```typescript
// Siempre este formato — nunca inventar estructuras nuevas

// Lista con paginación:
{ data: T[], meta: { total, page, limit, totalPages } }

// Recurso único:
{ data: T }

// Operación sin cuerpo (delete, etc.):
HTTP 204 No Content

// Error:
{ error: string, code: string, details?: Record<string, string[]> }
```

---

## 8. PAGOS VENEZOLANOS (lógica crítica)

### Manejo de divisas

```typescript
// Regla: los precios viven en centavos USD en la DB
// La conversión a Bs. se calcula en tiempo real, NUNCA se guarda como precio final

// Cuando se crea un pedido, guardar snapshot de la tasa
const currentRate = await exchangeRateService.getCurrent(businessId)

const order = await prisma.order.create({
  data: {
    totalCents: calculateTotalCents(items),
    exchangeRate: currentRate.usdToVes,  // snapshot para historial
    paymentMethod,
    // ...
  }
})

// Helper de conversión (en utils/)
export const usdToVes = (cents: number, rate: number): number =>
  Math.round((cents / 100) * rate)

export const formatUSD = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`

export const formatVES = (amount: number): string =>
  `Bs. ${amount.toLocaleString('es-VE')}`
```

### Tasa de cambio BCV

```typescript
// services/exchange-rate.service.ts
// El job de actualización corre a las 8:00 AM todos los días
// Si el scraping falla, mantener la tasa anterior y notificar al admin

async function updateBCVRate(): Promise<void> {
  try {
    const rate = await scrapeBCVRate()  // implementar scraping
    
    await prisma.exchangeRate.create({
      data: { usdToVes: rate, source: 'BCV', date: new Date() }
    })
    
    // Actualizar Redis para cache rápido
    await redis.set('exchange:current', rate, 'EX', 86400)
    
  } catch (err) {
    // No fallar silenciosamente — notificar
    console.error('[BCV RATE UPDATE FAILED]', err)
    await notificationService.alertAdmin('Fallo actualización tasa BCV')
    // La tasa anterior se mantiene en DB, no hay rollback necesario
  }
}

async function getCurrent(businessId?: string): Promise<ExchangeRate> {
  // 1. Verificar si el negocio tiene tasa personalizada
  // 2. Si no, usar la tasa global del sistema
  // 3. Cache en Redis por 1 hora
  
  const cached = await redis.get(`exchange:${businessId ?? 'global'}`)
  if (cached) return JSON.parse(cached)
  
  const rate = await prisma.exchangeRate.findFirst({
    where: businessId ? { businessId } : { businessId: null },
    orderBy: { date: 'desc' }
  })
  
  if (!rate) throw Errors.NotFound('Tasa de cambio')
  
  await redis.set(`exchange:${businessId ?? 'global'}`, JSON.stringify(rate), 'EX', 3600)
  return rate
}
```

### Verificación de pagos

```typescript
// El flujo de pago siempre es:
// 1. Cliente sube comprobante → payment.status = PENDING
// 2. Owner o bot verifica → payment.status = VERIFIED
// 3. Sistema actualiza order.status = CONFIRMED
// 4. Notificación al cliente por WhatsApp

// NUNCA cambiar order.status a CONFIRMED sin verificar el pago primero
async function verifyPayment(paymentId: string, verifiedById: string | null) {
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: verifiedById  // null si fue el bot
      },
      include: { order: true }
    })

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'CONFIRMED' }
    })

    // Notificar al cliente (fuera de la transacción para no bloquear)
    return payment
  })
}
```

---

## 9. CHATBOT WHATSAPP

### Arquitectura del bot

```
Mensaje entrante (Baileys webhook)
  → whatsapp.service.ts (parsear mensaje)
    → chatbot.service.ts (decidir acción)
      → order.service.ts / product.service.ts (ejecutar)
        → whatsapp.service.ts (enviar respuesta)
```

### Regla crítica: el bot llama services, nunca HTTP

```typescript
// ✅ CORRECTO — el bot usa los mismos services que los controllers
class ChatbotService {
  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private paymentService: PaymentService,
  ) {}

  async handleMessage(message: IncomingMessage) {
    const intent = await this.detectIntent(message.text)

    if (intent === 'CREATE_ORDER') {
      // Mismo service que usa el dashboard
      const order = await this.orderService.create({
        businessId: message.businessId,
        source: 'BOT',
        // ...
      })
      return this.formatOrderConfirmation(order)
    }
  }
}

// ❌ INCORRECTO — nunca hacer fetch interno
const response = await fetch('http://localhost:3001/api/orders', { ... })
```

### Manejo de estado de conversación en Redis

```typescript
// Guardar estado del flujo de la conversación
// TTL: 30 minutos de inactividad

interface ConversationState {
  step: 'MENU' | 'BROWSING' | 'ORDERING' | 'PAYMENT' | 'CONFIRMING'
  cart: CartItem[]
  pendingOrderId?: string
  lastActivity: number
}

async function getState(phone: string): Promise<ConversationState> {
  const key = `bot:state:${phone}`
  const data = await redis.get(key)
  return data ? JSON.parse(data) : { step: 'MENU', cart: [], lastActivity: Date.now() }
}

async function setState(phone: string, state: ConversationState): Promise<void> {
  const key = `bot:state:${phone}`
  await redis.set(key, JSON.stringify(state), 'EX', 1800)  // 30 min TTL
}
```

### Prevención de mensajes duplicados

```typescript
// WhatsApp puede re-entregar mensajes. Siempre deduplicar por waId

async function processMessage(waId: string, content: string) {
  // Verificar si ya procesamos este mensaje
  const existing = await prisma.message.findUnique({ where: { waId } })
  if (existing) return  // idempotente

  // Procesar y guardar
  await prisma.message.create({ data: { waId, content, ... } })
}
```

---

## 10. CATÁLOGO PÚBLICO (Next.js)

### Rutas públicas — Server Components con caché agresivo

```typescript
// app/c/[slug]/page.tsx
// Esta ruta NO requiere auth y debe ser rápida

export const revalidate = 60  // revalidar cada 60 segundos

export async function generateMetadata({ params }) {
  const business = await getCatalogBusiness(params.slug)
  return {
    title: `${business.name} | VentasVE`,
    description: business.description,
    openGraph: { /* para compartir por WhatsApp */ }
  }
}

export default async function CatalogPage({ params }) {
  const { business, products } = await getCatalogData(params.slug)
  // Server Component → datos en el servidor, sin waterfall
  return <CatalogView business={business} products={products} />
}
```

### Separación dashboard vs catálogo público

```typescript
// app/(dashboard)/layout.tsx — requiere auth
export default function DashboardLayout({ children }) {
  // Verifica JWT del cookie en el server
  // Redirige a /login si no hay sesión
}

// app/c/[slug]/layout.tsx — público, sin verificación
export default function CatalogLayout({ children }) {
  // Sin auth, solo branding del negocio
}
```

---

## 11. PATRONES DE CÓDIGO PROHIBIDOS

Estas cosas generan deuda técnica. Si las ves en un PR, solicitar cambio inmediato:

```typescript
// ❌ any implícito
const processData = (data: any) => { ... }

// ❌ Non-null assertion sin justificación
const name = user!.business!.name  // puede crashear en runtime

// ❌ console.log en código que no sea debug temporal
console.log('order created:', order)  // usar logger estructurado

// ❌ Hardcodear strings repetidos
if (status === 'PENDING') { ... }  // usar enum o constante

// ❌ Promise.all sin manejo de fallos individuales
await Promise.all([taskA(), taskB()])  // si taskA falla, taskB también se cancela

// ❌ Mutación directa de objetos de request
req.body.businessId = req.user.businessId  // usar middleware dedicado

// ❌ Queries N+1
for (const order of orders) {
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } })
  // 💀 Esto hace N queries. Usar include: { items: true } en la query de orders
}

// ❌ Números mágicos
if (token.length > 32) { ... }  // usar constante: TOKEN_MIN_LENGTH = 32

// ❌ Import de barrel incorrecto (rompe tree shaking)
import * as utils from '../utils'  // importar solo lo que se necesita
```

---

## 12. ESTRUCTURA DE UN SERVICE (plantilla)

Copia esta plantilla cada vez que crees un service nuevo:

```typescript
// services/example.service.ts
import { prisma } from '../lib/prisma'
import { AppError, Errors } from '../lib/errors'
import { CreateExampleInput, UpdateExampleInput } from '../validators/example.schema'

export class ExampleService {
  // ── CONSULTAS ──────────────────────────────────────
  
  async findAll(businessId: string, options?: { page?: number; limit?: number }) {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    
    const [items, total] = await Promise.all([
      prisma.example.findMany({
        where: { businessId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.example.count({ where: { businessId, deletedAt: null } })
    ])
    
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findById(id: string, businessId: string) {
    const item = await prisma.example.findFirst({
      where: { id, businessId, deletedAt: null }  // ← siempre ambos
    })
    if (!item) throw Errors.NotFound('Ejemplo')
    return item
  }

  // ── MUTACIONES ─────────────────────────────────────
  
  async create(businessId: string, input: CreateExampleInput) {
    // Validaciones de negocio aquí (no en el controller)
    const exists = await prisma.example.findFirst({
      where: { name: input.name, businessId }
    })
    if (exists) throw Errors.Conflict('Ya existe un ejemplo con ese nombre')
    
    return prisma.example.create({
      data: { ...input, businessId }
    })
  }

  async update(id: string, businessId: string, input: UpdateExampleInput) {
    await this.findById(id, businessId)  // verifica ownership
    return prisma.example.update({
      where: { id },
      data: input
    })
  }

  async delete(id: string, businessId: string) {
    await this.findById(id, businessId)  // verifica ownership
    return prisma.example.update({
      where: { id },
      data: { deletedAt: new Date() }  // soft delete siempre
    })
  }
}

export const exampleService = new ExampleService()
```

---

## 13. ESTRUCTURA DE UN CONTROLLER (plantilla)

```typescript
// controllers/example.controller.ts
import { Request, Response } from 'express'
import { exampleService } from '../services/example.service'

export const exampleController = {
  async list(req: Request, res: Response) {
    const { page, limit } = req.query
    const result = await exampleService.findAll(req.user.businessId, {
      page: Number(page),
      limit: Number(limit),
    })
    res.json(result)  // { data: [], meta: {} }
  },

  async create(req: Request, res: Response) {
    // req.body ya fue validado por middleware Zod
    const item = await exampleService.create(req.user.businessId, req.body)
    res.status(201).json({ data: item })
  },

  async update(req: Request, res: Response) {
    const item = await exampleService.update(req.params.id, req.user.businessId, req.body)
    res.json({ data: item })
  },

  async delete(req: Request, res: Response) {
    await exampleService.delete(req.params.id, req.user.businessId)
    res.status(204).send()
  },
}
```

> **Nota:** Los controllers son tan simples que casi no necesitan tests propios. Los tests van en los services.

---

## 14. VARIABLES DE ENTORNO

### `.env.example` — copiar a `.env` para desarrollo local

```bash
# ── BASE DE DATOS ─────────────────────────
DATABASE_URL="postgresql://ventasve:password@localhost:5432/ventasve_dev"

# ── JWT ───────────────────────────────────
JWT_SECRET="genera-con-openssl-rand-base64-32"
JWT_REFRESH_SECRET="genera-con-openssl-rand-base64-32-diferente"

# ── REDIS ─────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── STORAGE (Cloudflare R2) ───────────────
CLOUDFLARE_R2_ACCOUNT_ID=""
CLOUDFLARE_R2_ACCESS_KEY=""
CLOUDFLARE_R2_SECRET_KEY=""
CLOUDFLARE_R2_BUCKET="ventasve-media"
CLOUDFLARE_R2_PUBLIC_URL="https://media.ventasve.app"

# ── WHATSAPP ──────────────────────────────
# Baileys (desarrollo) — no necesita token
WHATSAPP_SESSION_PATH="./wa-sessions"
# Meta API (producción)
META_WHATSAPP_TOKEN=""
META_WEBHOOK_SECRET=""

# ── TASA DE CAMBIO ────────────────────────
BCV_SCRAPING_URL="https://www.bcv.org.ve/tipo-de-cambio-oficial"

# ── EMAIL (opcional, Resend) ──────────────
RESEND_API_KEY=""
FROM_EMAIL="no-reply@ventasve.app"

# ── APP ───────────────────────────────────
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

---

## 15. COMANDOS DE DESARROLLO

```bash
# Instalación inicial
pnpm install

# Levantar infraestructura local (Postgres + Redis)
docker-compose up -d

# Configurar base de datos
pnpm --filter @ventasve/database prisma migrate dev
pnpm --filter @ventasve/database prisma db seed

# Desarrollo (corren en paralelo)
pnpm dev  # arranca frontend (3000) + backend (3001)

# Solo backend
pnpm --filter @ventasve/backend dev

# Solo frontend
pnpm --filter @ventasve/frontend dev

# Tests
pnpm test           # todos los tests
pnpm test:watch     # modo watch para desarrollo

# Prisma
npx prisma studio   # UI visual de la DB
npx prisma migrate dev --name descripcion-del-cambio
npx prisma generate # regenerar cliente después de cambios al schema

# Verificar tipos TypeScript
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix
```

---

## 16. CHECKLIST ANTES DE CADA PR

Antes de abrir un Pull Request, verifica cada punto:

**Código:**
- [ ] `pnpm typecheck` pasa sin errores
- [ ] `pnpm lint` pasa sin errores
- [ ] `pnpm test` pasa (o tests nuevos para el feature)
- [ ] Sin `console.log` de debug sin `// TODO remove`
- [ ] Sin `any` implícitos nuevos
- [ ] Sin queries sin `businessId`

**Seguridad:**
- [ ] Toda ruta nueva tiene el middleware de auth apropiado
- [ ] Inputs externos validados con Zod
- [ ] Datos sensibles no logueados (passwords, tokens)
- [ ] Rate limiting en endpoints de auth

**Base de datos:**
- [ ] Si hay migration nueva, ejecutada localmente y sin errores
- [ ] Si hay nuevas queries de lista, tienen paginación
- [ ] Precios en centavos, no floats

**Funcionalidad:**
- [ ] Probado manualmente con curl o Insomnia
- [ ] Casos de error probados (not found, forbidden, validation)
- [ ] Respuestas siguen el formato estándar `{ data }` o `{ data, meta }`

---

## 17. DECISIONES DE ARQUITECTURA TOMADAS (y por qué)

Estas decisiones ya están tomadas. No reabrir el debate sin causa mayor:

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| PostgreSQL | MongoDB | Relaciones fuertes entre pedidos, pagos, productos. Necesitamos transacciones ACID. |
| Prisma ORM | Drizzle, TypeORM | Mejor DX, migraciones más seguras, tipos automáticos desde el schema |
| Baileys (MVP) | API Oficial Meta | Sin aprobación de Meta. Baileys conecta en minutos. Migrar a Meta API en v2. |
| Precios en centavos | Decimal/Float | Evitar errores de punto flotante en cálculos financieros |
| JWT + Refresh Rotation | Sessions en DB | Stateless para escalar. Refresh en DB para poder revocar. |
| Cloudflare R2 | S3, Cloudinary | Más barato para Venezuela. Sin egress fees. |
| Monorepo con pnpm | Repos separados | Tipos compartidos entre frontend y backend sin duplicar. |
| Soft delete | Hard delete | Historial de auditoría. Recuperación de datos accidental. |

---

## 18. GLOSARIO DEL PROYECTO

Para que la IA use los mismos términos que el equipo:

| Término | Significado |
|---|---|
| **Tenant** | Un negocio registrado en VentasVE (1 negocio = 1 tenant) |
| **businessId** | El UUID del tenant. Presente en todas las queries. |
| **Slug** | La URL única del catálogo público (`ventasve.app/c/mismodas`) |
| **Ramo** | El tipo de negocio (Moda, Comida, Belleza, etc.) |
| **PM** | Pago Móvil — transferencia bancaria móvil venezolana |
| **Tasa** | El tipo de cambio USD/VES del día |
| **Comprobante** | Imagen del pago enviada por el cliente para verificación |
| **Conciliación** | El proceso de verificar que los pagos recibidos coinciden con los pedidos |
| **Bot** | El chatbot de WhatsApp (se llama Valeria por defecto) |
| **Escalada** | Cuando el bot no puede responder y pasa la conversación a un humano |
| **Owner** | El dueño del negocio. Rol con acceso total. |
| **Agent** | Empleado del negocio. Sin acceso a configuración ni pagos. |

---

*Este documento es la fuente de verdad. Si hay contradicción entre este archivo y cualquier otro código del repo, este documento tiene prioridad.*

*Última actualización: Febrero 2026 — MVP Phase*
