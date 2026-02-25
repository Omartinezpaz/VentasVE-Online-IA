# VentasVE — Full Codebase Audit

> **Date:** 2026-02-24
> **Scope:** Backend (Express + Prisma), Frontend (Next.js 15 + React 19), Database (PostgreSQL), Testing & DevOps
> **Audited by:** Claude Code (5 parallel agents)

---

## Table of Contents

1. [Security](#1-security)
2. [Backend Code Quality](#2-backend-code-quality)
3. [Architecture & Patterns](#3-architecture--patterns)
4. [Database Schema](#4-database-schema)
5. [Frontend Anti-Patterns](#5-frontend-anti-patterns)
6. [Next.js Misuse & Data Fetching](#6-nextjs-misuse--data-fetching)
7. [Testing & DevOps Gaps](#7-testing--devops-gaps)
8. [Fix Roadmap](#8-fix-roadmap)

---

## 1. Security

### CRITICAL

#### 1.1 Business Routes Have Zero Authentication

**File:** `apps/backend/src/routes/business.routes.ts`

The `/business/me`, `/business/me/stats`, and `/business/me/users` endpoints have no `authenticate` middleware. Any unauthenticated request can access and modify business data.

```typescript
// CURRENT — no auth
router.get('/me', BusinessController.getMe)
router.patch('/me', BusinessController.updateMe)
router.get('/me/stats', BusinessController.getStats)
router.post('/me/users', BusinessController.inviteUser)
```

**Fix:**

```typescript
import { authenticate } from '../middleware/auth'

router.use(authenticate)
router.get('/me', BusinessController.getMe)
router.patch('/me', BusinessController.updateMe)
router.get('/me/stats', BusinessController.getStats)
router.post('/me/users', BusinessController.inviteUser)
```

---

#### 1.2 Webhook Endpoint With Zero Security

**Files:** `apps/backend/src/routes/webhooks.routes.ts`, `apps/backend/src/controllers/webhook.controller.ts`

`POST /webhooks/whatsapp` accepts any request with no authentication, no rate limiting, no signature verification. `verifyWebhook()` returns `req.query['hub.challenge']` without validating it's a legitimate Meta webhook. An attacker can submit arbitrary webhook events, potentially creating fake orders, payments, or messages.

```typescript
// CURRENT — wide open
router.get('/whatsapp', WebhookController.verifyWebhook)
router.post('/whatsapp', WebhookController.handleWebhook)
```

**Fix:**

```typescript
import crypto from 'crypto'

const verifyMetaSignature = (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-hub-signature-256'] as string
    if (!signature) return res.status(401).send('Missing signature')

    const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', env.META_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return res.status(403).send('Invalid signature')
    }
    next()
}

router.post('/whatsapp', verifyMetaSignature, WebhookController.handleWebhook)
```

Also add idempotency deduplication by `waId` before processing.

---

#### 1.3 WebSocket CORS Open to All Origins

**File:** `apps/backend/src/lib/websocket.ts:16`

```typescript
// CURRENT
cors: { origin: '*' }
```

Any website can establish WebSocket connections. JWT verification happens after connection, allowing reconnaissance and cross-site WebSocket hijacking.

**Fix:**

```typescript
cors: {
    origin: env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}
```

---

#### 1.4 Validation Middleware Missing Return After Error

**File:** `apps/backend/src/middleware/validate.ts:10`

The error response on validation failure does NOT return early. Execution continues to `next()`, causing double responses.

```typescript
// CURRENT
catch (err: any) {
    res.status(400).json({ error: 'Datos inválidos', details: err.errors })
    // Missing return — falls through to next()
}
```

**Fix:**

```typescript
catch (err: any) {
    return res.status(400).json({ error: 'Datos inválidos', details: err.errors })
}
```

---

#### 1.5 Payment Verify/Reject Missing Role Authorization

**File:** `apps/backend/src/routes/payments.routes.ts:11-12`

`PATCH /payments/:id/verify` and `PATCH /payments/:id/reject` have no role-based access control. Any authenticated user (including AGENT role) can approve/reject payments. Employees can approve fraudulent payments without owner oversight.

```typescript
// CURRENT — any authenticated user
router.patch('/:id/verify', authenticate, verifyPayment)
router.patch('/:id/reject', authenticate, rejectPayment)
```

**Fix:**

```typescript
import { requireRole } from '../middleware/auth'
import { Role } from '@ventasve/database'

router.patch('/:id/verify', authenticate, requireRole([Role.OWNER]), verifyPayment)
router.patch('/:id/reject', authenticate, requireRole([Role.OWNER]), rejectPayment)
```

---

#### 1.6 JWT Stored in localStorage (XSS Vulnerable)

**File:** `apps/frontend/src/lib/auth/storage.ts`

Access tokens stored in `window.localStorage` are readable by any JavaScript on the page. A single XSS vulnerability leaks all user tokens.

```typescript
// CURRENT
export const setAccessToken = (token: string | null) => {
    memoryToken = token
    if (typeof window === 'undefined') return
    try {
        if (!token) {
            window.localStorage.removeItem(STORAGE_KEY)
        } else {
            window.localStorage.setItem(STORAGE_KEY, token)  // XSS can read this
        }
    } catch {}
}
```

**Fix:** Move token to `httpOnly` cookie set by the backend. The frontend should never touch the token directly.

Backend `auth.controller.ts`:
```typescript
res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000  // 15 min
})
```

Frontend `client.ts`: Remove all localStorage token logic. Cookies are sent automatically with `credentials: 'include'`.

---

### HIGH

#### 1.7 No Rate Limiting on Refresh Token Endpoint

**File:** `apps/backend/src/routes/auth.routes.ts:24`

`POST /auth/refresh` has no rate limiting, allowing brute force attempts on refresh tokens.

**Fix:**

```typescript
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos. Intenta en 15 minutos.' }
})
router.post('/refresh', refreshLimiter, AuthController.refresh)
```

---

#### 1.8 Public Order Creation Has No Rate Limiting

**File:** `apps/backend/src/routes/catalog.routes.ts:19`

`POST /catalog/:slug/orders` is a public endpoint with no rate limiting. Attackers can flood orders.

**Fix:**

```typescript
const publicOrderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Demasiados pedidos. Intenta en un minuto.' }
})
router.post('/:slug/orders', publicOrderLimiter, CatalogController.createOrder)
```

---

#### 1.9 Missing Role Checks on Product Management

**File:** `apps/backend/src/routes/products.routes.ts`

Only delete requires `Role.OWNER`. Create, update, and image upload have no role check — any AGENT user can modify the catalog.

**Fix:**

```typescript
router.post('/', authenticate, requireRole([Role.OWNER]), ProductsController.createProduct)
router.patch('/:id', authenticate, requireRole([Role.OWNER]), ProductsController.updateProduct)
router.post('/:id/images', authenticate, requireRole([Role.OWNER]), ProductsController.uploadImages)
router.delete('/:id', authenticate, requireRole([Role.OWNER]), ProductsController.deleteProduct)
```

---

#### 1.10 No CSRF Protection

**File:** `apps/backend/src/app.ts`

No CSRF token validation on state-changing operations. Attackers can trick authenticated users into performing unwanted actions.

**Fix:** Since the frontend uses an API client (not forms), the simplest fix is to require a custom header that browsers won't send from cross-origin forms:

```typescript
// Middleware: require X-Requested-With header on mutating requests
const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
        if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
            return res.status(403).json({ error: 'Forbidden', code: 'CSRF_FAILED' })
        }
    }
    next()
}
app.use('/api', csrfProtection)
```

Frontend `client.ts`:
```typescript
const api = axios.create({
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
})
```

---

#### 1.11 Helmet Configuration Too Permissive

**File:** `apps/backend/src/app.ts:25-27`

```typescript
// CURRENT
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
```

**Fix:**

```typescript
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', env.CLOUDFLARE_R2_PUBLIC_URL || '']
        }
    }
}))
```

---

#### 1.12 Missing Query Parameter Bounds

**Files:** `apps/backend/src/controllers/chat.controller.ts:12-13`, `payments.controller.ts:33-34`

Query parameters `page` and `limit` are parsed without max bounds. A user can request `limit=999999999` and exhaust server memory.

**Fix:** Add `max` to all Zod pagination schemas:

```typescript
const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
})
```

---

## 2. Backend Code Quality

### 2.1 Massive Controller Boilerplate (try/catch + auth check repeated 30+ times)

**Files:** Every controller file

Every single handler repeats the same 10-line block:

```typescript
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest       // repeated in every handler
        const user = authReq.user                 // repeated in every handler
        if (!user || !user.businessId) {          // repeated in every handler
            return res.status(401).json({         // repeated in every handler
                error: 'Not authenticated',
                code: 'ORDERS_NOT_AUTHENTICATED'
            })
        }
        const businessId = user.businessId        // repeated in every handler
        // ... actual logic (3-5 lines) ...
    } catch (error) {                             // repeated in every handler
        next(error)                               // repeated in every handler
    }
}
```

`payments.controller.ts` is 270 lines where the same 8-line auth check + try/catch appears **6 times**. The actual business logic in each handler is only 3-5 lines.

**Fix:** Create a handler wrapper that eliminates all boilerplate:

```typescript
// lib/handler.ts
type AuthHandler<T> = (ctx: {
    businessId: string
    userId: string
    role: Role
    body: unknown
    query: Record<string, string>
    params: Record<string, string>
    req: Request
}) => Promise<T>

export function authed<T>(handler: AuthHandler<T>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as AuthRequest).user
            if (!user?.businessId) {
                return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' })
            }
            const result = await handler({
                businessId: user.businessId,
                userId: user.userId,
                role: user.role,
                body: req.body,
                query: req.query as Record<string, string>,
                params: req.params,
                req
            })
            if (result === undefined || result === null) {
                return res.status(204).send()
            }
            return res.json({ data: result })
        } catch (error) {
            next(error)
        }
    }
}

// With status code variant
export function authedWithStatus<T>(status: number, handler: AuthHandler<T>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as AuthRequest).user
            if (!user?.businessId) {
                return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' })
            }
            const result = await handler({ /* same */ })
            return res.status(status).json({ data: result })
        } catch (error) {
            next(error)
        }
    }
}
```

Then controllers become one-liners:

```typescript
// orders.controller.ts — BEFORE: 128 lines, AFTER: 25 lines

export const getOrders = authed(async ({ businessId, query }) => {
    const parsed = listQuerySchema.parse(query)
    return ordersService.list(businessId, parsed)
})

export const createOrder = authedWithStatus(201, async ({ businessId, body }) => {
    const data = createOrderSchema.parse(body)
    return ordersService.create({ ...data, businessId })
})

export const getOrderById = authed(async ({ businessId, params }) => {
    return ordersService.getById(businessId, params.id)
})

export const deleteOrder = authed(async ({ businessId, params }) => {
    await ordersService.delete(businessId, params.id)
    return null  // returns 204
})
```

---

### 2.2 Business Logic Leaking Into Controllers

**Files:** `controllers/payments.controller.ts:179-188`, `controllers/chat.controller.ts:76-157`

The payments controller directly queries the database, updates order status, and emits WebSocket events — all of which should be in a service:

```typescript
// payments.controller.ts:179-188 — logic that belongs in a service
if (data.status === 'VERIFIED') {
    const order = await prisma.order.update({
        where: { id: updated.orderId },
        data: { status: 'CONFIRMED' as any }  // ← also an `any` cast
    })
    emitToBusiness(businessId, 'order_status_changed', {
        orderId: order.id,
        status: order.status
    })
}
```

`chat.controller.ts` creates messages in the DB directly (lines 76-124) and updates conversation status (lines 126-157).

**Fix:** Extract into service methods:

```typescript
// services/payments.service.ts
export class PaymentsService {
    async verify(businessId: string, paymentId: string, verifiedBy: string) {
        return this.db.$transaction(async (tx) => {
            const payment = await tx.payment.findFirst({
                where: { id: paymentId, order: { businessId } }
            })
            if (!payment) throw Errors.NotFound('Pago')

            const updated = await tx.payment.update({
                where: { id: paymentId },
                data: { status: 'VERIFIED', verifiedBy, verifiedAt: new Date() }
            })

            await tx.order.update({
                where: { id: updated.orderId },
                data: { status: OrderStatus.CONFIRMED }
            })

            return updated
        })
    }
}
```

---

### 2.3 console.log Instead of Logger (8 Locations)

**Files and lines:**

| File | Line | Code |
|------|------|------|
| `server.ts` | 14-15 | `console.log()` for startup |
| `middleware/auth.ts` | 75 | Logs user email on auth |
| `controllers/settings.controller.ts` | 269, 419, 432 | `console.log/error` |
| `controllers/chat.controller.ts` | 116 | `console.error('Error enviando WhatsApp:', error)` |
| `services/whatsapp.service.ts` | 46, 57 | `console.error` in async handlers |
| `services/notifications.service.ts` | 89 | `console.error('Error enviando WhatsApp', error)` |

The project has `pino` installed and a `lib/logger.ts` but most code ignores it.

**Fix:** Replace all `console.*` with the logger instance:

```typescript
// Instead of:
console.error('Error enviando WhatsApp', error)

// Use:
import { logger } from '../lib/logger'
logger.error({ error }, 'Error enviando WhatsApp')
```

---

### 2.4 Silent Error Swallowing

**File:** `apps/backend/src/services/whatsapp.service.ts:199-200`

```typescript
catch {
    // completely empty — errors vanish
}
```

**Fix:**

```typescript
catch (error) {
    logger.error({ error, businessId }, 'Failed to disconnect WhatsApp socket')
}
```

---

### 2.5 Excessive `any` Usage (20+ Instances)

Key offenders:

| File | Line | Code |
|------|------|------|
| `app.ts` | 19-20 | `(req as any).requestId`, `(req as any).log` |
| `error-handler.ts` | 5 | `err: any` parameter |
| `orders.service.ts` | 106, 205 | `variantSelected: item.variantSelected as any`, `const where: any` |
| `products.service.ts` | 12, 24, 73 | `variants?: any`, `attributes?: any`, `const where: any` |
| `payments.controller.ts` | 31, 39, 182 | `(req as any).log`, `const where: any`, `status: 'CONFIRMED' as any` |
| `auth.service.ts` | 33 | `businessType: any` |

**Fix for Request extensions:**

```typescript
// types/express.d.ts
import type { Logger } from 'pino'

declare global {
    namespace Express {
        interface Request {
            requestId: string
            log: Logger
            user?: {
                userId: string
                businessId: string
                role: Role
                email: string
            }
        }
    }
}
```

**Fix for Prisma where clauses:**

```typescript
// Instead of:
const where: any = { businessId }

// Use Prisma's generated types:
const where: Prisma.OrderWhereInput = { businessId }
if (query.status) where.status = query.status
```

---

### 2.6 Missing Async Error Wrapping

**File:** `apps/backend/src/controllers/whatsapp.controller.ts`

All 3 handlers have zero try/catch. Unhandled promise rejections will crash the process.

```typescript
// CURRENT — no error handling at all
export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
    const status = whatsappService.getStatus(businessId)
    res.json(status)
}
```

**Fix:** Use the `authed()` wrapper from section 2.1, or at minimum add try/catch + `next(error)`.

---

### 2.7 Missing Transactions in WhatsApp Message Handling

**File:** `apps/backend/src/services/whatsapp.service.ts:65-128`

Three separate sequential DB operations (create customer, create conversation, create message) without a transaction. If any operation fails mid-way, data becomes inconsistent.

```typescript
// CURRENT — 3 separate non-atomic operations
let customer = await prisma.customer.findFirst({...})
if (!customer) {
    customer = await prisma.customer.create({...})     // step 1
}
let conversation = await prisma.conversation.findFirst({...})
if (!conversation) {
    conversation = await prisma.conversation.create({...})  // step 2
}
const message = await prisma.message.create({...})     // step 3
```

**Fix:**

```typescript
private async handleIncomingMessage(businessId: string, msg: any) {
    const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '')
    if (!phone) return

    const content = msg.message?.conversation
        ?? msg.message?.extendedTextMessage?.text
        ?? ''
    if (!content) return

    const result = await prisma.$transaction(async (tx) => {
        let customer = await tx.customer.findFirst({ where: { businessId, phone } })
        if (!customer) {
            customer = await tx.customer.create({
                data: { businessId, phone, name: msg.pushName || 'Cliente WhatsApp' }
            })
        }

        let conversation = await tx.conversation.findFirst({
            where: { businessId, customerId: customer.id, channel: Channel.WHATSAPP }
        })
        if (!conversation) {
            conversation = await tx.conversation.create({
                data: { businessId, customerId: customer.id, channel: Channel.WHATSAPP }
            })
        }

        const message = await tx.message.create({
            data: { conversationId: conversation.id, role: MsgRole.CUSTOMER, content }
        })

        return { customer, conversation, message }
    })

    emitToBusiness(businessId, 'new_message', result)
}
```

---

### 2.8 `JWT_REFRESH_SECRET` Marked Optional

**File:** `apps/backend/src/lib/env.ts:9`

```typescript
// CURRENT
JWT_REFRESH_SECRET: z.string().min(32).optional()  // ← should be required
```

This means the server can start without a refresh secret, breaking token rotation silently.

**Fix:**

```typescript
JWT_REFRESH_SECRET: z.string().min(32)
```

---

### 2.9 Inconsistent Response Formats

Controllers return data in different shapes:

| Controller | Format |
|-----------|--------|
| `orders.controller.ts` | `res.json(result)` — raw service response |
| `payments.controller.ts` | `res.json(payment)` — no `{ data }` wrapper |
| `products.controller.ts` | `res.json(result)` — service returns `{ data, meta }` |
| `chat.controller.ts` | `res.json({ data: messages })` — no meta |

The CLAUDE.md standard is:

```typescript
// List:   { data: T[], meta: { total, page, limit, totalPages } }
// Single: { data: T }
// Delete: 204 No Content
// Error:  { error: string, code: string }
```

**Fix:** The `authed()` wrapper from section 2.1 enforces this automatically.

---

### 2.10 N+1 Query in Dashboard

**File:** `apps/backend/src/services/dashboard.service.ts:135-141`

Fetches top products then does `products.find(p => p.id === r.productId)` in a loop — O(N) per item.

**Fix:**

```typescript
const productsMap = new Map(products.map(p => [p.id, p]))
return result.map(r => ({
    ...r,
    product: productsMap.get(r.productId) ?? null
}))
```

---

## 3. Architecture & Patterns

### 3.1 No Dependency Injection — Services Tightly Coupled to Global Singletons

**Every service** imports the global `prisma` singleton and other services directly:

```typescript
// orders.service.ts
import prisma from '@ventasve/database'                        // can't swap for tests
import { exchangeRateService } from './exchange-rate.service'  // can't mock easily
import { notificationsService } from './notifications.service' // can't mock easily
import { emitToBusiness } from '../lib/websocket'              // side effect in service
```

This means:
- Tests require `jest.mock()` gymnastics at the module level
- Services can't be tested in isolation
- Circular dependency risks between services
- No way to swap implementations (e.g., mock WhatsApp for staging)

**Fix:** Constructor-based dependency injection (no framework needed):

```typescript
// services/orders.service.ts
export class OrdersService {
    constructor(
        private db: PrismaClient,
        private notifications: NotificationsService,
        private events: EventEmitter
    ) {}

    async create(input: CreateOrderInput) {
        const products = await this.db.product.findMany({...})
        // ... business logic ...
        this.events.emit(input.businessId, 'new_order', result)
        return result
    }
}

// composition-root.ts — the ONLY file that knows concrete implementations
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const redis = new Redis(env.REDIS_URL)
const events = new AppEventEmitter(io)
const exchangeRate = new ExchangeRateService(db, redis)
const whatsapp = new WhatsAppService()
const notifications = new NotificationsService(db, whatsapp, events)
const orders = new OrdersService(db, notifications, events)
const auth = new AuthService(db, env)

export const services = { orders, auth, exchangeRate, notifications, whatsapp }
```

Testing becomes trivial:

```typescript
// No jest.mock() needed
const mockDb = { order: { findFirst: jest.fn() } }
const mockNotifications = { onOrderStatusChanged: jest.fn() }
const service = new OrdersService(mockDb as any, mockNotifications, mockEvents)
```

---

### 3.2 No Result Pattern — Errors Invisible at the Type Level

Every service communicates failure by throwing. The compiler cannot enforce error handling:

```typescript
// Service throws — caller has no idea this can fail from the signature
async getById(businessId: string, id: string) {
    const order = await prisma.order.findFirst({...})
    if (!order) throw Errors.NotFound('Orden')  // ← invisible in return type
    return order
}
```

This forces every controller to wrap in try/catch (see section 2.1). It also means:
- You can't distinguish "expected business error" from "unexpected crash" at the type level
- The compiler doesn't force callers to handle the error case
- Error handling is invisible in function signatures

**Fix:** Use the `neverthrow` library for a Result pattern:

```typescript
import { Result, ok, err } from 'neverthrow'

type ServiceError = {
    type: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'UNAUTHORIZED'
    message: string
    statusCode: number
    field?: string
}

// Now the return type tells callers this can fail
async getById(businessId: string, id: string): Promise<Result<Order, ServiceError>> {
    const order = await this.db.order.findFirst({
        where: { id, businessId },
        include: { items: true, customer: true, payments: true }
    })

    if (!order) {
        return err({ type: 'NOT_FOUND', message: 'Orden no encontrada', statusCode: 404 })
    }

    return ok(order)
}
```

Controller wrapper handles both cases:

```typescript
// The handler wrapper matches on Result
export function authed<T>(handler: AuthHandler<Result<T, ServiceError>>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthRequest).user
        if (!user?.businessId) {
            return res.status(401).json({ error: 'Not authenticated' })
        }

        const result = await handler({...})

        result.match(
            (data) => {
                if (data === null) return res.status(204).send()
                return res.json({ data })
            },
            (error) => res.status(error.statusCode).json({
                error: error.message,
                code: error.type,
                field: error.field
            })
        )
    }
}
```

---

### 3.3 God Services

**`dashboard.service.ts`** handles sales calculations, product aggregations, inventory monitoring, conversion tracking, and payment analytics. Should be split into:

- `SalesAnalyticsService` — sales aggregation and revenue
- `InventoryService` — stock monitoring and alerts
- `ConversionService` — conversion rate tracking

**`whatsapp.service.ts`** handles socket management, customer creation/updating, conversation management, and message persistence. Should delegate customer/conversation/message creation to their respective services while focusing on connection state and message transport.

---

## 4. Database Schema

### CRITICAL

#### 4.1 Missing Indexes on OrderItem

**File:** `packages/database/schema.prisma:194-203`

`OrderItem` has no indexes on `orderId` or `productId`, which are heavily queried in joins and aggregations.

**Fix:**

```prisma
model OrderItem {
    id              String  @id @default(uuid())
    orderId         String
    productId       String
    quantity        Int
    unitPriceCents  Int
    variantSelected Json?
    order           Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
    product         Product @relation(fields: [productId], references: [id], onDelete: Restrict)

    @@index([orderId])
    @@index([productId])
}
```

---

#### 4.2 Missing Indexes on Payment

**File:** `packages/database/schema.prisma:205-223`

Missing indexes on `orderId` and `verifiedBy`. Queries filtering by `orderId` perform full table scans.

**Fix:**

```prisma
model Payment {
    // ... existing fields ...
    @@index([businessId, status])  // existing
    @@index([orderId])
    @@index([verifiedBy])
    @@index([createdAt])
}
```

---

#### 4.3 Session Table Missing Cascade Delete

**File:** `packages/database/schema.prisma:98-109`

When a user is deleted, sessions remain orphaned. Stale refresh tokens for deleted users are a security risk.

**Fix:**

```prisma
model Session {
    // ... existing fields ...
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

#### 4.4 ExchangeRate Missing Compound Index

**File:** `packages/database/schema.prisma:267-276`

The typical query is "get latest rate for businessId" — `findFirst({ where: { businessId }, orderBy: { date: 'desc' } })`. Current index on `date` alone is insufficient.

**Fix:**

```prisma
model ExchangeRate {
    // ... existing fields ...
    @@index([businessId, date])
    @@index([date])
}
```

---

### HIGH

#### 4.5 PaymentConfig Missing Unique Constraint

**File:** `packages/database/schema.prisma:225-236`

A business can have duplicate `PaymentConfig` records for the same payment method. Database cannot enforce the constraint.

**Fix:**

```prisma
model PaymentConfig {
    // ... existing fields ...
    @@unique([businessId, method])
}
```

---

#### 4.6 Category Missing Unique Name Per Business

A business can create duplicate categories with the same name.

**Fix:**

```prisma
model Category {
    // ... existing fields ...
    @@unique([businessId, name])
}
```

---

#### 4.7 Shipping Cost Type Mismatch

`Order.shipping_cost_cents` is `Int` (cents), but `ShippingZone.price` is `Decimal`. Type coercion required at every usage.

**Fix:** Standardize — make `ShippingZone.price` an `Int` in cents:

```prisma
model ShippingZone {
    price Int  // price in cents, not USD with decimals
}
```

---

#### 4.8 Missing Soft Delete on Message

Unlike Product, Order, and Payment, the `Message` table has no `deletedAt` field. Messages with sensitive info must be hard-deleted, losing audit trail.

**Fix:**

```prisma
model Message {
    // ... existing fields ...
    deletedAt DateTime?
    @@index([conversationId, deletedAt])
}
```

---

#### 4.9 Connection Pool Not Configured

**File:** `packages/database/src/index.ts:8-14`

```typescript
// CURRENT — defaults to 10 connections, no timeout config
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
})
```

**Fix:**

```typescript
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
})
```

---

#### 4.10 Missing Conversation Index for Channel Queries

Dashboard queries conversations by `[businessId, channel]` for conversion metrics, but only `[businessId, status]` is indexed.

**Fix:**

```prisma
model Conversation {
    // ... existing fields ...
    @@index([businessId, status])   // existing
    @@index([businessId, channel])  // add this
}
```

---

## 5. Frontend Anti-Patterns

### 5.1 The useState + useEffect Fetch Pattern (28+ Instances)

The exact same pattern is copy-pasted across **every dashboard page**:

```typescript
'use client'
export default function SomePage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/something')
                setData(res.data)
            } catch {
                setError('Error message')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) return <Spinner />
    if (error) return <p>{error}</p>
    // ... render
}
```

**Files affected** (every one repeats this):

| File | Count | Extra Issues |
|------|-------|-------------|
| `dashboard/layout.tsx` | 2 | Silent `.catch(() => {})` |
| `dashboard/page.tsx` | 2 | Artificial `setTimeout` loading |
| `dashboard/products/page.tsx` | 1 | No pagination |
| `dashboard/products/[id]/page.tsx` | 1 | Token check inside useEffect |
| `dashboard/orders/page.tsx` | 1 | Race conditions on filter change |
| `dashboard/orders/[id]/page.tsx` | 1 | 7 useState calls |
| `dashboard/customers/page.tsx` | 1 | Manual debounce with useRef |
| `dashboard/customers/[id]/page.tsx` | 1 | 15+ useState calls |
| `dashboard/payments/page.tsx` | 1 | WebSocket + API state conflict |
| `dashboard/categories/page.tsx` | 1 | Manual refetch after mutations |
| `dashboard/reports/page.tsx` | 1 | No error state shown |
| `dashboard/inbox/page.tsx` | 1 | WebSocket/API state conflict |
| `dashboard/inbox/[id]/page.tsx` | 1 | 3+ useEffects, stale closure risk |
| `dashboard/exchange-rate/page.tsx` | 1 | No caching |
| `dashboard/settings/page.tsx` | 1 | Multi-tab form with custom state |
| `[slug]/products/[id]/page.tsx` | 1 | Client-side fetch for public page |
| `[slug]/checkout/page.tsx` | 4+ | Cascading dependent fetches |

**Fix:** Install React Query and create typed hooks. See section 6 for the full migration guide.

---

### 5.2 Form State With 8-15 useState Calls

**File:** `apps/frontend/src/app/dashboard/customers/[id]/page.tsx`

```typescript
const [name, setName] = useState('')
const [phone, setPhone] = useState('')
const [email, setEmail] = useState('')
const [address, setAddress] = useState('')
const [addressNotes, setAddressNotes] = useState('')
const [identification, setIdentification] = useState('')
const [docType, setDocType] = useState('')
const [docNumber, setDocNumber] = useState('')
const [replyContent, setReplyContent] = useState('')
```

The project has `react-hook-form` installed but is not using it anywhere.

**Fix:**

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const customerSchema = z.object({
    name: z.string().min(2).max(200),
    phone: z.string().min(8),
    email: z.string().email().optional(),
    address: z.string().optional(),
    addressNotes: z.string().optional(),
    identification: z.string().optional()
})

type CustomerForm = z.infer<typeof customerSchema>

export default function CustomerDetailPage() {
    const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<CustomerForm>({
        resolver: zodResolver(customerSchema)
    })

    // When data loads:
    useEffect(() => {
        if (customer) reset(customer)
    }, [customer])

    const onSubmit = handleSubmit(async (data) => {
        await customersApi.update(id, data)
    })
}
```

This pattern applies to: `products/new/page.tsx`, `products/[id]/page.tsx`, `customers/[id]/page.tsx`, `settings/page.tsx`, `[slug]/checkout/page.tsx`.

---

### 5.3 Memory Leaks in Image Handling

**File:** `apps/frontend/src/app/dashboard/products/[id]/page.tsx`

```typescript
const previews = files.map(file => URL.createObjectURL(file))
// ← these object URLs accumulate in memory and are never freed
```

**Fix:**

```typescript
useEffect(() => {
    const urls = newImages.map(file => URL.createObjectURL(file))
    setPreviews(urls)

    return () => {
        urls.forEach(url => URL.revokeObjectURL(url))
    }
}, [newImages])
```

---

### 5.4 WebSocket + API State Conflicts

**Files:** `dashboard/inbox/page.tsx`, `dashboard/payments/page.tsx`

Pages load initial data from API, then update from WebSocket events. If a WebSocket event arrives during the initial fetch, state becomes inconsistent. Neither page guards against this.

**Fix with React Query:**

```typescript
// WebSocket events update the query cache directly
const queryClient = useQueryClient()

useWebSocket('new_payment', (payment) => {
    queryClient.setQueryData(['payments', { status: 'PENDING' }], (old) => ({
        ...old,
        data: [payment, ...(old?.data ?? [])]
    }))
})
```

---

### 5.5 Race Conditions on Filter Changes

**File:** `apps/frontend/src/app/dashboard/orders/page.tsx`

```typescript
useEffect(() => {
    const load = async () => {
        setLoading(true)
        const res = await ordersApi.list({ page, status: statusFilter })
        setOrders(res.data.data)  // ← if user changes filter fast, old response overwrites new
    }
    load()
}, [page, statusFilter])
```

If the user clicks PENDING then CONFIRMED quickly, the PENDING response may arrive after CONFIRMED and overwrite correct data.

React Query handles this automatically (stale queries are discarded). Manual fix:

```typescript
useEffect(() => {
    const abortController = new AbortController()
    const load = async () => {
        setLoading(true)
        try {
            const res = await ordersApi.list({ page, status: statusFilter }, abortController.signal)
            setOrders(res.data.data)
        } catch (e) {
            if (!abortController.signal.aborted) setError('Error')
        } finally {
            if (!abortController.signal.aborted) setLoading(false)
        }
    }
    load()
    return () => abortController.abort()
}, [page, statusFilter])
```

---

### 5.6 Duplicate Type Definitions

The `Order` type is defined inline in `orders/page.tsx`, `orders/[id]/page.tsx`, `dashboard/page.tsx`, and possibly the API client. Changes to the backend require updating 4+ places.

**Fix:** Create shared type files:

```typescript
// lib/types/order.ts
export type Order = {
    id: string
    orderNumber: number | null
    status: OrderStatus
    totalCents: number
    exchangeRate: number | null
    customer: Customer
    items: OrderItem[]
    payments: Payment[]
    createdAt: string
}
```

Import everywhere instead of redefining.

---

### 5.7 No Error Boundaries

No error boundaries exist. If any component throws during render, the entire page crashes with a white screen.

**Fix:**

```typescript
// components/ErrorBoundary.tsx
'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
    state = { hasError: false }

    static getDerivedStateFromError() { return { hasError: true } }

    componentDidCatch(error: Error) {
        console.error('ErrorBoundary caught:', error)
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div className="p-8 text-center">
                    <p>Algo salió mal. Recarga la página.</p>
                </div>
            )
        }
        return this.props.children
    }
}
```

Wrap in `dashboard/layout.tsx`:

```typescript
<ErrorBoundary>
    {children}
</ErrorBoundary>
```

---

### 5.8 Hardcoded Status Labels Duplicated Everywhere

Status label maps are copy-pasted in `orders/page.tsx`, `orders/[id]/page.tsx`, `dashboard/page.tsx`:

```typescript
// Duplicated in 3+ files
const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    PREPARING: 'Preparando',
    SHIPPED: 'Enviada',
    DELIVERED: 'Entregada',
    CANCELLED: 'Cancelada'
}
```

**Fix:** Create `lib/constants/status.ts` and import everywhere.

---

### 5.9 Missing Accessibility

Interactive elements use `<div>` and `<span>` with `onClick` instead of `<button>`. Missing `aria-label` on icon-only buttons. Missing keyboard navigation.

```typescript
// CURRENT
<div className="cursor-pointer" onClick={handleClick}>
    <span>x</span>
</div>

// FIX
<button type="button" aria-label="Cerrar" onClick={handleClick}>
    <span>x</span>
</button>
```

---

### 5.10 API Base URL Duplicated in 3+ Files

```typescript
// Repeated in layout.tsx, products/page.tsx, [slug]/page.tsx
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
const apiBaseUrl = new URL(API_BASE)
const IMAGE_BASE_ORIGIN = `${apiBaseUrl.protocol}//${apiBaseUrl.host}`
```

**Fix:** Create `lib/config.ts`:

```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
export const IMAGE_BASE_ORIGIN = (() => {
    const url = new URL(API_BASE)
    return `${url.protocol}//${url.host}`
})()
```

---

## 6. Next.js Misuse & Data Fetching

### 6.1 The Core Problem: Paying for Next.js But Getting SPA Behavior

Every dashboard page is `"use client"`. The server renders an empty shell, ships JavaScript to the browser, then the browser fetches data from Express. This creates a waterfall:

```
1. Browser requests page
2. Next.js server sends empty HTML + JS bundle
3. Browser downloads and executes JS
4. React mounts, useEffect runs
5. Browser fetches data from Express API
6. Data arrives, React re-renders with content
```

The public catalog (`[slug]/page.tsx`) is the **only** Server Component doing the right thing:

```typescript
// This is CORRECT — data fetched on server, streamed to client
export default async function CatalogPage({ params }) {
    const [businessRes, productsRes] = await Promise.all([
        catalogApi.getBusiness(slug),
        catalogApi.getProducts(slug)
    ])
    return <CatalogView business={business} products={products} />
}
```

### 6.2 React Query Migration Guide

**Step 1: Install**

```bash
pnpm add @tanstack/react-query --filter @ventasve/frontend
```

**Step 2: Create QueryProvider**

```typescript
// lib/providers/QueryProvider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
    const [client] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,         // 30 seconds before refetch
                retry: 1,
                refetchOnWindowFocus: false
            }
        }
    }))

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

