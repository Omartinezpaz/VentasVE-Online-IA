## Estado Global del Proyecto

- **Stack real** coincide con la arquitectura: monorepo pnpm, `apps/backend` (Express + TS + Zod), `packages/database` (Prisma) y `apps/frontend` (Next.js App Router) con catálogo público, checkout y dashboard inicial (órdenes, clientes, inbox WhatsApp).
- **Semana 1–2 (Auth, registro, productos)**: implementada en backend (auth + registro + modelos base).
- **Semana 3–4 (CRUD productos + imágenes)**: CRUD implementado y subida de imágenes funcional a nivel backend (almacenamiento local, pendiente pulir para producción).
- **Pedidos, pagos (base), catálogo público API, chatbot WhatsApp, inbox y métricas**: implementados a nivel backend en un primer MVP; frontend ya cubre catálogo público, creación de pedidos, listado/detalle de órdenes y inbox WhatsApp, faltan pagos, métricas y pulido.

Estimación de avance del **MVP técnico total** (backend + frontend + bot + dashboard):  
**≈ 65%** (backend de negocio avanzado y frontend con catálogo, pedidos e inbox funcionales).

---

## Checklist Maestro

### Autenticación y Cuenta
- [x] Auth backend básico — Estado: ✅ — Fecha: Semana 1–2
- [x] Modelos User/Business en Prisma — Estado: ✅ — Fecha: realizada
 - [x] Hardening Refresh Token (rotación + detección reutilización) — Estado: ✅ — Fecha: Semana 1–2
- [x] Registro Business + Owner en una transacción — Estado: ✅ — Fecha: Semana 1–2
- [ ] Roles y autorización fina (`requireRole`) — Estado: ⏳ — Fecha: Semana 2–3

### Productos (Catálogo interno)
- [x] CRUD productos en backend — Estado: ✅ — Fecha: Semana 2–3
- [x] Validación Zod en controllers — Estado: ✅ — Fecha: Semana 2–3
- [x] Rutas protegidas con `authenticate` — Estado: ✅ — Fecha: Semana 2–3
- [x] Subida de imágenes (almacenamiento local) — Estado: ✅ — Fecha: Semana 3–4
- [ ] Migrar imágenes a R2/S3/Cloudinary — Estado: ⏳ — Fecha: Semana 3–4
- [ ] Normalizar `variants`/`attributes` por ramo — Estado: ⚠️ — Fecha: Semana 4–5
- [ ] Políticas de inventario e integración con pedidos — Estado: ⏳ — Fecha: Semana 5–6

### Catálogo Público (Frontend + API pública)
- [x] Crear `apps/frontend` (Next.js App Router) — Estado: ✅ — Fecha: Semana 3–4
- [x] API pública por `slug` (`/catalog/:slug`) — Estado: ✅ — Fecha: Semana 3–4
- [ ] Doble moneda en UI con tasa de cambio — Estado: ❌ — Fecha: Semana 4–5

### Pedidos y Pagos
- [x] Diseño de modelos Orders/Payments (arquitectura) — Estado: ✅ — Fecha: diseño previo
- [x] Modelos Prisma: `orders`, `order_items`, `payments`, `exchange_rates` — Estado: ✅ — Fecha: Semana 5
- [x] Services/controllers de pedidos — Estado: ✅ — Fecha: Semana 5–6
- [ ] Flujo de pagos venezolanos (comprobantes, verificación) — Estado: ❌ — Fecha: Semana 7–8
- [ ] Configuración de métodos de pago por negocio — Estado: ⏳ — Fecha: Semana 6–7

### Chatbot + Inbox
- [x] Arquitectura `conversations`/`messages` definida — Estado: ✅ — Fecha: diseño previo
- [x] Integración Baileys (MVP bot) — Estado: ✅ — Fecha: Semana 11–12 (adelantado)
- [x] Backend Inbox Unificado — Estado: ✅ — Fecha: Semana 11–13 (adelantado)
- [x] Panel Chatbot en frontend (Inbox WhatsApp) — Estado: ✅ — Fecha: Semana 12–14 (adelantado)

### Dashboard y Métricas
- [x] Diseño del dashboard (objetivo) — Estado: ✅ — Fecha: diseño previo
- [ ] Implementar dashboard Next.js — Estado: ⏳ — Fecha: Semana 9–10
- [x] Endpoints de métricas agregadas — Estado: ✅ — Fecha: Semana 9–10

---

## Módulo: Autenticación y Cuenta

### Tareas realizadas

1. **Auth backend básico**  
   - **Estado:** ✅  
   - **Descripción:** Implementado módulo de autenticación en backend:
     - Middleware `authenticate` que extrae `businessId`, `userId`, `role` del JWT.
     - Servicios de auth con login/registro (según contexto previo).  
   - **Fecha estimada de ejecución:** ya realizada (semana 1–2 del roadmap técnico).

2. **Modelo de usuarios y businesses en Prisma**  
   - **Estado:** ✅  
   - **Descripción:** En `packages/database/schema.prisma` existen modelos `User`, `Business` con relación `businessId`, roles (`OWNER | AGENT | SUPER_ADMIN`) y soft delete donde aplica.  
   - **Fecha estimada:** ya realizada.

### Tareas pendientes (ordenadas por prioridad y dependencia)

1. **Hardening del flujo de Refresh Token**  
   - **Estado:** ⏳  
   - **Descripción:** Implementar completamente el patrón descrito en `ventas-ve-arquitectura.md`: refresh token opaco en DB + detección de reutilización + rotación segura.  
   - **Dependencias:** Modelo de `sessions`/`refresh_tokens` en Prisma.  
   - **Fecha estimada:** Semana 1–2 (regularizar ahora, antes de abrir el sistema a testers).

2. **Registro de negocio + usuario owner en transacción**  
   - **Estado:** ⚠️ (parcial / por revisar)  
   - **Descripción:** Verificar que el endpoint de registro haga exactamente `business + user` dentro de `prisma.$transaction` como marca CLAUDE/arquitectura. Si aún no está así, refactorizarlo.  
   - **Dependencias:** Modelos `Business`, `User`.  
   - **Fecha estimada:** Semana 1–2 (ajuste inmediato).

3. **Roles y middlewares de autorización fina**  
   - **Estado:** ⏳  
   - **Descripción:** Implementar `requireRole('OWNER' | 'AGENT')` y aplicarlo a rutas sensibles (ej. eliminación de productos, configuración de pagos, usuarios, etc.).  
   - **Dependencias:** Middleware `authenticate`, campo `role` en JWT.  
   - **Fecha estimada:** Semana 2–3.

---

## Módulo: Productos (Catálogo interno del negocio)

### Tareas realizadas

1. **CRUD de productos (backend)**  
   - **Estado:** ✅  
   - **Descripción:**  
     - `products.service.ts` con métodos `create`, `findAll`, `findOne`, `update`, `delete` (soft delete) y `updateStock`.  
     - Siempre filtra por `businessId` + `deletedAt: null`, respetando multi-tenant y soft delete.  
     - `priceUsdCents` (Int) como fuente de verdad para precios.  
   - **Fecha estimada:** Semana 2–3 (ya implementado en la realidad del repo).

2. **Validación Zod en controllers**  
   - **Estado:** ✅  
   - **Descripción:** `products.controller.ts` valida body, query y params con Zod (`productSchema`, `querySchema`), controller fino que delega en services, alineado con CLAUDE.md.  
   - **Fecha estimada:** Semana 2–3.

3. **Rutas protegidas de productos**  
   - **Estado:** ✅  
   - **Descripción:** `products.routes.ts` registra endpoints REST (`GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/stock`) bajo `router.use(authenticate)`.  
   - **Fecha estimada:** Semana 2–3.

4. **Subida de imágenes de productos (backend)**  
   - **Estado:** ✅  
   - **Descripción:**  
     - Servicio `image-upload.service.ts` con `multer` y almacenamiento local en `uploads/products`.  
     - Endpoint `POST /api/products/:id/images` usando `upload.array('images', 5)` + actualización de `product.images` en DB.  
   - **Fecha estimada:** Semana 3–4 (ya adelantado).

### Tareas pendientes

1. **Refinamiento del flujo de imágenes para producción**  
   - **Estado:** ⏳  
   - **Descripción:** Cambiar almacenamiento local a provider real (Cloudflare R2 / S3 / Cloudinary) como define `ventas-ve-arquitectura.md` (R2). Ajustar `images` para almacenar URLs públicas.  
   - **Dependencias:** Config de credenciales, librería de cliente del storage elegido, variables de entorno.  
   - **Fecha estimada:** Semana 3–4.