Add to `dashboard/layout.tsx`:

```typescript
import { QueryProvider } from '@/lib/providers/QueryProvider'

export default function DashboardLayout({ children }) {
    return (
        <QueryProvider>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </QueryProvider>
    )
}
```

**Step 3: Create typed query hooks**

```typescript
// lib/queries/orders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '../api/orders'

export function useOrders(params: { page?: number; status?: string }) {
    return useQuery({
        queryKey: ['orders', params],
        queryFn: () => ordersApi.list(params)
    })
}

export function useOrder(id: string) {
    return useQuery({
        queryKey: ['orders', id],
        queryFn: () => ordersApi.get(id),
        enabled: !!id
    })
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            ordersApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        }
    })
}
```

```typescript
// lib/queries/products.ts
export function useProducts(params: { page?: number; search?: string; categoryId?: string }) {
    return useQuery({
        queryKey: ['products', params],
        queryFn: () => productsApi.list(params)
    })
}

export function useProduct(id: string) {
    return useQuery({
        queryKey: ['products', id],
        queryFn: () => productsApi.get(id),
        enabled: !!id
    })
}

export function useCreateProduct() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: CreateProductInput) => productsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        }
    })
}

export function useDeleteProduct() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => productsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        }
    })
}
```

```typescript
// lib/queries/payments.ts
export function usePayments(params: { page?: number; status?: string }) {
    return useQuery({
        queryKey: ['payments', params],
        queryFn: () => paymentsApi.list(params)
    })
}

export function useVerifyPayment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
            paymentsApi.verify(id, { status, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] })
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        }
    })
}
```

**Step 4: Page migration example (Orders)**

Before (50+ lines of state management):

```typescript
export default function OrdersPage() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState()

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await ordersApi.list({ page, status: statusFilter })
                setOrders(res.data.data)
            } catch {
                setError('No se pudieron cargar')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [page, statusFilter])

    // ... 80 more lines ...
}
```

After (data management in ~5 lines):

```typescript
export default function OrdersPage() {
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState<string>()

    const { data, isLoading, error } = useOrders({ page, status: statusFilter })
    const updateStatus = useUpdateOrderStatus()

    if (isLoading) return <OrdersSkeleton />
    if (error) return <ErrorMessage message="No se pudieron cargar las órdenes" />

    const { data: orders, meta } = data

    // ... just rendering, no state management ...
}
```

---

### 6.3 Missing SEO on Public Pages

**File:** `apps/frontend/src/app/[slug]/page.tsx`

The public catalog page has no `generateMetadata` function. When shared on WhatsApp (the primary channel), it shows a generic title.

**Fix:**

```typescript
import type { Metadata } from 'next'

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
    const { slug } = await params
    const business = await catalogApi.getBusiness(slug)

    return {
        title: `${business.name} | VentasVE`,
        description: business.description || `Catálogo de ${business.name}`,
        openGraph: {
            title: business.name,
            description: business.description || `Compra en ${business.name}`,
            images: business.logoUrl ? [business.logoUrl] : [],
            type: 'website'
        }
    }
}
```