2. **Normalización y validación de variantes/atributos**  
   - **Estado:** ⚠️  
   - **Descripción:** Actualmente `variants` y `attributes` son `JSON` genérico. Falta definir patrones por ramo (ej. comida: tamaño, proteínas; moda: talla, color) y schemas Zod específicos.  
   - **Dependencias:** Definición de UX del catálogo y filtros del frontend.  
   - **Fecha estimada:** Semana 4–5.

3. **Límites y políticas de inventario**  
   - **Estado:** ⏳  
   - **Descripción:** Reglas de negocio para stock: mínimo 0, reservaciones con pedidos pendientes, manejo de sobreventa, etc. En backend aún no se conecta con pedidos.  
   - **Dependencias:** Módulo de pedidos (`orders`, `order_items`).  
   - **Fecha estimada:** Semana 5–6.

---

## Módulo: Catálogo Público (Frontend + API pública)

### Tareas realizadas

1. **Diseño conceptual y flujo UX**  
   - **Estado:** ✅  
   - **Descripción:** `objetivo.md` y `ventas-ve-arquitectura.md` describen la página pública: mobile-first, doble moneda visible, métodos de pago delante, botón “Confirmar por WhatsApp”, filtros, carrito, etc.  
   - **Fecha estimada:** Pre-desarrollo (ya definido).

### Tareas pendientes

1. **Doble moneda en UI**  
   - **Estado:** ❌  
   - **Descripción:** Integrar tasa de cambio (módulo `exchange_rates`) en frontend para mostrar `$` y `Bs` en todas las tarjetas y resúmenes de carrito.  
   - **Dependencias:** Endpoint `GET /exchange-rate/current` estable + almacenamiento de tasas.  
   - **Fecha estimada:** Semana 4–5.

---

## Módulo: Pedidos (Orders) y Pagos

### Tareas realizadas

1. **Definición de modelo de Orders/Payments en arquitectura**  
   - **Estado:** ✅  
   - **Descripción:** `ventas-ve-arquitectura.md` define campos, enums y relaciones para `orders`, `order_items`, `payments`, `exchange_rates`.  
   - **Fecha estimada:** Diseño previo.

2. **Modelos Prisma para orders, order_items, payments, exchange_rates**  
   - **Estado:** ✅  
   - **Descripción:** Modelos añadidos a `schema.prisma` con enums y relaciones completas, incluyendo snapshot de precios y estados de pago.  
   - **Dependencias:** Migraciones aplicadas y Prisma Client regenerado.  

3. **Services y controllers de pedidos**  
   - **Estado:** ✅  
   - **Descripción:** Servicios y controladores para crear y gestionar pedidos (incluyendo creación desde catálogo público, `order_items` con snapshot de `unitPriceCents` y filtrado por `businessId`).  
   - **Dependencias:** Modelos en Prisma, products service.  

### Tareas pendientes

1. **Flujo de pagos venezolanos (Zelle, Pago Móvil, Binance, etc.)**  
   - **Estado:** ❌  
   - **Descripción:** Implementar endpoints para registrar pagos, subir comprobantes (imagen), cambiar estado `PENDING → VERIFIED/REJECTED`, y conciliar con pedidos.  
   - **Dependencias:** Models `payments`, `orders`, reuso de infraestructura de imágenes.  
   - **Fecha estimada:** Semana 7–8.

2. **Configuración de métodos de pago por negocio**  
   - **Estado:** ⏳  
   - **Descripción:** Módulo de configuración (backend y luego UI) con tarjetas de Zelle, Pago Móvil, Binance, etc., como describe `objetivo.md` y arquitectura. Endpoints básicos creados, falta pulir modelo y UX.  
   - **Dependencias:** Modelo `Business.settings` y tabla específica o JSON para métodos de pago.  
   - **Fecha estimada:** Semana 6–7.

---

## Módulo: Chatbot WhatsApp + Inbox Unificado

### Tareas realizadas

1. **Definición de arquitectura de conversaciones y mensajes**  
   - **Estado:** ✅  
   - **Descripción:** `ventas-ve-arquitectura.md` describe tablas `conversations`, `messages`, campos `channel`, `botActive`, `status`, `role`, `mediaUrl`, etc.  
   - **Fecha estimada:** Diseño previo.

2. **Integración inicial con Baileys (WhatsApp)**  
   - **Estado:** ✅  
   - **Descripción:** Servicio de WhatsApp con Baileys que conecta por negocio, recibe mensajes, crea/actualiza `conversations` y `messages` y permite enviar respuestas. Manejo básico de QR y reconexión.  
   - **Dependencias:** Modelos Prisma, servicio `whatsapp.service.ts`.  