---

### 6.4 Images Using `unoptimized={true}`

Multiple pages use `<Image unoptimized />` which defeats the purpose of `next/image`:

**Fix:** Configure Next.js to handle remote images:

```typescript
// next.config.ts
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'media.ventasve.app'
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3001'
            }
        ]
    }
}
```

Then remove `unoptimized` from all `<Image>` components.

---

## 7. Testing & DevOps Gaps

### CRITICAL

#### 7.1 No CI/CD Pipeline

No GitHub Actions, GitLab CI, or any CI configuration exists. Code can be merged without running tests.

**Fix:** Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

---

#### 7.2 No Docker Compose for Local Development

No `docker-compose.yml` exists. The CLAUDE.md references PostgreSQL and Redis but there's no way to spin them up.

**Fix:** Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ventasve
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ventasve_dev
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

---

#### 7.3 Zero Frontend Tests

`apps/frontend/` has no test files, no test config, and no `test` script in `package.json`.

**Fix:**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom --filter @ventasve/frontend
```

Add to `apps/frontend/package.json`:

```json
"scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
}
```

---

#### 7.4 ~55% of Backend Logic Untested

**Missing test files for:**

| Service/Controller | Priority |
|-------------------|----------|
| `products.service.ts` | HIGH — CRUD core |
| `exchange-rate.service.ts` | HIGH — price calculations |
| `image-upload.service.ts` | MEDIUM |
| `business.controller.ts` | MEDIUM |
| `customers.controller.ts` | MEDIUM |
| `settings.controller.ts` | MEDIUM |
| `shipping-zones.controller.ts` | LOW |
| `webhook.controller.ts` | HIGH — security critical |
| `geo.controller.ts` | LOW |
| `meta.controller.ts` | LOW |

---

#### 7.5 `verbatimModuleSyntax` Not Enforced

CLAUDE.md states this is enforced, but it's missing from all `tsconfig.json` files. This means type-only imports can accidentally become value imports, causing runtime errors.

**Fix:** Add to both `apps/backend/tsconfig.json` and `apps/frontend/tsconfig.json`:

```json
{
    "compilerOptions": {
        "verbatimModuleSyntax": true
    }
}
```

---

#### 7.6 ESLint Allows `any` Types

**File:** `apps/backend/eslint.config.cjs:19-20`

```javascript
rules: {
    'no-unused-vars': 'off',  // allows dead code
    'no-undef': 'off'         // allows undefined references
}
```

No `@typescript-eslint/no-explicit-any` rule.

**Fix:**

```javascript
rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
}
```

---

### HIGH

#### 7.7 No `.env.example`

Developers don't know which environment variables are required.

**Fix:** Create `.env.example` at root with all required vars (see CLAUDE.md section 14 for the complete list).

---

#### 7.8 No Pre-commit Hooks

No `husky` or `lint-staged` setup. Bad code can be committed without any checks.

**Fix:**

```bash
pnpm add -D husky lint-staged -w
npx husky init
```

`.husky/pre-commit`:
```bash
pnpm lint-staged
```

Root `package.json`:
```json
"lint-staged": {
    "*.ts": ["eslint --fix"],
    "*.tsx": ["eslint --fix"]
}
```

---

#### 7.9 No `typecheck` Script in Root

CLAUDE.md checklist requires `pnpm typecheck` but the command doesn't exist.

**Fix:** Add to root `package.json`:

```json
"scripts": {
    "typecheck": "turbo run typecheck"
}
```

Add to backend and frontend `package.json`:

```json
"scripts": {
    "typecheck": "tsc --noEmit"
}
```

---

#### 7.10 Weak Prisma Mock

**File:** `apps/backend/src/tests/prisma-mock.ts`

Only 14 models partially mocked. Missing `createMany`, `delete`, `updateMany`, `aggregate`, `groupBy` on most models. No reusable transaction mock.

**Fix:** Create a mock factory:

```typescript
function mockModel() {
    return {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mock-id', ...data })),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({}),
        groupBy: jest.fn().mockResolvedValue([])
    }
}
```

---

#### 7.11 No `.nvmrc` for Node Version Lock

Developers might use incompatible Node versions.

**Fix:** Create `.nvmrc`:

```
20
```

---

#### 7.12 Prisma Generate Not Automated

**File:** `packages/database/package.json`

No `postinstall` script to auto-generate the Prisma client.

**Fix:**

```json
"scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate"
}
```

---

## 8. Fix Roadmap

### Phase 1 — Security (Week 1)

| # | Task | Files |
|---|------|-------|
| 1 | Add `authenticate` to business routes | `routes/business.routes.ts` |
| 2 | Add webhook signature verification | `controllers/webhook.controller.ts` |
| 3 | Fix validation middleware return | `middleware/validate.ts` |
| 4 | Add role checks to payment verify/reject | `routes/payments.routes.ts` |
| 5 | Restrict WebSocket CORS | `lib/websocket.ts` |
| 6 | Add rate limiting to refresh + public order | `routes/auth.routes.ts`, `routes/catalog.routes.ts` |
| 7 | Add role checks to product management | `routes/products.routes.ts` |
| 8 | Make `JWT_REFRESH_SECRET` required | `lib/env.ts` |

### Phase 2 — Database (Week 2)

| # | Task | Files |
|---|------|-------|
| 1 | Add missing indexes (OrderItem, Payment, ExchangeRate, Conversation) | `schema.prisma` |
| 2 | Add cascade deletes (Session, OrderItem) | `schema.prisma` |
| 3 | Add unique constraints (PaymentConfig, Category) | `schema.prisma` |
| 4 | Fix shipping cost type consistency | `schema.prisma` |
| 5 | Configure connection pool | `packages/database/src/index.ts` |

### Phase 3 — Backend Architecture (Week 3-4)

| # | Task | Files |
|---|------|-------|
| 1 | Create `authed()` handler wrapper | New: `lib/handler.ts` |
| 2 | Migrate controllers to use wrapper | All controller files |
| 3 | Install `neverthrow`, create Result types | New: `lib/result.ts` |
| 4 | Add constructor DI to one service (start with Products) | `services/products.service.ts` |
| 5 | Create composition root | New: `composition-root.ts` |
| 6 | Move payment logic from controller to service | `controllers/payments.controller.ts` → `services/payments.service.ts` |
| 7 | Add transactions to WhatsApp handling | `services/whatsapp.service.ts` |
| 8 | Replace `console.*` with logger | All service/controller files |
| 9 | Replace `any` with proper types | All files with `any` |

### Phase 4 — Frontend (Week 5-6)

| # | Task | Files |
|---|------|-------|
| 1 | Install React Query, create QueryProvider | New: `lib/providers/QueryProvider.tsx` |
| 2 | Create query hooks for all resources | New: `lib/queries/*.ts` |
| 3 | Migrate dashboard pages to use query hooks | All `dashboard/*/page.tsx` |
| 4 | Replace useState forms with react-hook-form + Zod | `customers/[id]`, `products/[id]`, `checkout` |
| 5 | Create shared type files | New: `lib/types/*.ts` |
| 6 | Add ErrorBoundary to dashboard layout | `dashboard/layout.tsx` |
| 7 | Add SEO metadata to public pages | `[slug]/page.tsx` |
| 8 | Configure remote images in next.config | `next.config.ts` |
| 9 | Migrate JWT from localStorage to httpOnly cookies | Backend + `lib/auth/storage.ts` |
| 10 | Centralize constants (status labels, API base URL) | New: `lib/constants/*.ts`, `lib/config.ts` |

### Phase 5 — Testing & DevOps (Week 7-8)

| # | Task | Files |
|---|------|-------|
| 1 | Create `docker-compose.yml` | Root |
| 2 | Create `.env.example` | Root |
| 3 | Create GitHub Actions CI pipeline | `.github/workflows/ci.yml` |
| 4 | Add `typecheck` script to turbo pipeline | `turbo.json`, `package.json` |
| 5 | Enforce `verbatimModuleSyntax` | All `tsconfig.json` |
| 6 | Enable strict ESLint rules | `eslint.config.cjs` |
| 7 | Set up husky + lint-staged | Root |
| 8 | Write missing service tests | `tests/*.test.ts` |
| 9 | Set up frontend testing with Vitest | `apps/frontend/` |
| 10 | Create `.nvmrc` | Root |
| 11 | Add `postinstall` Prisma generate | `packages/database/package.json` |