3. **Backend Inbox Unificado**  
   - **Estado:** ✅  
   - **Descripción:** Endpoints para listar conversaciones, mensajes, enviar mensajes desde el dashboard y alternar bot/humano, más WebSockets para eventos `new_message`, `conversation_updated` y `order_status_changed`.  
   - **Dependencias:** Modelos `conversations`, `messages`, integración WebSocket.  

### Tareas pendientes

1. **Refinar panel de Chatbot en frontend**  
   - **Estado:** ⏳  
   - **Descripción:** Sobre el Inbox WhatsApp ya implementado, añadir vistas de configuración del bot, prompts y reglas de negocio por negocio, manteniendo la integración en tiempo real.  
   - **Dependencias:** Panel actual de inbox/chatbot, servicio de configuración del bot.  
   - **Fecha estimada:** Semana 12–14.

---

## Módulo: Dashboard y Métricas

### Tareas realizadas

1. **Diseño del dashboard (objetivo.md)**  
   - **Estado:** ✅  
   - **Descripción:** Definido: 4 métricas principales, lista de pedidos, breakdown de métodos de pago, inbox, panel de chatbot, etc.  
   - **Fecha estimada:** Diseño previo.

2. **Endpoints de métricas agregadas (backend)**  
   - **Estado:** ✅  
   - **Descripción:** API de métricas en backend para ingresos por rango de fechas, número de pedidos activos, pagos pendientes y conversaciones abiertas, integrada con el resto de módulos.  
   - **Dependencias:** Orders, payments, conversations implementados.  

### Tareas pendientes

1. **Implementar dashboard en frontend**  
   - **Estado:** ❌  
   - **Descripción:** Construir dashboard Next.js con widgets conectados a endpoints de métricas y a los canales en tiempo real (WebSockets).  
   - **Dependencias:** Endpoints de pedidos, pagos, conversaciones y métricas.  
   - **Fecha estimada:** Semana 9–10.

---

## Notas Técnicas Relevantes

- **Decisiones ya tomadas (y respetadas):**
  - Precios siempre en `priceUsdCents` (enteros).
  - Aislamiento estricto por `businessId` en todos los queries de productos.
  - Soft delete vía `deletedAt` en entidades core.
  - Separación clara Controller/Service.
  - Monorepo con `apps/backend` y `packages/database`.

- **Ajustes recientes en librerías:**
  - Añadido `multer` + `uuid` para subida de imágenes.
  - Type defs `@types/multer`, `@types/uuid`, `@types/bcrypt`, `@types/jsonwebtoken`.
  - Configuración de paths TS para `@ventasve/database`.

- **Endpoints nuevos/ajustados:**
  - `POST /api/products/:id/images`: subida de imágenes con `multer` y actualización de `images` en producto.
  - CRUD completo de productos bajo `/api/products` con auth.

---

## Sugerencias de Próximos Pasos (alineadas con CRM multiventas con IA)

1. **Cerrar flecos de Auth y autorización fina**  
   - Revisar middlewares de rol (`requireRole`) y aplicarlos de forma sistemática a rutas sensibles (configuración, administración de usuarios, etc.).  

2. **Pulir módulo de productos para producción**  
   - Migrar subida de imágenes a Cloudflare R2 (como marca arquitectura).  
   - Definir esquema claro para `variants` por tipo de negocio (comida vs moda).  
   - Añadir tests de servicios de productos (mínimo unitarios con Jest/tsx).  

3. **Completar flujo de pagos venezolanos**  
   - Implementar endpoints de `payments` (registro de pagos, comprobantes, estados).  
   - Conectar pagos con pedidos y con el dashboard de métricas.  

4. **Construir el dashboard en frontend**  
   - Implementar dashboard Next.js consumiendo métricas, pedidos, pagos y conversaciones, reutilizando la infraestructura de WebSockets (`new_message`, `conversation_updated`, `order_status_changed`, `new_order`).  

5. **Añadir capa de tests y observabilidad mínima**  
   - Tests básicos de servicios críticos (auth, productos, pedidos, catálogo público).  
   - Logging y trazas suficientes para depurar problemas en producción.  

Con esto, el MVP quedaría mucho más cerca de ser usable por negocios reales (backend casi completo + frontend funcional para catálogo, pedidos, pagos e inbox).
