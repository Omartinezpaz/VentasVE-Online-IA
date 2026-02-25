# Decisión de Arquitectura — Clientes Globales con Contexto por Negocio ✅

Perfecto, eso define todo. Los clientes son **globales en la plataforma** pero con **relación contextual por negocio**. Es el patrón más inteligente para multi-tenant de este tipo.

---

## 🧠 Lo que me estás describiendo

```
Cliente Juan (una sola cuenta)
├─ Compra en /tienda-A  → tiene historial, direcciones, pedidos en A
├─ Compra en /tienda-B  → tiene historial, direcciones, pedidos en B
└─ Un solo login para toda la plataforma
```

El cliente **se registra una vez**, pero su **comportamiento, historial y tipo** (`WHOLESALE`, `VIP`, etc.) puede variar por negocio.

---

## 📐 Esquema Propuesto

```prisma
// El cliente existe una sola vez en la plataforma
model Customer {
  id        String   @id @default(cuid())
  email     String   @unique        // login único global
  password  String?                 // null si usa OAuth
  name      String
  phone     String?
  avatar    String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  businessProfiles CustomerBusinessProfile[]  // contexto por negocio
  orders           Order[]
  addresses        Address[]

  @@map("customers")
}

// El perfil del cliente DENTRO de un negocio específico
model CustomerBusinessProfile {
  id         String       @id @default(cuid())
  
  customerId String
  customer   Customer     @relation(fields: [customerId], references: [id])
  
  businessId String
  business   Business     @relation(fields: [businessId], references: [id])
  
  // El tipo puede variar por negocio
  // Juan puede ser VIP en tienda-A y WHOLESALE en tienda-B
  type       CustomerType @default(REGISTERED)
  
  // Datos específicos de este negocio
  wishlist   Json?        // productos favoritos en este negocio
  notes      String?      // notas internas del negocio sobre el cliente
  
  firstSeenAt DateTime @default(now())
  lastSeenAt  DateTime @updatedAt

  @@unique([customerId, businessId])  // un perfil por negocio
  @@map("customer_business_profiles")
}

enum CustomerType {
  GUEST        // sin registro (se maneja en sesión, no en BD)
  REGISTERED   // cuenta activa
  WHOLESALE    // mayorista
  VIP          // cliente preferencial
}
```

---

## 🔄 Flujo de Registro / Login

```
Usuario entra a /tienda-A
        │
        ▼
¿Tiene cuenta global?
        │
   NO ──┤──── Registro → crea Customer + CustomerBusinessProfile(tienda-A)
        │
   SÍ ──┤──── Login  → busca CustomerBusinessProfile(tienda-A)
        │              ¿existe? → entra directo
        │              ¿no existe? → crea perfil para tienda-A automáticamente
        │
        ▼
Sesión con: { customerId, businessId, customerType }
```

---

## 🗂️ Esquema Completo hasta ahora

```
Platform
├── Business (tienda-A, tienda-B...)
│   ├── StoreUser     → OWNER, ADMIN, STAFF, VIEWER  (gestiona el negocio)
│   └── CustomerBusinessProfile → perfil del cliente en ese negocio
│
└── Customer (global)
    ├── Un solo email/password
    ├── Muchos CustomerBusinessProfile
    ├── Muchos Order (con businessId incluido)
    └── Muchas Address (reutilizables entre negocios)
```

---

## ✅ Ventajas de este diseño

| Aspecto | Resultado |
|---|---|
| UX del cliente | Se registra una vez, compra en cualquier tienda |
| Autonomía del negocio | Cada negocio puede marcar a Juan como VIP sin afectar otros |
| Historial separado | Pedidos y wishlist aislados por negocio |
| Escalabilidad | Agregar negocios no rompe nada |

---

¿Arranco con la implementación de estas entidades en Prisma + los módulos NestJS correspondientes (`auth-customer`, `customers`, `customer-profiles`)? 🚀


Voy a leer el skill de documentación antes de arrancar para asegurar la mejor calidad.Voy a proceder con la implementación directamente en código. No necesito crear un docx — voy a generar los archivos de implementación para NestJS + Prisma.Listo, Oscar. Aquí está el resumen de lo implementado:

---

## ✅ Lo que se generó

**`schema.prisma`** — 6 modelos completos:
- `Business` — el tenant (tienda-A, tienda-B…)
- `Customer` — cuenta global única con soporte OAuth
- `CustomerBusinessProfile` — perfil del cliente **por negocio** (tipo, wishlist, bloqueo)
- `StoreUser` — usuarios del panel con `StoreUserRole` (OWNER/ADMIN/STAFF/VIEWER)
- `Address` — direcciones globales reutilizables
- `Order` — soporta clientes registrados y guests

**`auth-customer.service.ts`** — tres métodos clave:
- `register()` → crea cuenta global + perfil en el negocio origen
- `login()` → crea el perfil automáticamente si el cliente llega a un negocio nuevo
- `switchBusiness()` → nuevo JWT sin re-login cuando navega entre tiendas

**`customers.service.ts`** — lógica de negocio: `findOrCreateProfile`, cambiar tipo (REGISTERED→VIP→WHOLESALE), bloquear por negocio, gestionar wishlist.

---

## 🔜 Siguiente módulo sugerido

El `AuthStoreModule` para los usuarios del panel (OWNER/ADMIN/STAFF/VIEWER). ¿Arrancamos con ese o prefieres ir primero con el módulo de `Products`?

// VentasVE — schema.prisma
// Multi-tenant: clientes globales, perfiles por negocio

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// NEGOCIO (Tenant)
// ─────────────────────────────────────────────

model Business {
  id          String   @id @default(cuid())
  slug        String   @unique // tienda-A, tienda-B (usado en la URL)
  name        String
  description String?
  logoUrl     String?
  isActive    Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  storeUsers        StoreUser[]
  customerProfiles  CustomerBusinessProfile[]
  orders            Order[]

  @@map("businesses")
}

// ─────────────────────────────────────────────
// USUARIOS DEL PANEL (Dashboard / Admin)
// ─────────────────────────────────────────────

model StoreUser {
  id       String        @id @default(cuid())
  email    String        @unique
  password String
  name     String
  avatar   String?
  isActive Boolean       @default(true)
  role     StoreUserRole @default(STAFF)

  businessId String
  business   Business @relation(fields: [businessId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("store_users")
}

enum StoreUserRole {
  OWNER   // Acceso total: configuración, billing, usuarios
  ADMIN   // Gestión operativa: productos, pedidos, chat, envíos
  STAFF   // Inbox, respuestas, estado de pedidos
  VIEWER  // Solo lectura de reportes
}

// ─────────────────────────────────────────────
// CLIENTES (Global — una cuenta para toda la plataforma)
// ─────────────────────────────────────────────

model Customer {
  id       String  @id @default(cuid())
  email    String  @unique // login único global
  password String? // null si usa OAuth (Google, etc.)
  name     String
  phone    String?
  avatar   String?

  // OAuth
  googleId   String? @unique
  oauthProvider String? // "google" | "facebook" | null

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  businessProfiles CustomerBusinessProfile[]
  orders           Order[]
  addresses        Address[]

  @@map("customers")
}

// ─────────────────────────────────────────────
// PERFIL DEL CLIENTE EN UN NEGOCIO ESPECÍFICO
// ─────────────────────────────────────────────

model CustomerBusinessProfile {
  id String @id @default(cuid())

  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])

  businessId String
  business   Business @relation(fields: [businessId], references: [id])

  // El tipo puede variar por negocio
  // Juan puede ser VIP en tienda-A y WHOLESALE en tienda-B
  type CustomerType @default(REGISTERED)

  // Datos exclusivos de este negocio
  wishlist     Json?   // IDs de productos favoritos en este negocio
  internalNote String? // Nota del negocio sobre el cliente (no visible al cliente)
  isBlocked    Boolean @default(false) // El negocio puede bloquear a un cliente

  firstSeenAt DateTime @default(now())
  lastSeenAt  DateTime @updatedAt

  @@unique([customerId, businessId]) // Un perfil por negocio
  @@map("customer_business_profiles")
}

enum CustomerType {
  REGISTERED // Cuenta activa (default)
  WHOLESALE  // Mayorista: precios especiales, pedidos mínimos
  VIP        // Descuentos automáticos, envío prioritario
}

// ─────────────────────────────────────────────
// DIRECCIONES (Reutilizables entre negocios)
// ─────────────────────────────────────────────

model Address {
  id         String  @id @default(cuid())
  label      String? // "Casa", "Trabajo"
  street     String
  city       String
  state      String
  postalCode String?
  country    String  @default("VE")
  isDefault  Boolean @default(false)

  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("addresses")
}

// ─────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────

model Order {
  id     String      @id @default(cuid())
  status OrderStatus @default(PENDING)
  total  Decimal     @db.Decimal(10, 2)

  // El pedido pertenece a un cliente Y a un negocio específico
  customerId String?  // null si fue GUEST
  customer   Customer? @relation(fields: [customerId], references: [id])

  businessId String
  business   Business @relation(fields: [businessId], references: [id])

  // Datos del guest (si no está registrado)
  guestName  String?
  guestEmail String?
  guestPhone String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}


// src/auth-customer/auth-customer.controller.ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthCustomerService } from './auth-customer.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { CustomerJwtPayload } from './auth-customer.service';

// ─── DTOs ──────────────────────────────────────────────────────────────────

class RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessId: string; // Se obtiene del contexto de la tienda actual
}

class LoginDto {
  email: string;
  password: string;
  businessId: string;
}

class SwitchBusinessDto {
  targetBusinessId: string;
}

// ─── Controller ────────────────────────────────────────────────────────────

@Controller('auth/customer')
export class AuthCustomerController {
  constructor(private authService: AuthCustomerService) {}

  /**
   * POST /auth/customer/register
   * El cliente se registra desde una tienda específica.
   * Crea cuenta global + perfil en esa tienda.
   */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/customer/login
   * Login desde cualquier tienda.
   * Si no tiene perfil en esa tienda, se crea automáticamente.
   */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/customer/switch-business
   * El cliente ya logueado navega a otra tienda.
   * Genera un nuevo token con el businessId de la tienda destino.
   *
   * Flujo típico:
   *   Cliente en /tienda-A (token con businessId: A)
   *   → hace click en link a /tienda-B
   *   → frontend llama este endpoint con targetBusinessId: B
   *   → recibe nuevo token con businessId: B
   */
  @UseGuards(CustomerJwtGuard)
  @Post('switch-business')
  switchBusiness(
    @CurrentCustomer() customer: CustomerJwtPayload,
    @Body() dto: SwitchBusinessDto,
  ) {
    return this.authService.switchBusiness(customer.sub, dto.targetBusinessId);
  }
}

// src/auth-customer/auth-customer.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';

export interface CustomerJwtPayload {
  sub: string;        // customerId
  email: string;
  businessId: string; // negocio activo en esta sesión
  profileType: string; // REGISTERED | WHOLESALE | VIP
}

@Injectable()
export class AuthCustomerService {
  constructor(
    private prisma: PrismaService,
    private customers: CustomersService,
    private jwt: JwtService,
  ) {}

  // ─── Registro ─────────────────────────────────────────────────────────────
  // El cliente se registra desde la URL de un negocio específico.
  // Se crea la cuenta global + el perfil en ese negocio.
  async register(dto: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    businessId: string;
  }) {
    const { businessId, password, ...customerData } = dto;

    // Verificar que el negocio existe
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new BadRequestException('Negocio no encontrado');

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear cuenta global
    const customer = await this.customers.create({
      ...customerData,
      password: hashedPassword,
    });

    // Crear perfil en el negocio donde se registró
    const profile = await this.customers.findOrCreateProfile(
      customer.id,
      businessId,
    );

    // Generar token
    const token = this.generateToken(customer, businessId, profile.type);

    return {
      customer: this.sanitize(customer),
      profile,
      accessToken: token,
    };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────
  // El cliente hace login desde cualquier negocio.
  // Si no tiene perfil en ese negocio, se crea automáticamente.
  async login(dto: {
    email: string;
    password: string;
    businessId: string;
  }) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (!customer || !customer.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isValid = await bcrypt.compare(dto.password, customer.password);
    if (!isValid) throw new UnauthorizedException('Credenciales incorrectas');

    if (!customer.isActive) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    // Obtener o crear perfil en este negocio
    const profile = await this.customers.findOrCreateProfile(
      customer.id,
      dto.businessId,
    );

    if (profile.isBlocked) {
      throw new UnauthorizedException('Tu cuenta ha sido suspendida en esta tienda');
    }

    const token = this.generateToken(customer, dto.businessId, profile.type);

    return {
      customer: this.sanitize(customer),
      profile,
      accessToken: token,
    };
  }

  // ─── Refresh token ────────────────────────────────────────────────────────
  // Útil cuando el cliente navega entre negocios:
  // Genera un nuevo token con el businessId del negocio actual.
  async switchBusiness(customerId: string, targetBusinessId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new UnauthorizedException();

    const profile = await this.customers.findOrCreateProfile(
      customerId,
      targetBusinessId,
    );

    if (profile.isBlocked) {
      throw new UnauthorizedException('Tu cuenta ha sido suspendida en esta tienda');
    }

    const token = this.generateToken(customer, targetBusinessId, profile.type);

    return { profile, accessToken: token };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private generateToken(
    customer: { id: string; email: string },
    businessId: string,
    profileType: string,
  ): string {
    const payload: CustomerJwtPayload = {
      sub: customer.id,
      email: customer.email,
      businessId,
      profileType,
    };
    return this.jwt.sign(payload);
  }

  private sanitize(customer: any) {
    const { password, ...safe } = customer;
    return safe;
  }
}

// src/customers/customers.controller.ts
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerType } from '@prisma/client';

// Guard para usuarios del panel (StoreUser) — se implementa por separado
// import { StoreUserJwtGuard } from '../auth-store/guards/store-user-jwt.guard';

@Controller('businesses/:businessId/customers')
// @UseGuards(StoreUserJwtGuard) // Descomentar cuando exista el guard de StoreUser
export class CustomersController {
  constructor(private customers: CustomersService) {}

  /**
   * GET /businesses/:businessId/customers
   * Lista todos los clientes de un negocio.
   * Usado por ADMIN/STAFF desde el dashboard.
   */
  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @Query('type') type?: CustomerType,
  ) {
    return this.customers.findAllByBusiness(businessId, { type });
  }

  /**
   * GET /businesses/:businessId/customers/:customerId
   * Detalle de un cliente en el contexto de este negocio.
   */
  @Get(':customerId')
  findOne(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.customers.getProfile(customerId, businessId);
  }

  /**
   * PATCH /businesses/:businessId/customers/:customerId/type
   * Cambia el tipo de cliente en este negocio.
   * Ejemplo: promover a Juan de REGISTERED a VIP en tienda-A.
   */
  @Patch(':customerId/type')
  updateType(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body('type') type: CustomerType,
  ) {
    return this.customers.updateType(customerId, businessId, type);
  }

  /**
   * PATCH /businesses/:businessId/customers/:customerId/block
   * Bloquea o desbloquea a un cliente en este negocio.
   * Solo afecta a este negocio, no a otros.
   */
  @Patch(':customerId/block')
  toggleBlock(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body('block') block: boolean,
  ) {
    return this.customers.toggleBlock(customerId, businessId, block);
  }
}


// src/customers/customers.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerType } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ─── Buscar o crear perfil en un negocio ───────────────────────────────────
  // Este método es el corazón del sistema multi-tenant:
  // Si el cliente ya existe globalmente pero no tiene perfil en este negocio,
  // se crea el perfil automáticamente.
  async findOrCreateProfile(customerId: string, businessId: string) {
    const existing = await this.prisma.customerBusinessProfile.findUnique({
      where: {
        customerId_businessId: { customerId, businessId },
      },
    });

    if (existing) {
      // Actualizar lastSeenAt
      return this.prisma.customerBusinessProfile.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
        include: { customer: true, business: true },
      });
    }

    // Crear perfil en este negocio por primera vez
    return this.prisma.customerBusinessProfile.create({
      data: {
        customerId,
        businessId,
        type: CustomerType.REGISTERED,
      },
      include: { customer: true, business: true },
    });
  }

  // ─── Obtener perfil completo en un negocio ─────────────────────────────────
  async getProfile(customerId: string, businessId: string) {
    const profile = await this.prisma.customerBusinessProfile.findUnique({
      where: {
        customerId_businessId: { customerId, businessId },
      },
      include: {
        customer: {
          include: { addresses: true },
        },
        business: true,
      },
    });

    if (!profile) throw new NotFoundException('Perfil no encontrado en este negocio');
    return profile;
  }

  // ─── Listar clientes de un negocio ────────────────────────────────────────
  async findAllByBusiness(businessId: string, filters?: { type?: CustomerType }) {
    return this.prisma.customerBusinessProfile.findMany({
      where: {
        businessId,
        ...(filters?.type && { type: filters.type }),
        isBlocked: false,
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  // ─── Actualizar tipo de cliente en un negocio ─────────────────────────────
  async updateType(customerId: string, businessId: string, type: CustomerType) {
    return this.prisma.customerBusinessProfile.update({
      where: {
        customerId_businessId: { customerId, businessId },
      },
      data: { type },
    });
  }

  // ─── Bloquear / desbloquear cliente en un negocio ─────────────────────────
  async toggleBlock(customerId: string, businessId: string, block: boolean) {
    return this.prisma.customerBusinessProfile.update({
      where: {
        customerId_businessId: { customerId, businessId },
      },
      data: { isBlocked: block },
    });
  }

  // ─── Wishlist ─────────────────────────────────────────────────────────────
  async updateWishlist(customerId: string, businessId: string, productIds: string[]) {
    return this.prisma.customerBusinessProfile.update({
      where: {
        customerId_businessId: { customerId, businessId },
      },
      data: { wishlist: productIds },
    });
  }

  // ─── Buscar cliente global por email ──────────────────────────────────────
  async findByEmail(email: string) {
    return this.prisma.customer.findUnique({ where: { email } });
  }

  // ─── Crear cliente global ─────────────────────────────────────────────────
  async create(data: { email: string; password?: string; name: string; phone?: string }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Este email ya está registrado');

    return this.prisma.customer.create({ data });
  }
}
 


 # 🏗️ Arquitectura Completa de Usuarios — VentasVE Platform

Excelente observación. Al ser una **plataforma SaaS multi-tenant**, necesitamos separar claramente 4 niveles de usuarios. Aquí está el esquema completo:

---

## 📊 Arquitectura de 4 Niveles

```
┌─────────────────────────────────────────────────────────────────┐
│ NIVEL 1: PLATAFORMA VENTASVE (Global)                          │
│ ─────────────────────────────────────────────────────────────── │
│ Personal que opera VentasVE como producto                       │
│ NO están asociados a ningún negocio registrado                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ NIVEL 2: NEGOCIO TENANT (Business)                             │
│ ─────────────────────────────────────────────────────────────── │
│ Dueños y empleados del negocio registrado                       │
│ Gestionan el panel administrativo (dashboard)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ NIVEL 3: CLIENTES DEL NEGOCIO (Customers)                      │
│ ─────────────────────────────────────────────────────────────── │
│ Compradores finales que adquieren productos/servicios          │
│ Cuenta global, puede comprar en múltiples negocios              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ NIVEL 4: SERVICIOS OPERATIVOS (Delivery)                       │
│ ─────────────────────────────────────────────────────────────── │
│ Repartidores, logística, soporte externo                       │
│ Pueden ser del negocio o de la plataforma (pool)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 Schema Prisma Completo

```prisma
// apps/backend/prisma/schema.prisma

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 1: PLATAFORMA VENTASVE (Personal Interno)
// ═════════════════════════════════════════════════════════════════════════════

/// Usuario interno de la plataforma VentasVE
/// NO está asociado a ningún negocio registrado
model PlatformUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  avatar    String?
  phone     String?
  
  // Rol dentro de la plataforma
  role      PlatformUserRole @default(SUPPORT)
  
  // Estado
  isActive  Boolean  @default(true)
  lastLoginAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones
  auditLogs        PlatformAuditLog[]
  supportTickets   SupportTicket[]        @relation("ticketAgent")
  managedBusinesses Business[]            @relation("platformManager")
  
  @@index([email, isActive])
  @@index([role])
  @@map("platform_users")
}

enum PlatformUserRole {
  SUPER_ADMIN     // Acceso total: configuración platform, billing, todos los negocios
  ADMIN           // Gestión operativa: soporte, tickets, analytics platform
  SUPPORT         // Solo soporte técnico y tickets de usuarios
  SALES           // Ventas: onboarding de nuevos negocios
  TECH            // Soporte técnico especializado
  VIEWER          // Solo lectura de analytics platform
}

/// Auditoría de acciones del personal de plataforma
model PlatformAuditLog {
  id          String   @id @default(cuid())
  userId      String
  user        PlatformUser @relation(fields: [userId], references: [id])
  
  action      String   // "BUSINESS_CREATED", "BUSINESS_SUSPENDED", "USER_CREATED", etc.
  targetType  String   // "Business", "Customer", "StoreUser", "PlatformUser"
  targetId    String
  details     Json?
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([targetType, targetId])
  @@map("platform_audit_logs")
}

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 2: NEGOCIO TENANT (Business + StoreUsers)
// ═════════════════════════════════════════════════════════════════════════════

/// Negocio registrado en la plataforma (Tenant)
model Business {
  id          String   @id @default(cuid())
  slug        String   @unique  // tienda-A, tienda-B (usado en URL: ventasve.app/c/:slug)
  name        String
  description String?
  logoUrl     String?
  
  // Tipo de negocio (industria)
  businessType BusinessType @default(OTHER)
  
  // Plan de suscripción
  plan        SubscriptionPlan @default(FREE)
  planExpiresAt DateTime?
  
  // Estado
  isActive    Boolean  @default(true)
  isSuspended Boolean  @default(false)
  suspendedAt DateTime?
  suspendedBy String?  // platformUserId que suspendió
  
  // Configuración
  whatsapp    String?
  city        String?
  instagram   String?
  schedule    String?
  
  // Ubicación fiscal
  estadoId    Int?
  municipioId Int?
  parroquiaId Int?
  
  // Datos fiscales
  rif         String?
  razonSocial String?
  fiscalAddress String?
  
  // Métricas
  totalOrders Int      @default(0)
  totalRevenue Decimal  @default(0) @db.Decimal(12,2)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  storeUsers       StoreUser[]
  customerProfiles CustomerBusinessProfile[]
  orders           Order[]
  products         Product[]
  shippingZones    ShippingZone[]
  
  // Manager de plataforma asignado (soporte dedicado)
  platformManagerId String?
  platformManager   PlatformUser? @relation(fields: [platformManagerId], references: [id])
  
  @@index([slug, isActive])
  @@index([businessType, plan])
  @@index([platformManagerId])
  @@map("businesses")
}

enum BusinessType {
  FASHION       // Moda, ropa, accesorios
  FOOD          // Restaurantes, comida, delivery
  BEAUTY        // Belleza, cosméticos, spa
  TECH          // Tecnología, electrónica, gadgets
  GROCERY       // Supermercado, abastos, mercado
  HOME          // Hogar, decoración, muebles
  HEALTH        // Salud, farmacia, bienestar
  EDUCATION     // Educación, cursos, libros
  AUTOMOTIVE    // Autos, repuestos, talleres
  SERVICES      // Servicios profesionales
  PETS          // Mascotas, veterinaria
  OTHER         // Otros no categorizados
}

enum SubscriptionPlan {
  FREE          // Hasta 20 productos, features básicos
  PRO           // Productos ilimitados, ChatBot, Inbox
  BUSINESS      // Multi-sucursal, API, analytics avanzado
}

/// Usuario del panel administrativo del negocio (StoreUser)
model StoreUser {
  id       String        @id @default(cuid())
  email    String        @unique
  password String
  name     String
  avatar   String?
  phone    String?
  
  // Rol dentro del negocio
  role     StoreUserRole @default(STAFF)
  
  // Estado
  isActive Boolean       @default(true)
  lastLoginAt DateTime?
  
  // Permisos personalizados (opcional, para granularidad fina)
  permissions Json?      // ["products.create", "orders.delete", ...]
  
  businessId String
  business   Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones
  orders    Order[]     @relation("salesAgent")
  
  @@index([email, businessId])
  @@index([role, isActive])
  @@map("store_users")
}

enum StoreUserRole {
  OWNER     // Dueño del negocio: acceso total, puede eliminar negocio
  ADMIN     // Administrador: gestión operativa, no puede eliminar negocio
  MANAGER   // Gerente: productos, pedidos, equipo (similar a ADMIN pero sin billing)
  STAFF     // Operativo: inbox, respuestas, estado de pedidos
  VIEWER    // Solo lectura de reportes y dashboard
}

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 3: CLIENTES DEL NEGOCIO (Customers Globales)
// ═════════════════════════════════════════════════════════════════════════════

/// Cliente final (comprador) — cuenta global única
model Customer {
  id       String   @id @default(cuid())
  email    String   @unique  // login único global
  password String?  // null si usa OAuth
  name     String
  phone    String?
  avatar   String?
  
  // OAuth
  googleId      String? @unique
  facebookId    String? @unique
  oauthProvider String? // "google" | "facebook" | "apple"
  
  // Estado global
  isActive Boolean  @default(true)
  isVerified Boolean @default(false)  // email verificado
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones
  businessProfiles CustomerBusinessProfile[]
  orders           Order[]
  addresses        Address[]
  reviews          ProductReview[]
  
  @@index([email, isActive])
  @@index([phone])
  @@map("customers")
}

/// Perfil del cliente DENTRO de un negocio específico
model CustomerBusinessProfile {
  id String @id @default(cuid())
  
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  // Tipo de cliente (puede variar por negocio)
  type CustomerType @default(REGISTERED)
  
  // Datos exclusivos de este negocio
  wishlist     Json?   // IDs de productos favoritos
  internalNote String? // Nota interna del negocio (no visible al cliente)
  isBlocked    Boolean @default(false)  // Negocio puede bloquear cliente
  
  // Métricas por negocio
  totalOrders Int      @default(0)
  totalSpent  Decimal  @default(0) @db.Decimal(12,2)
  avgTicket   Decimal  @default(0) @db.Decimal(10,2)
  
  firstSeenAt DateTime @default(now())
  lastSeenAt  DateTime @updatedAt
  
  @@unique([customerId, businessId])
  @@index([businessId, type])
  @@index([customerId, lastSeenAt])
  @@map("customer_business_profiles")
}

enum CustomerType {
  GUEST       // Sin registro (sesión temporal, no persiste en BD)
  REGISTERED  // Cuenta activa (default)
  WHOLESALE   // Mayorista: precios especiales, pedidos mínimos
  VIP         // Preferencial: descuentos, envío prioritario
  BLACKLIST   // Cliente bloqueado (no puede comprar)
}

/// Dirección del cliente (reutilizable entre negocios)
model Address {
  id         String   @id @default(cuid())
  label      String?  // "Casa", "Trabajo", "Otro"
  street     String
  city       String
  state      String
  postalCode String?
  country    String   @default("VE")
  isDefault  Boolean  @default(false)
  
  // Geolocalización
  latitude   Float?
  longitude  Float?
  
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  // Historial de uso
  timesUsed  Int      @default(0)
  lastUsedAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([customerId, isDefault])
  @@map("addresses")
}

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 4: SERVICIOS OPERATIVOS (Delivery & Logística)
// ═════════════════════════════════════════════════════════════════════════════

/// Repartidor (puede ser del negocio o del pool de plataforma)
model DeliveryPerson {
  id        String   @id @default(cuid())
  
  // Datos personales
  email     String   @unique
  phone     String   @unique
  name      String
  idNumber  String   @unique  // Cédula/DNI
  avatar    String?
  
  // Tipo de vinculación
  type      DeliveryType @default(INDEPENDENT)
  
  // Negocio asignado (null si es del pool de plataforma)
  businessId String?
  business   Business? @relation(fields: [businessId], references: [id])
  
  // Vehículo
  vehicleType VehicleType @default(MOTO)
  plateNumber String?
  vehicleModel String?
  
  // Estado
  isActive    Boolean  @default(true)
  isVerified  Boolean  @default(false)  // documentos verificados
  isAvailable Boolean  @default(true)   // disponible para asignación
  
  // Ubicación actual (tracking en tiempo real)
  currentLatitude Float?
  currentLongitude Float?
  lastLocationUpdate DateTime?
  
  // Métricas
  totalDeliveries Int @default(0)
  rating          Decimal @default(0) @db.Decimal(3,2)  // 0.00 - 5.00
  completedOrders Int @default(0)
  cancelledOrders Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones
  orders   DeliveryOrder[]
  documents DeliveryDocument[]
  ratings   DeliveryRating[]
  
  @@index([isActive, isAvailable])
  @@index([phone])
  @@index([businessId, type])
  @@index([currentLatitude, currentLongitude])
  @@map("delivery_persons")
}

enum DeliveryType {
  INDEPENDENT   // Repartidor independiente (freelance)
  BUSINESS_EMPLOYEE  // Empleado del negocio (nómina)
  PLATFORM_POOL      // Del pool de VentasVE (asignable a cualquier negocio)
  THIRD_PARTY   // Empresa externa (MRW, Zoom, Tealca)
}

enum VehicleType {
  MOTO
  BICICLETA
  CARRO
  FURGONETA
}

/// Documentos del repartidor (verificación)
model DeliveryDocument {
  id              String   @id @default(cuid())
  deliveryPersonId String
  deliveryPerson  DeliveryPerson @relation(fields: [deliveryPersonId], references: [id], onDelete: Cascade)
  
  type            DocumentType
  documentUrl     String   // URL del archivo escaneado
  expiryDate      DateTime?
  isVerified      Boolean  @default(false)
  verifiedBy      String?  // platformUserId o storeUserId que verificó
  verifiedAt      DateTime?
  rejectionReason String?
  
  createdAt       DateTime @default(now())
  
  @@index([deliveryPersonId, type])
  @@map("delivery_documents")
}

enum DocumentType {
  CEDULA
  LICENSE
  VEHICLE_REGISTRATION
  INSURANCE
  ANTECEDENTS
  RIF
}

/// Asignación de entrega (Order → Delivery)
model DeliveryOrder {
  id              String   @id @default(cuid())
  
  orderId         String   @unique  // Referencia al Order original
  order           Order    @relation(fields: [orderId], references: [id])
  
  deliveryPersonId String
  deliveryPerson  DeliveryPerson @relation(fields: [deliveryPersonId], references: [id])
  
  businessId      String
  business        Business @relation(fields: [businessId], references: [id])
  
  // Estado del delivery
  status          DeliveryStatus @default(ASSIGNED)
  
  // Tracking
  pickedUpAt      DateTime?
  deliveredAt     DateTime?
  failedAt        DateTime?
  failureReason   String?
  
  // Prueba de entrega
  proofOfDeliveryUrl String?  // Foto de entrega
  customerSignature  String?  // Firma digital
  otpCode            String?  // Código OTP para confirmar entrega
  
  // Ubicación
  pickupLatitude  Float?
  pickupLongitude Float?
  deliveryLatitude Float?
  deliveryLongitude Float?
  
  // Costos
  deliveryFee     Decimal  @default(0) @db.Decimal(10,2)
  platformCommission Decimal @default(0) @db.Decimal(10,2)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([deliveryPersonId, status])
  @@index([orderId])
  @@index([businessId, status])
  @@map("delivery_orders")
}

enum DeliveryStatus {
  ASSIGNED       // Asignado al repartidor
  PICKED_UP      // Recogido en tienda
  IN_TRANSIT     // En camino
  DELIVERED      // Entregado exitosamente
  FAILED         // Falló entrega
  CANCELLED      // Cancelado
}

/// Calificaciones de repartidores
model DeliveryRating {
  id              String   @id @default(cuid())
  deliveryOrderId String   @unique
  deliveryOrder   DeliveryOrder @relation(fields: [deliveryOrderId], references: [id])
  
  deliveryPersonId String
  deliveryPerson  DeliveryPerson @relation(fields: [deliveryPersonId], references: [id])
  
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  
  rating          Int      // 1-5 estrellas
  comment         String?
  punctuality     Int?     // 1-5
  professionalism Int?     // 1-5
  
  createdAt       DateTime @default(now())
  
  @@index([deliveryPersonId, createdAt])
  @@map("delivery_ratings")
}

// ═════════════════════════════════════════════════════════════════════════════
// SOPORTE Y TICKETS (Plataforma)
// ═════════════════════════════════════════════════════════════════════════════

/// Ticket de soporte (cliente/negocio → plataforma)
model SupportTicket {
  id        String   @id @default(cuid())
  
  // Quien crea el ticket
  createdByType TicketCreatorType
  createdById   String  // customerId o storeUserId
  
  // Asignado a
  assignedToId String?
  assignedTo   PlatformUser? @relation(fields: [assignedToId], references: [id])
  
  // Datos del ticket
  subject     String
  description String
  status      TicketStatus @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  category    TicketCategory
  
  // Negocio relacionado (si aplica)
  businessId String?
  business   Business? @relation(fields: [businessId], references: [id])
  
  // Respuestas
  messages SupportTicketMessage[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  resolvedAt DateTime?
  
  @@index([status, priority])
  @@index([assignedToId, status])
  @@index([businessId, createdAt])
  @@map("support_tickets")
}

enum TicketCreatorType {
  CUSTOMER    // Cliente final
  STORE_USER  // Usuario del negocio (OWNER/ADMIN/STAFF)
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_CUSTOMER
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketCategory {
  TECHNICAL     // Problemas técnicos
  BILLING       // Pagos, facturación
  ACCOUNT       // Cuenta, acceso
  FEATURE       // Solicitud de feature
  OTHER         // Otro
}

model SupportTicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  senderType TicketCreatorType
  senderId  String   // customerId, storeUserId, o platformUserId
  
  message   String
  attachments Json?  // URLs de archivos adjuntos
  
  isInternal Boolean @default(false)  // Nota interna (no visible al cliente)
  
  createdAt DateTime @default(now())
  
  @@index([ticketId, createdAt])
  @@map("support_ticket_messages")
}

// ═════════════════════════════════════════════════════════════════════════════
// PEDIDOS (Conecta todos los niveles)
// ═════════════════════════════════════════════════════════════════════════════

model Order {
  id              String   @id @default(cuid())
  orderNumber     Int      @unique @default(autoincrement())
  
  // Estado
  status          OrderStatus @default(PENDING)
  
  // Totales
  subtotalCents   Int
  shippingCostCents Int    @default(0)
  discountCents   Int      @default(0)
  totalCents      Int
  currency        String   @default("USD")
  
  // Tipo de cambio (si pagó en Bs.)
  exchangeRate    Decimal? @db.Decimal(12,2)
  totalBs         Decimal? @db.Decimal(12,2)
  
  // Cliente (puede ser null si es GUEST)
  customerId      String?
  customer        Customer? @relation(fields: [customerId], references: [id])
  
  // Perfil del cliente en este negocio (para historial y tipo)
  customerProfileId String?
  customerProfile   CustomerBusinessProfile? @relation(fields: [customerProfileId], references: [id])
  
  // Negocio
  businessId      String
  business        Business @relation(fields: [businessId], references: [id])
  
  // Datos del guest (si no está registrado)
  guestName       String?
  guestEmail      String?
  guestPhone      String?
  
  // Dirección de entrega
  shippingAddressId String?
  shippingAddress   Address? @relation(fields: [shippingAddressId], references: [id])
  shippingAddressText String?  // Dirección completa como texto
  
  // Ubicación geográfica
  deliveryLatitude Float?
  deliveryLongitude Float?
  locationEstadoId Int?
  locationMunicipioId Int?
  locationParroquiaId Int?
  
  // Método de pago
  paymentMethod   PaymentMethod
  paymentStatus   PaymentStatus @default(PENDING)
  paidAt          DateTime?
  
  // Método de envío
  shippingMethodCode String?
  shippingZoneId  String?
  shippingZone    ShippingZone? @relation(fields: [shippingZoneId], references: [id])
  
  // Agente de venta (StoreUser que atendió)
  salesAgentId    String?
  salesAgent      StoreUser? @relation(fields: [salesAgentId], references: [id])
  
  // Delivery
  deliveryOrderId String?
  deliveryOrder   DeliveryOrder? @relation(fields: [deliveryOrderId], references: [id])
  
  // Notas
  customerNotes   String?
  internalNotes   String?
  
  // Tracking
  source          OrderSource @default(WEB)
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  confirmedAt     DateTime?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  cancelledAt     DateTime?
  cancellationReason String?
  
  @@index([businessId, status, createdAt])
  @@index([customerId, createdAt])
  @@index([orderNumber])
  @@index([paymentStatus])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  READY
  SHIPPED
  IN_TRANSIT
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentMethod {
  ZELLE
  PAGO_MOVIL
  BINANCE
  TRANSFER
  CASH_USD
  CASH_BS
  CREDIT_CARD
  DEBIT_CARD
  PAYPAL
  STRIPE
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum OrderSource {
  WEB
  WHATSAPP
  INSTAGRAM
  FACEBOOK
  API
  POS         // Punto de venta físico
}

// ═════════════════════════════════════════════════════════════════════════════
// GEOGRAFÍA (Venezuela)
// ═════════════════════════════════════════════════════════════════════════════

model Estado {
  id            Int      @id
  codigo        String   @unique @db.VarChar(2)
  nombre_estado String   @db.VarChar(100)
  
  municipios    Municipio[]
  
  @@map("estados")
}

model Municipio {
  id               Int      @id
  codigo           String?  @db.VarChar(10)
  nombre_municipio String   @db.VarChar(100)
  estadoId         Int
  estado           Estado   @relation(fields: [estadoId], references: [id])
  
  parroquias       Parroquia[]
  
  @@index([estadoId])
  @@map("municipios")
}

model Parroquia {
  id               Int      @id
  codigo           String?  @db.VarChar(10)
  nombre_parroquia String   @db.VarChar(100)
  municipioId      Int
  municipio        Municipio @relation(fields: [municipioId], references: [id])
  
  @@index([municipioId])
  @@map("parroquias")
}

// ═════════════════════════════════════════════════════════════════════════════
// ENVÍOS (Zonas y Tarifas)
// ═════════════════════════════════════════════════════════════════════════════

model ShippingZone {
  id           String   @id @default(cuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  name         String   @db.VarChar(100)
  price        Decimal  @db.Decimal(10,2)
  free         Boolean  @default(false)
  freeOver     Decimal? @db.Decimal(10,2)
  radius       Int?
  deliveryTime String?  @db.VarChar(50)
  isActive     Boolean  @default(true)
  
  createdAt    DateTime @default(now())
  
  coverages    ShippingZoneCoverage[]
  rates        ShippingRate[]
  orders       Order[]
  
  @@index([businessId, isActive])
  @@map("shipping_zones")
}

model ShippingZoneCoverage {
  id          String   @id @default(cuid())
  zoneId      String
  zone        ShippingZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  
  estadoId    Int
  municipioId Int?
  parroquiaId Int?
  
  createdAt   DateTime @default(now())
  
  @@unique([zoneId, estadoId, municipioId, parroquiaId])
  @@index([estadoId])
  @@index([municipioId])
  @@index([parroquiaId])
  @@map("shipping_zone_coverage")
}

model ShippingRate {
  id             String   @id @default(cuid())
  zoneId         String
  zone           ShippingZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  methodId       Int
  method         ShippingMethod @relation(fields: [methodId], references: [id], onDelete: Cascade)
  
  costType       String   @default("fixed") @db.VarChar(10)
  costValue      Decimal  @db.Decimal(10,2)
  minOrderAmount Decimal  @default(0) @db.Decimal(10,2)
  isFree         Boolean  @default(false)
  
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  
  @@unique([zoneId, methodId, costType, costValue])
  @@index([zoneId, isActive])
  @@map("shipping_rates")
}

model ShippingMethod {
  id          Int      @id @default(autoincrement())
  code        String   @unique @db.VarChar(20)
  name        String   @db.VarChar(50)
  icon        String?  @db.VarChar(10)
  description String?
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  
  rates       ShippingRate[]
  
  @@map("shipping_methods")
}

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCTOS (Por negocio)
// ═════════════════════════════════════════════════════════════════════════════

model Product {
  id          String   @id @default(cuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  sku         String?
  name        String
  description String?
  priceCents  Int
  compareAtPriceCents Int?  // Precio original (para ofertas)
  
  // Stock
  stock       Int      @default(0)
  trackStock  Boolean  @default(true)
  allowBackorder Boolean @default(false)
  
  // Categorías
  categoryId  String?
  category    ProductCategory? @relation(fields: [categoryId], references: [id])
  
  // Imágenes
  images      Json?    // URLs de imágenes
  
  // Variantes
  hasVariants Boolean  @default(false)
  variants    Json?    // [{size: "M", color: "Rojo", price: X, stock: Y}]
  
  // Estado
  isActive    Boolean  @default(true)
  isFeatured  Boolean  @default(false)
  
  // SEO
  slug        String?
  metaTitle   String?
  metaDescription String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  orderItems  OrderItem[]
  reviews     ProductReview[]
  wishlistBy  CustomerBusinessProfile[] // Json de customerIds
  
  @@index([businessId, isActive])
  @@index([categoryId])
  @@index([slug])
  @@map("products")
}

model ProductCategory {
  id          String   @id @default(cuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  name        String
  slug        String?
  parentId    String?
  parent      ProductCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ProductCategory[] @relation("CategoryHierarchy")
  
  products    Product[]
  
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([businessId, parentId])
  @@map("product_categories")
}

model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  
  quantity    Int
  priceCents  Int      // Precio al momento de la compra
  totalCents  Int
  
  // Variante seleccionada
  variant     Json?    // {size: "M", color: "Rojo"}
  
  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}

model ProductReview {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  
  rating      Int      // 1-5 estrellas
  title       String?
  comment     String?
  
  isVerified  Boolean  @default(false)  // Compró el producto
  isApproved  Boolean  @default(false)  // Aprobado por el negocio
  
  createdAt   DateTime @default(now())
  
  @@index([productId, rating])
  @@index([customerId])
  @@map("product_reviews")
}
```

---

## 📊 Matriz de Usuarios por Nivel

| Nivel | Tipo de Usuario | Entidad Prisma | Alcance | Ejemplo de Uso |
|-------|----------------|----------------|---------|----------------|
| **1** | `PlatformUser` (SUPER_ADMIN) | `platform_users` | Toda la plataforma | Oscar (dueño de VentasVE) suspende un negocio |
| **1** | `PlatformUser` (SUPPORT) | `platform_users` | Tickets de soporte | Ana responde ticket de negocio |
| **1** | `PlatformUser` (SALES) | `platform_users` | Onboarding | Carlos hace demo a nuevo negocio |
| **2** | `StoreUser` (OWNER) | `store_users` | Un negocio | Dueño de "Hermanos Martínez" configura tienda |
| **2** | `StoreUser` (ADMIN) | `store_users` | Un negocio | Manager opera pedidos y productos |
| **2** | `StoreUser` (STAFF) | `store_users` | Un negocio | Empleado responde inbox |
| **3** | `Customer` (REGISTERED) | `customers` + `customer_business_profiles` | Global, compra en múltiples negocios | Juan compra en tienda-A y tienda-B |
| **3** | `Customer` (VIP) | `customers` + `customer_business_profiles` | Por negocio | Laura es VIP en tienda-A, normal en tienda-B |
| **4** | `DeliveryPerson` (BUSINESS_EMPLOYEE) | `delivery_persons` | Un negocio | Repartidor propio de la tienda |
| **4** | `DeliveryPerson` (PLATFORM_POOL) | `delivery_persons` | Plataforma (asignable) | Repartidor de VentasVE asignado a cualquier negocio |

---

## 🔄 Flujo de Registro por Tipo

### **PlatformUser (Nivel 1)**
```
• Creado manualmente por SUPER_ADMIN existente
• O vía script de seed inicial
• NO hay registro público
• Login: /platform/admin/login
```

### **StoreUser (Nivel 2)**
```
• OWNER se registra en /onboarding
  → Crea Business + StoreUser(OWNER) automáticamente
• OWNER invita a otros StoreUsers desde dashboard
  → POST /api/v1/businesses/:id/users/invite
• Login: /auth/login (dashboard)
```

### **Customer (Nivel 3)**
```
• Registro público en /c/:slug/register
  → Crea Customer global + CustomerBusinessProfile
• O checkout como GUEST → registro posterior
• Login: mismo para toda la plataforma
• Puede comprar en múltiples negocios sin re-registrarse
```

### **DeliveryPerson (Nivel 4)**
```
• Opción A: Negocio registra su propio repartidor
  → POST /api/v1/businesses/:id/delivery
• Opción B: Repartidor se registra en pool de plataforma
  → POST /api/v1/delivery/register (verificado por PlatformUser)
• Login: /delivery/app (app móvil o PWA)
```

---

## 🎯 Endpoints por Nivel

### **Nivel 1: Platform Admin**
```typescript
GET    /api/v1/platform/users              // Listar usuarios de plataforma
POST   /api/v1/platform/users              // Crear usuario de plataforma
GET    /api/v1/platform/businesses         // Listar todos los negocios
PATCH  /api/v1/platform/businesses/:id/suspend
GET    /api/v1/platform/tickets            // Tickets de soporte
PATCH  /api/v1/platform/tickets/:id/assign
GET    /api/v1/platform/analytics/overview // Métricas globales
```

### **Nivel 2: StoreUser (Dashboard)**
```typescript
// Negocio
GET    /api/v1/businesses/me               // Mi negocio
PATCH  /api/v1/businesses/me               // Actualizar configuración

// Usuarios del negocio
GET    /api/v1/businesses/me/users         // Listar StoreUsers
POST   /api/v1/businesses/me/users/invite  // Invitar nuevo usuario

// Productos
GET    /api/v1/products                    // Listar productos del negocio
POST   /api/v1/products                    // Crear producto

// Pedidos
GET    /api/v1/orders                      // Listar pedidos
PATCH  /api/v1/orders/:id/status           // Actualizar estado

// Clientes
GET    /api/v1/customers                   // Listar clientes del negocio
PATCH  /api/v1/customers/:id/type          // Cambiar tipo (VIP, WHOLESALE)

// Envíos
GET    /api/v1/shipping-zones              // Zonas de envío
POST   /api/v1/shipping-zones              // Crear zona
```

### **Nivel 3: Customer (Público)**
```typescript
POST   /api/v1/auth/customer/register      // Registro
POST   /api/v1/auth/customer/login         // Login
POST   /api/v1/auth/customer/switch-business // Cambiar de negocio (sin re-login)
GET    /api/v1/customers/me                // Mi perfil
GET    /api/v1/customers/me/orders         // Mis pedidos
GET    /api/v1/customers/me/addresses      // Mis direcciones
POST   /api/v1/customers/me/addresses      // Nueva dirección
```

### **Nivel 4: Delivery**
```typescript
POST   /api/v1/delivery/register           // Registro de repartidor
POST   /api/v1/delivery/login              // Login
GET    /api/v1/delivery/assignments        // Entregas asignadas
PATCH  /api/v1/delivery/assignments/:id/status
POST   /api/v1/delivery/location           // Actualizar ubicación (tracking)
```

---

## ✅ Checklist de Implementación

| Fase | Tarea | Prioridad | Tiempo |
|------|-------|-----------|--------|
| **1** | Migrar schema Prisma completo | 🔴 Alta | ~2 horas |
| **2** | Seed inicial de PlatformUser (SUPER_ADMIN) | 🔴 Alta | ~15 min |
| **3** | Auth module para PlatformUser | 🔴 Alta | ~45 min |
| **4** | Auth module para StoreUser (ya existe, ajustar) | 🟡 Media | ~30 min |
| **5** | Auth module para Customer (ya existe, ajustar) | 🟡 Media | ~30 min |
| **6** | Auth module para DeliveryPerson | 🟡 Media | ~45 min |
| **7** | Guards y decorators por tipo de usuario | 🔴 Alta | ~30 min |
| **8** | Dashboard Platform Admin (UI) | 🟢 Baja | ~3 horas |
| **9** | Tests de integración por nivel | 🟢 Baja | ~2 horas |

---

## ❓ ¿Por dónde quieres empezar?

| Opción | Qué genero |
|--------|-----------|
| **A** | Script de migración Prisma completo + seed de SUPER_ADMIN |
| **B** | Auth module para PlatformUser (login, guards, decorators) |
| **C** | Dashboard Platform Admin UI (gestión de negocios, tickets) |
| **D** | Tests de integración para flujos multi-tenant |

**Mi recomendación**: Ve con **Opción A** primero para tener la base de datos definida correctamente, luego continuamos con auth y dashboard.

 # 🚀 Opción A: Schema Prisma + Migración + Seed de SUPER_ADMIN

Perfecto, procedo con la implementación completa de la base de datos para los 4 niveles de usuarios.

---
 

## 🔐 Credenciales Creadas

| Tipo | Email | Password | Rol |
|------|-------|----------|-----|
| **Platform Admin** | `superadmin@ventasve.app` | `VentasVE2026!SuperAdmin` | SUPER_ADMIN |
| **Store Owner** | `admin@hermanosmartinez.test` | `Admin123!` | OWNER |

---

## ❓ ¿Necesitas algo más?

| Opción | Qué genero |
|--------|-----------|
| **B** | Auth module para PlatformUser (login, guards, decorators) |
| **C** | Endpoints de gestión de negocios para Super Admin |
| **D** | Dashboard Platform Admin UI |

¿Confirmas que ejecutaste la migración y el seed correctamente? 🎯

# 🎉 Excelente — Tablas SQL Creadas — ¿Qué Sigue?

Perfecto, Oscar. Con las tablas de base de datos creadas, ahora toca **sincronizar el código con la nueva estructura**. Aquí está el plan ordenado:

---

## 📋 Próximos Pasos Inmediatos

### **Paso 1: Actualizar Schema de Prisma** (15 min)

Necesitas que Prisma reconozca las nuevas tablas para poder usarlas en TypeScript.

```bash
# 1. Navegar al paquete de database
cd packages/database

# 2. Extraer estructura desde la BD hacia Prisma
pnpm prisma db pull

# 3. Regenerar cliente TypeScript
pnpm prisma generate

# 4. Verificar en Prisma Studio (opcional)
pnpm prisma studio
```

**¿Qué hace esto?**
- Lee las tablas que acabas de crear (`platform_users`, `customer_business_profiles`, `delivery_persons`, etc.)
- Actualiza los tipos TypeScript automáticamente
- Te permite usar `prisma.platformUser.findMany()` en el código

---

### **Paso 2: Crear Auth Module para Platform Admin** (30 min)

Los admins de VentasVE necesitan login separado del de los negocios.

**Archivos a crear:**
```
apps/backend/src/
├── auth-platform/
│   ├── auth-platform.module.ts
│   ├── auth-platform.service.ts
│   ├── auth-platform.controller.ts
│   ├── strategies/
│   │   └── platform-jwt.strategy.ts
│   ├── guards/
│   │   └── platform-jwt.guard.ts
│   └── decorators/
│       └── current-platform-user.decorator.ts
```

**Endpoints:**
```typescript
POST /api/v1/platform/auth/login      // Login de admin de plataforma
POST /api/v1/platform/auth/refresh    // Refresh token
GET  /api/v1/platform/auth/me         // Perfil actual
```

---

### **Paso 3: Actualizar SettingsPage — Tab Envíos** (20 min)

Actualmente el tab "Envíos" usa `DEFAULT_ZONES` (datos mockeados). Hay que conectarlo a la API real.

**Cambios en `apps/frontend/src/app/dashboard/settings/page.tsx`:**

```typescript
// 1. Importar shippingApi
import { shippingApi, ShippingZone } from '@/lib/api/shipping';

// 2. Cambiar estado de DEFAULT_ZONES a carga real
const [zones, setZones] = useState<ShippingZone[]>([]); // ← Vacío inicialmente

// 3. Agregar useEffect para cargar zonas reales
useEffect(() => {
  if (activeTab !== 'envios') return;
  
  shippingApi.getZones()
    .then(res => setZones(res.data.zones))
    .catch(err => console.error('[Settings] Error loading zones:', err));
}, [activeTab]);

// 4. Reemplazar handlers mock por API real
const handleAddZone = async () => {
  const newZone = {
    name: 'Nueva zona',
    price: 5,
    free: false,
    coverages: [], // ← Aquí iría la selección de estado/municipio/parroquia
  };
  
  await shippingApi.createZone(newZone);
  // Recargar lista
};

const handleUpdateZone = async (zoneId: string, updates: Partial<ShippingZone>) => {
  await shippingApi.updateZone(zoneId, updates);
  // Recargar lista
};

const handleDeleteZone = async (zoneId: string) => {
  await shippingApi.deleteZone(zoneId);
  // Recargar lista
};
```

---

### **Paso 4: Seed de SUPER_ADMIN Inicial** (5 min)

Crear el primer usuario de plataforma para poder acceder al admin.

```typescript
// packages/database/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // SUPER ADMIN inicial
  const superAdminPassword = await bcrypt.hash('VentasVE2026!SuperAdmin', 12);
  
  await prisma.platformUser.upsert({
    where: { email: 'superadmin@ventasve.app' },
    update: {},
    create: {
      email: 'superadmin@ventasve.app',
      password: superAdminPassword,
      name: 'Administrador VentasVE',
      phone: '+584120000000',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ SUPER_ADMIN creado: superadmin@ventasve.app');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
```

**Ejecutar:**
```bash
cd packages/database
pnpm prisma db seed
```

---

## 📊 Resumen del Estado Actual

| Módulo | Estado | Próxima Acción |
|--------|--------|---------------|
| **Database** | ✅ Tablas creadas | `pnpm prisma db pull` |
| **Platform Admin Auth** | ⏳ Pendiente | Crear módulo auth-platform |
| **Store User Auth** | ✅ Existe (SettingsPage) | Verificar que funcione con nueva BD |
| **Customer Auth** | ⏳ Pendiente | Crear módulo auth-customer |
| **Delivery** | ✅ Tablas creadas | Crear módulo delivery + app móvil |
| **SettingsPage — Envíos** | ⚠️ Usa datos mock | Conectar a shippingApi |
| **WhatsApp Connection** | ✅ Implementado | Verificar flujo completo |

---

## 🚀 ¿Por dónde quieres empezar?

| Opción | Qué genero | Tiempo |
|--------|-----------|--------|
| **A** | Schema de Prisma actualizado + comandos de sync | ~10 min |
| **B** | Auth module completo para Platform Admin | ~30 min |
| **C** | Actualización de SettingsPage (tab Envíos → API real) | ~20 min |
| **D** | Seed de SUPER_ADMIN + instrucciones de acceso | ~5 min |

**Mi recomendación**: Ve en orden **A → D → B → C**:
1. Primero sincroniza Prisma (A)
2. Crea el SUPER_ADMIN para tener acceso (D)
3. Luego el auth de platform (B)
4. Finalmente conecta el frontend (C)

 # ✅ Perfecto — Ahora Conectemos el Tab "Envíos" a la API Real

Viendo tu `SettingsPage.tsx` actual, veo que **usa `DEFAULT_ZONES` (datos mockeados)** en el tab de Envíos. Vamos a conectarlo a la API real de shipping que creamos.

---

## 🔧 Cambios Necesarios en `SettingsPage.tsx`

### **1. Agregar Imports de Shipping API**

```typescript
// Al inicio del archivo, junto a los demás imports
import { shippingApi, ShippingZone, CreateShippingZoneInput } from '@/lib/api/shipping';
import { MultiSelectModal, SelectableItem } from '@/components/ui/MultiSelectModal';
import { CoverageDetailPanel } from '@/components/CoverageDetailPanel';
import { ConfirmModal } from '@/components/ConfirmModal';
import { summarizeCoverages, getCoverageShortText } from '@/lib/helpers/summarizeCoverages';
import { municipioToItem, parroquiaToItem } from '@/lib/api/shipping';
```

### **2. Actualizar Estados**

```typescript
// Reemplazar el estado actual de zones (línea ~252)
const [zones, setZones] = useState<ShippingZone[]>([]); // ← Vacío inicialmente, no DEFAULT_ZONES

// Agregar nuevos estados para la UI avanzada de envíos (después de pickupEnabled)
const [showZoneModal, setShowZoneModal] = useState(false);
const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
const [coverageMode, setCoverageMode] = useState<'rapido' | 'avanzado'>('rapido');
const [selectedEstado, setSelectedEstado] = useState<number | null>(null);
const [selectedMunicipios, setSelectedMunicipios] = useState<number[]>([]);
const [selectedParroquias, setSelectedParroquias] = useState<number[]>([]);
const [showMunicipioModal, setShowMunicipioModal] = useState(false);
const [showParroquiaModal, setShowParroquiaModal] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
```

### **3. Cargar Zonas Reales al Entrar al Tab**

```typescript
// Agregar este useEffect (después del useEffect de WhatsApp, línea ~520)
useEffect(() => {
  if (activeTab !== 'envios') return;
  
  const loadShippingZones = async () => {
    try {
      const res = await shippingApi.getZones();
      setZones(res.data.zones);
    } catch (err) {
      console.error('[Settings] Error loading shipping zones:', err);
      setSaveError('No se pudieron cargar las zonas de envío');
    }
  };
  
  loadShippingZones();
}, [activeTab]);
```

### **4. Handlers para CRUD de Zonas**

```typescript
// Agregar después de handleNotif y toggleModule (línea ~580)

// Guardar zona (crear o editar)
const handleSaveZone = async () => {
  if (!newZoneName || !selectedEstado) {
    alert('Nombre y estado son obligatorios');
    return;
  }
  
  // Construir coberturas según modo
  const coverages: CreateShippingZoneInput['coverages'] = [];
  
  if (coverageMode === 'rapido') {
    // Modo rápido: cobertura completa del estado
    coverages.push({
      estadoId: selectedEstado,
      municipioId: null,
      parroquiaId: null,
    });
  } else {
    // Modo avanzado: coberturas específicas
    if (selectedMunicipios.length === 0) {
      alert('Selecciona al menos 1 municipio en modo avanzado');
      return;
    }
    
    for (const munId of selectedMunicipios) {
      const parroquiasForMun = selectedParroquias.filter(p => 
        parroquias.find(par => par.id === p && par.municipioId === munId)
      );
      
      if (parroquiasForMun.length > 0) {
        // Cobertura por parroquias específicas
        for (const parId of parroquiasForMun) {
          coverages.push({
            estadoId: selectedEstado,
            municipioId: munId,
            parroquiaId: parId,
          });
        }
      } else {
        // Cobertura de todo el municipio
        coverages.push({
          estadoId: selectedEstado,
          municipioId: munId,
          parroquiaId: null,
        });
      }
    }
  }
  
  const zoneData: CreateShippingZoneInput = {
    name: newZoneName,
    price: newZoneFree ? 0 : newZonePrice,
    free: newZoneFree,
    deliveryTime: newZoneDeliveryTime || undefined,
    coverages,
  };
  
  try {
    if (editingZone) {
      await shippingApi.updateZone(editingZone.id, zoneData);
      setZones(prev => prev.map(z => z.id === editingZone.id ? { ...z, ...zoneData } : z));
    } else {
      const res = await shippingApi.createZone(zoneData);
      setZones(prev => [...prev, res.data]);
    }
    setShowZoneModal(false);
    resetZoneForm();
  } catch (err) {
    console.error('[Settings] Error saving zone:', err);
    alert('No se pudo guardar la zona. Intenta de nuevo.');
  }
};

// Resetear formulario de zona
const resetZoneForm = () => {
  setNewZoneName('');
  setNewZonePrice(5);
  setNewZoneFree(false);
  setNewZoneDeliveryTime('');
  setSelectedEstado(null);
  setSelectedMunicipios([]);
  setSelectedParroquias([]);
  setEditingZone(null);
  setCoverageMode('rapido');
};

// Abrir modal para editar zona
const handleEditZone = (zone: ShippingZone) => {
  setEditingZone(zone);
  setNewZoneName(zone.name);
  setNewZonePrice(zone.price);
  setNewZoneFree(zone.free);
  setNewZoneDeliveryTime(zone.deliveryTime || '');
  
  // Cargar coberturas existentes
  const firstCov = zone.coverages?.[0];
  if (firstCov) {
    setSelectedEstado(firstCov.estadoId);
    setSelectedMunicipios(
      zone.coverages
        .filter(c => c.municipioId)
        .map(c => c.municipioId!)
        .filter(Boolean)
    );
    setSelectedParroquias(
      zone.coverages
        .filter(c => c.parroquiaId)
        .map(c => c.parroquiaId!)
        .filter(Boolean)
    );
  }
  setCoverageMode(zone.coverages?.length > 1 ? 'avanzado' : 'rapido');
  setShowZoneModal(true);
};

// Eliminar zona
const handleDeleteZone = async () => {
  if (!zoneToDelete) return;
  
  try {
    await shippingApi.deleteZone(zoneToDelete);
    setZones(prev => prev.filter(z => z.id !== zoneToDelete));
    setShowDeleteConfirm(false);
    setZoneToDelete(null);
  } catch (err) {
    console.error('[Settings] Error deleting zone:', err);
    alert('No se pudo eliminar la zona');
  }
};
```

### **5. Estados para el Formulario de Zona**

```typescript
// Agregar después de pickupEnabled (línea ~260)
const [newZoneName, setNewZoneName] = useState('');
const [newZonePrice, setNewZonePrice] = useState<number>(5);
const [newZoneFree, setNewZoneFree] = useState(false);
const [newZoneDeliveryTime, setNewZoneDeliveryTime] = useState('');
```

---

## 📁 6. Reemplazar UI del Tab "Envíos"

**Reemplaza TODO el bloque `{activeTab === 'envios' && (...)}`** (línea ~1350) con esto:

```typescript
{activeTab === 'envios' && (
  <div className="space-y-4">
    {/* Card: Zonas de envío */}
    <Card>
      <CardHeader 
        title="Zonas de envío" 
        subtitle="Define costos según ubicación del cliente"
        icon="🚚"
        action={
          <button 
            type="button"
            onClick={() => {
              resetZoneForm();
              setShowZoneModal(true);
            }}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-[#f5c842] hover:text-[#f5c842] transition"
          >
            + Agregar zona
          </button>
        }
      />
      
      <div className="divide-y divide-zinc-800 p-2">
        {zones.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm font-medium">Aún no tienes zonas configuradas</p>
            <p className="text-xs mt-1">Crea tu primera zona para definir costos de envío</p>
          </div>
        ) : (
          zones.map(zone => (
            <div key={zone.id} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-zinc-800/30 transition group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm">🗺️</div>
              
              <div className="flex-1 min-w-0 space-y-1">
                {/* Nombre */}
                <div className="text-sm font-medium text-zinc-100">{zone.name}</div>
                
                {/* Cobertura */}
                {zone.coverages && zone.coverages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                    <span>📍</span>
                    <span className="truncate max-w-[200px]">
                      {getCoverageShortText(zone.coverages)}
                    </span>
                    <CoverageDetailPanel coverages={zone.coverages} />
                  </div>
                )}
              </div>
              
              {/* Precio */}
              <div className="flex items-center gap-2">
                {zone.free ? (
                  <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400">GRATIS</span>
                ) : (
                  <div className="text-sm font-bold text-zinc-100">${zone.price}</div>
                )}
              </div>
              
              {/* Acciones */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                <button 
                  type="button"
                  onClick={() => handleEditZone(zone)}
                  className="text-zinc-600 hover:text-[#f5c842] transition text-xs"
                  title="Editar"
                >
                  ✎
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setZoneToDelete(zone.id);
                    setShowDeleteConfirm(true);
                  }}
                  className="text-zinc-600 hover:text-red-400 transition text-xs"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>

    {/* Card: Opciones de envío */}
    <Card>
      <CardHeader title="Opciones de envío" icon="⚙️" />
      <div className="px-5 py-3">
        <ToggleRow 
          title="Envío gratuito por monto mínimo" 
          desc="Aplica envío gratis cuando el pedido supera cierto valor"
          checked={freeShippingEnabled} 
          onChange={setFreeShippingEnabled} 
        />
        {freeShippingEnabled && (
          <div className="mb-3 ml-0 mt-2">
            <Field label="Monto mínimo para envío gratis ($)">
              <input 
                type="number" 
                value={freeShippingMin}
                onChange={e => setFreeShippingMin(+e.target.value)}
                className={`${iCls} py-2 text-xs`} 
                placeholder="Ej: 50" 
              />
            </Field>
          </div>
        )}
        <ToggleRow 
          title="Pickup / Retiro en tienda" 
          desc="El cliente puede retirar personalmente"
          checked={pickupEnabled} 
          onChange={setPickupEnabled} 
        />
      </div>
    </Card>
  </div>
)}
```

---

## 📁 7. Agregar Modales (Al Final del Render)

```typescript
{/* Agregar después del cierre del form, antes del toast de savedOk/saveError */}

{/* Modal de Zona */}
{showZoneModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0">
        <h3 className="text-sm font-bold text-zinc-100">
          {editingZone ? 'Editar zona' : 'Nueva zona'}
        </h3>
        <button onClick={() => setShowZoneModal(false)} className="text-zinc-500 hover:text-zinc-300 transition text-lg leading-none">✕</button>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-zinc-800 px-5 shrink-0">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCoverageMode('rapido')}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition ${
              coverageMode === 'rapido' 
                ? 'bg-zinc-950 text-zinc-100 border-b-2 border-[#f5c842]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🚀 Rápido
          </button>
          <button
            type="button"
            onClick={() => setCoverageMode('avanzado')}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition ${
              coverageMode === 'avanzado' 
                ? 'bg-zinc-950 text-zinc-100 border-b-2 border-[#f5c842]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚙️ Avanzado
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5 space-y-4 overflow-auto">
        {/* Nombre */}
        <Field label="Nombre de la zona" full>
          <input
            value={newZoneName}
            onChange={e => setNewZoneName(e.target.value)}
            className={iCls}
            placeholder="Ej: Caracas (zona 1)"
          />
        </Field>
        
        {coverageMode === 'rapido' ? (
          <Field label="Estado">
            <select
              value={selectedEstado || ''}
              onChange={e => setSelectedEstado(e.target.value ? Number(e.target.value) : null)}
              className={iCls}
            >
              <option value="">Seleccionar estado...</option>
              {estados.map(e => (
                <option key={e.id} value={e.id}>{e.nombre_estado}</option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Estado">
              <select
                value={selectedEstado || ''}
                onChange={e => setSelectedEstado(e.target.value ? Number(e.target.value) : null)}
                className={iCls}
              >
                <option value="">Seleccionar estado...</option>
                {estados.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre_estado}</option>
                ))}
              </select>
            </Field>
            
            {selectedEstado && (
              <>
                <Field label={`Municipios (${selectedMunicipios.length} seleccionados)`}>
                  <button
                    type="button"
                    onClick={() => setShowMunicipioModal(true)}
                    className={`w-full text-left ${iCls} flex items-center justify-between`}
                  >
                    <span>{selectedMunicipios.length === 0 ? 'Seleccionar municipios...' : `${selectedMunicipios.length} municipios`}</span>
                    <span className="text-zinc-500">▼</span>
                  </button>
                </Field>
                
                {selectedMunicipios.length > 0 && (
                  <Field label={`Parroquias (${selectedParroquias.length} seleccionadas)`}>
                    <button
                      type="button"
                      onClick={() => setShowParroquiaModal(true)}
                      className={`w-full text-left ${iCls} flex items-center justify-between`}
                    >
                      <span>{selectedParroquias.length === 0 ? 'Seleccionar parroquias...' : `${selectedParroquias.length} parroquias`}</span>
                      <span className="text-zinc-500">▼</span>
                    </button>
                  </Field>
                )}
              </>
            )}
          </>
        )}
        
        {/* Precio y tiempo */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Precio de envío ($)">
            <input
              type="number"
              step="0.01"
              value={newZonePrice}
              onChange={e => setNewZonePrice(Number(e.target.value) || 0)}
              className={iCls}
              disabled={newZoneFree}
            />
          </Field>
          <Field label="Tiempo de entrega">
            <input
              value={newZoneDeliveryTime}
              onChange={e => setNewZoneDeliveryTime(e.target.value)}
              className={iCls}
              placeholder="Ej: 24-48h"
            />
          </Field>
        </div>
        
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={newZoneFree}
            onChange={e => setNewZoneFree(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 accent-[#f5c842]"
          />
          Envío gratis
        </label>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4 shrink-0">
        <button
          type="button"
          onClick={() => setShowZoneModal(false)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSaveZone}
          className="rounded-lg bg-[#f5c842] px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#f5c842]/90 transition"
        >
          {editingZone ? 'Guardar cambios' : 'Crear zona'}
        </button>
      </div>
    </div>
  </div>
)}

{/* Modales de selección múltiple */}
{showMunicipioModal && selectedEstado && (
  <MultiSelectModal
    items={municipios.filter(m => m.estadoId === selectedEstado).map(municipioToItem)}
    selected={selectedMunicipios}
    onChange={setSelectedMunicipios}
    title="Seleccionar municipios"
    searchPlaceholder="Buscar municipio..."
    onClose={() => setShowMunicipioModal(false)}
    minItems={1}
  />
)}

{showParroquiaModal && selectedMunicipios.length > 0 && (
  <MultiSelectModal
    items={parroquias.filter(p => selectedMunicipios.includes(p.municipioId)).map(parroquiaToItem)}
    selected={selectedParroquias}
    onChange={setSelectedParroquias}
    title="Seleccionar parroquias"
    searchPlaceholder="Buscar parroquia..."
    onClose={() => setShowParroquiaModal(false)}
  />
)}

{/* ConfirmModal para eliminar */}
{showDeleteConfirm && (
  <ConfirmModal
    title="Eliminar zona"
    message={`¿Eliminar "${zones.find(z => z.id === zoneToDelete)?.name}"? Esta acción no se puede deshacer.`}
    variant="danger"
    onConfirm={handleDeleteZone}
    onCancel={() => {
      setShowDeleteConfirm(false);
      setZoneToDelete(null);
    }}
  />
)}
```

---

## 📋 Resumen de Cambios

| Archivo | Cambios | Líneas Aprox. |
|---------|---------|---------------|
| `SettingsPage.tsx` | Imports de shipping + estados + handlers + UI | ~400 líneas |
| `MultiSelectModal.tsx` | Ya creado (reutilizar) | — |
| `CoverageDetailPanel.tsx` | Ya creado (reutilizar) | — |
| `ConfirmModal.tsx` | Ya creado (reutilizar) | — |

---

## 🚀 ¿Procedemos?

| Opción | Qué hago |
|--------|----------|
| **A** | Genero el archivo `SettingsPage.tsx` completo con todos los cambios integrados |
| **B** | Genero solo los patches/diffs para aplicar sobre tu versión actual |
| **C** | Primero verificamos que `shippingApi` esté correctamente importado en tu proyecto |

**Mi recomendación**: Ve con **Opción B** (patches) para mantener tu código actual y solo modificar lo necesario del tab "Envíos".

 # ✅ Correcto — Aquí Está Todo lo que Falta

Tienes razón. Voy a generarte:

1. **Schema de Prisma actualizado** (para sincronizar con las tablas SQL que ya creaste)
2. **Opción B completa** (patches para conectar el tab "Envíos" a la API real)

---

## 📁 1. Schema de Prisma Actualizado

```prisma
// packages/database/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 1: PLATAFORMA VENTASVE (Personal Interno)
// ═════════════════════════════════════════════════════════════════════════════

model PlatformUser {
  id          String             @id @default(cuid())
  email       String             @unique
  password    String
  name        String
  avatar      String?
  phone       String?
  role        PlatformUserRole   @default(SUPPORT)
  isActive    Boolean            @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  auditLogs       PlatformAuditLog[]
  supportTickets  SupportTicket[]        @relation("ticketAgent")
  managedBusinesses Business[]           @relation("platformManager")

  @@index([email, isActive])
  @@index([role])
  @@map("platform_users")
}

enum PlatformUserRole {
  SUPER_ADMIN
  ADMIN
  SUPPORT
  SALES
  TECH
  VIEWER
}

model PlatformAuditLog {
  id         String   @id @default(cuid())
  userId     String
  user       PlatformUser @relation(fields: [userId], references: [id])
  action     String
  targetType String
  targetId   String
  details    Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([targetType, targetId])
  @@map("platform_audit_logs")
}

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 2: NEGOCIO (Tenant)
// ═════════════════════════════════════════════════════════════════════════════

model Business {
  id            String         @id @default(cuid())
  slug          String         @unique
  name          String
  description   String?
  logoUrl       String?
  businessType  BusinessType   @default(OTHER)
  plan          SubscriptionPlan @default(FREE)
  planExpiresAt DateTime?
  isActive      Boolean        @default(true)
  isSuspended   Boolean        @default(false)
  suspendedAt   DateTime?
  suspendedBy   String?
  whatsapp      String
  city          String?
  instagram     String?
  schedule      String?
  estadoId      Int?
  municipioId   Int?
  parroquiaId   Int?
  rif           String?
  razonSocial   String?
  fiscalAddress String?
  storeLatitude Float?
  storeLongitude Float?
  storeAddress  String?
  settings      Json           @default("{}")
  catalogOptions Json?
  paymentMethods Json?
  totalOrders   Int            @default(0)
  totalRevenue  Decimal        @default(0) @db.Decimal(12,2)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  storeUsers       StoreUser[]
  customerProfiles CustomerBusinessProfile[]
  orders           Order[]
  products         Product[]
  shippingZones    ShippingZone[]
  platformManagerId String?
  platformManager  PlatformUser? @relation(fields: [platformManagerId], references: [id])

  @@index([slug, isActive])
  @@index([businessType, plan])
  @@map("businesses")
}

enum BusinessType {
  FASHION
  FOOD
  BEAUTY
  TECH
  GROCERY
  HOME
  HEALTH
  EDUCATION
  AUTOMOTIVE
  SERVICES
  PETS
  OTHER
}

enum SubscriptionPlan {
  FREE
  PRO
  BUSINESS
}

model StoreUser {
  id          String        @id @default(cuid())
  email       String        @unique
  password    String
  name        String
  avatar      String?
  phone       String?
  role        StoreUserRole @default(STAFF)
  isActive    Boolean       @default(true)
  lastLoginAt DateTime?
  permissions Json?
  businessId  String
  business    Business      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  sessions    Session[]
  orders      Order[]       @relation("salesAgent")

  @@index([email, businessId])
  @@index([role, isActive])
  @@map("store_users")
}

enum StoreUserRole {
  OWNER
  ADMIN
  MANAGER
  STAFF
  VIEWER
}

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 3: CLIENTES (Globales)
// ═════════════════════════════════════════════════════════════════════════════

model Customer {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?
  name          String
  phone         String?
  avatar        String?
  googleId      String?   @unique
  facebookId    String?   @unique
  oauthProvider String?
  isActive      Boolean   @default(true)
  isVerified    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  businessProfiles CustomerBusinessProfile[]
  orders           Order[]
  addresses        Address[]
  reviews          ProductReview[]

  @@index([email, isActive])
  @@index([phone])
  @@map("customers")
}

model CustomerBusinessProfile {
  id            String        @id @default(cuid())
  customerId    String
  customer      Customer      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  businessId    String
  business      Business      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  type          CustomerType  @default(REGISTERED)
  wishlist      Json?
  internalNote  String?
  isBlocked     Boolean       @default(false)
  totalOrders   Int           @default(0)
  totalSpent    Decimal       @default(0) @db.Decimal(12,2)
  avgTicket     Decimal       @default(0) @db.Decimal(10,2)
  firstSeenAt   DateTime      @default(now())
  lastSeenAt    DateTime      @updatedAt

  @@unique([customerId, businessId])
  @@index([businessId, type])
  @@map("customer_business_profiles")
}

enum CustomerType {
  GUEST
  REGISTERED
  WHOLESALE
  VIP
  BLACKLIST
}

model Address {
  id          String   @id @default(cuid())
  label       String?
  street      String
  city        String
  state       String
  postalCode  String?
  country     String   @default("VE")
  isDefault   Boolean  @default(false)
  latitude    Float?
  longitude   Float?
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  timesUsed   Int      @default(0)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([customerId, isDefault])
  @@map("addresses")
}

// ═════════════════════════════════════════════════════════════════════════════
// NIVEL 4: DELIVERY
// ═════════════════════════════════════════════════════════════════════════════

model DeliveryPerson {
  id               String        @id @default(cuid())
  email            String        @unique
  phone            String        @unique
  name             String
  idNumber         String        @unique
  avatar           String?
  type             DeliveryType  @default(INDEPENDENT)
  businessId       String?
  business         Business?     @relation(fields: [businessId], references: [id])
  vehicleType      VehicleType   @default(MOTO)
  plateNumber      String?
  vehicleModel     String?
  isActive         Boolean       @default(true)
  isVerified       Boolean       @default(false)
  isAvailable      Boolean       @default(true)
  currentLatitude  Float?
  currentLongitude Float?
  lastLocationUpdate DateTime?
  totalDeliveries  Int           @default(0)
  rating           Decimal       @default(0) @db.Decimal(3,2)
  completedOrders  Int           @default(0)
  cancelledOrders  Int           @default(0)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  documents DeliveryDocument[]
  deliveries DeliveryOrder[]
  ratings   DeliveryRating[]

  @@index([isActive, isAvailable])
  @@index([phone])
  @@map("delivery_persons")
}

enum DeliveryType {
  INDEPENDENT
  BUSINESS_EMPLOYEE
  PLATFORM_POOL
  THIRD_PARTY
}

enum VehicleType {
  MOTO
  BICICLETA
  CARRO
  FURGONETA
}

model DeliveryDocument {
  id              String   @id @default(cuid())
  deliveryPersonId String
  deliveryPerson  DeliveryPerson @relation(fields: [deliveryPersonId], references: [id], onDelete: Cascade)
  type            DocumentType
  documentUrl     String
  expiryDate      DateTime?
  isVerified      Boolean  @default(false)
  verifiedBy      String?
  verifiedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime @default(now())

  @@index([deliveryPersonId, type])
  @@map("delivery_documents")
}

enum DocumentType {
  CEDULA
  LICENSE
  VEHICLE_REGISTRATION
  INSURANCE
  ANTECEDENTS
  RIF
}

model DeliveryOrder {
  id              String   @id @default(cuid())
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])
  deliveryPersonId String
  deliveryPerson  DeliveryPerson @relation(fields: [deliveryPersonId], references: [id])
  businessId      String
  business        Business @relation(fields: [businessId], references: [id])
  status          DeliveryStatus @default(ASSIGNED)
  pickedUpAt      DateTime?
  deliveredAt     DateTime?
  failedAt        DateTime?
  failureReason   String?
  proofOfDeliveryUrl String?
  customerSignature  String?
  otpCode            String?
  pickupLatitude  Float?
  pickupLongitude Float?
  deliveryLatitude Float?
  deliveryLongitude Float?
  deliveryFee     Decimal  @default(0) @db.Decimal(10,2)
  platformCommission Decimal @default(0) @db.Decimal(10,2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([deliveryPersonId, status])
  @@index([orderId])
  @@index([businessId, status])
  @@map("delivery_orders")
}

enum DeliveryStatus {
  ASSIGNED
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  FAILED
  CANCELLED
}

model DeliveryRating {
  id              String   @id @default(cuid())
  deliveryOrderId String   @unique
  deliveryOrder   DeliveryOrder @relation(fields: [deliveryOrderId], references: [id])
  deliveryPersonId String
  deliveryPerson  DeliveryPerson @relation(fields: [deliveryPersonId], references: [id])
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  rating          Int
  comment         String?
  punctuality     Int?
  professionalism Int?
  createdAt       DateTime @default(now())

  @@index([deliveryPersonId, createdAt])
  @@map("delivery_ratings")
}

// ═════════════════════════════════════════════════════════════════════════════
// SOPORTE
// ═════════════════════════════════════════════════════════════════════════════

model SupportTicket {
  id        String   @id @default(cuid())
  createdByType TicketCreatorType
  createdById   String
  assignedToId String?
  assignedTo   PlatformUser? @relation(fields: [assignedToId], references: [id])
  subject     String
  description String
  status      TicketStatus @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  category    TicketCategory
  businessId  String?
  business    Business? @relation(fields: [businessId], references: [id])
  messages    SupportTicketMessage[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  resolvedAt  DateTime?

  @@index([status, priority])
  @@index([assignedToId, status])
  @@map("support_tickets")
}

enum TicketCreatorType {
  CUSTOMER
  STORE_USER
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_CUSTOMER
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketCategory {
  TECHNICAL
  BILLING
  ACCOUNT
  FEATURE
  OTHER
}

model SupportTicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  senderType TicketCreatorType
  senderId  String
  message   String
  attachments Json?
  isInternal Boolean @default(false)
  createdAt DateTime @default(now())

  @@index([ticketId, createdAt])
  @@map("support_ticket_messages")
}

// ═════════════════════════════════════════════════════════════════════════════
// PEDIDOS
// ═════════════════════════════════════════════════════════════════════════════

model Order {
  id              String   @id @default(cuid())
  orderNumber     Int      @unique @default(autoincrement())
  status          OrderStatus @default(PENDING)
  source          OrderSource @default(WEB)
  totalCents      Int
  exchangeRate    Decimal? @db.Decimal(12,2)
  paymentMethod   PaymentMethod
  paymentStatus   PaymentStatus @default(PENDING)
  deliveryAddress String?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  shippingZoneId  String?
  shippingZoneSlug String? @db.VarChar(50)
  shippingCostCents Int?
  shippingMethodCode String? @db.VarChar(20)
  deliveryLatitude Float?
  deliveryLongitude Float?
  locationEstadoId Int?
  locationMunicipioId Int?
  locationParroquiaId Int?

  businessId      String
  business        Business @relation(fields: [businessId], references: [id])
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  items           OrderItem[]
  payments        Payment[]
  deliveryOrder   DeliveryOrder?
  salesAgentId    String?
  salesAgent      StoreUser? @relation(fields: [salesAgentId], references: [id])

  @@index([businessId, status])
  @@index([customerId])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

enum PaymentMethod {
  ZELLE
  PAGO_MOVIL
  BINANCE
  TRANSFER
  CASH
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum OrderSource {
  WEB
  WHATSAPP
  INSTAGRAM
}

model OrderItem {
  id            String   @id @default(cuid())
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  quantity      Int
  unitPriceCents Int
  variantSelected Json?

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}

model Payment {
  id            String   @id @default(cuid())
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id])
  businessId    String
  method        PaymentMethod
  amountCents   Int
  currency      String
  reference     String?
  proofImageUrl String?
  status        PaymentStatus @default(PENDING)
  verifiedAt    DateTime?
  verifiedBy    String?
  createdAt     DateTime @default(now())
  notes         String?

  @@index([orderId])
  @@map("payments")
}

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCTOS
// ═════════════════════════════════════════════════════════════════════════════

model Product {
  id            String   @id @default(cuid())
  businessId    String
  business      Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id])
  name          String
  description   String?
  priceUsdCents Int
  stock         Int      @default(0)
  images        String[]
  variants      Json     @default("[]")
  attributes    Json     @default("{}")
  isPublished   Boolean  @default(true)
  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  orderItems    OrderItem[]
  reviews       ProductReview[]

  @@index([businessId])
  @@index([categoryId])
  @@map("products")
}

model Category {
  id          String   @id @default(cuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  products    Product[]

  @@index([businessId])
  @@map("categories")
}

model ProductReview {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  rating     Int
  title      String?
  comment    String?
  isVerified Boolean  @default(false)
  isApproved Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([productId])
  @@index([customerId])
  @@map("product_reviews")
}

// ═════════════════════════════════════════════════════════════════════════════
// ENVÍOS (Zonas)
// ═════════════════════════════════════════════════════════════════════════════

model ShippingZone {
  id           String   @id @default(cuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  name         String   @db.VarChar(100)
  price        Decimal  @db.Decimal(10,2)
  free         Boolean  @default(false)
  freeOver     Decimal? @db.Decimal(10,2)
  radius       Int?
  deliveryTime String?  @db.VarChar(50)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  coverages ShippingZoneCoverage[]
  rates     ShippingRate[]
  orders    Order[]

  @@index([businessId, isActive])
  @@map("shipping_zones")
}

model ShippingZoneCoverage {
  id          String   @id @default(cuid())
  zoneId      String
  zone        ShippingZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  estadoId    Int
  municipioId Int?
  parroquiaId Int?
  createdAt   DateTime @default(now())

  @@unique([zoneId, estadoId, municipioId, parroquiaId])
  @@index([estadoId])
  @@index([municipioId])
  @@index([parroquiaId])
  @@map("shipping_zone_coverage")
}

model ShippingRate {
  id             String   @id @default(cuid())
  zoneId         String
  zone           ShippingZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  methodId       Int
  method         ShippingMethod @relation(fields: [methodId], references: [id], onDelete: Cascade)
  costType       String   @default("fixed") @db.VarChar(10)
  costValue      Decimal  @db.Decimal(10,2)
  minOrderAmount Decimal  @default(0) @db.Decimal(10,2)
  isFree         Boolean  @default(false)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  @@unique([zoneId, methodId, costType, costValue])
  @@index([zoneId, isActive])
  @@map("shipping_rates")
}

model ShippingMethod {
  id          Int      @id @default(autoincrement())
  code        String   @unique @db.VarChar(20)
  name        String   @db.VarChar(50)
  icon        String?  @db.VarChar(10)
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  rates ShippingRate[]

  @@map("shipping_methods")
}

// ═════════════════════════════════════════════════════════════════════════════
// WHATSAPP & CHAT
// ═════════════════════════════════════════════════════════════════════════════

model Conversation {
  id         String     @id @default(cuid())
  businessId String
  customerId String
  channel    Channel
  status     ConvStatus @default(BOT)
  botActive  Boolean    @default(true)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  messages Message[]

  @@index([businessId])
  @@index([customerId])
  @@map("conversations")
}

enum Channel {
  WHATSAPP
  INSTAGRAM
  WEB
}

enum ConvStatus {
  BOT
  HUMAN
  CLOSED
}

model Message {
  id           String   @id @default(cuid())
  conversationId String
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role         MsgRole
  content      String
  mediaUrl     String?
  waId         String?
  createdAt    DateTime @default(now())

  @@index([conversationId])
  @@map("messages")
}

enum MsgRole {
  USER
  ASSISTANT
  SYSTEM
}

// ═════════════════════════════════════════════════════════════════════════════
// SESSIONS & AUTH
// ═════════════════════════════════════════════════════════════════════════════

model Session {
  id        String   @id @default(cuid())
  storeUserId String
  storeUser StoreUser @relation(fields: [storeUserId], references: [id], onDelete: Cascade)
  token     String
  userAgent String?
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  @@index([storeUserId])
  @@map("sessions")
}

// ═════════════════════════════════════════════════════════════════════════════
// GEOGRAFÍA & METADATOS
// ═════════════════════════════════════════════════════════════════════════════

model Estado {
  id            Int      @id
  codigo        String   @unique @db.VarChar(2)
  nombre_estado String   @db.VarChar(100)
  municipios    Municipio[]
  @@map("estados")
}

model Municipio {
  id               Int      @id
  codigo           String?  @db.VarChar(10)
  nombre_municipio String   @db.VarChar(100)
  estadoId         Int
  estado           Estado   @relation(fields: [estadoId], references: [id])
  parroquias       Parroquia[]
  @@index([estadoId])
  @@map("municipios")
}

model Parroquia {
  id               Int      @id
  codigo           String?  @db.VarChar(10)
  nombre_parroquia String   @db.VarChar(100)
  municipioId      Int
  municipio        Municipio @relation(fields: [municipioId], references: [id])
  @@index([municipioId])
  @@map("parroquias")
}

model ExchangeRate {
  id        String   @id @default(cuid())
  businessId String?
  usdToVes  Decimal
  source    String
  date      DateTime @default(now())
  @@map("exchange_rates")
}

model PaymentConfig {
  id         String        @id @default(cuid())
  businessId String
  method     PaymentMethod
  details    Json          @default("{}")
  isActive   Boolean       @default(true)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  @@index([businessId])
  @@map("payment_configs")
}
```

---

## 📁 2. Opción B — Patches para SettingsPage.tsx (Tab Envíos → API Real)

### **Patch 1: Agregar Imports (línea ~7)**

```diff
  import { settingsApi, PaymentMethods, CatalogOptions, NotificationSettings } from '@/lib/api/settings';
  import { geoApi, Estado, Municipio, Parroquia, Country, VeAreaCode } from '@/lib/api/geo';
  import { metaApi, BankMeta, BusinessTypeMeta, PersonTypeMeta, IslrRegimenMeta } from '@/lib/api/meta';
+ import { shippingApi, ShippingZone, CreateShippingZoneInput } from '@/lib/api/shipping';
+ import { summarizeCoverages, getCoverageShortText } from '@/lib/helpers/summarizeCoverages';
```

### **Patch 2: Actualizar Tipo ShippingZone (línea ~47)**

```diff
- type ShippingZone = { id: string; name: string; price: number; free: boolean };
+ import { ShippingZone } from '@/lib/api/shipping';
```

### **Patch 3: Agregar Estados para UI Avanzada (línea ~252)**

```diff
  const [zones, setZones]                           = useState<ShippingZone[]>(DEFAULT_ZONES);
+ const [showZoneModal, setShowZoneModal]           = useState(false);
+ const [editingZone, setEditingZone]               = useState<ShippingZone | null>(null);
+ const [coverageMode, setCoverageMode]             = useState<'rapido' | 'avanzado'>('rapido');
+ const [selectedEstado, setSelectedEstado]         = useState<number | null>(null);
+ const [selectedMunicipios, setSelectedMunicipios] = useState<number[]>([]);
+ const [selectedParroquias, setSelectedParroquias] = useState<number[]>([]);
+ const [showMunicipioModal, setShowMunicipioModal] = useState(false);
+ const [showParroquiaModal, setShowParroquiaModal] = useState(false);
+ const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
+ const [zoneToDelete, setZoneToDelete]             = useState<string | null>(null);
+ const [newZoneName, setNewZoneName]               = useState('');
+ const [newZonePrice, setNewZonePrice]             = useState<number>(5);
+ const [newZoneFree, setNewZoneFree]               = useState(false);
+ const [newZoneDeliveryTime, setNewZoneDeliveryTime] = useState('');
```

### **Patch 4: Cargar Zonas Reales (línea ~520, después del useEffect de WhatsApp)**

```diff
+ useEffect(() => {
+   if (activeTab !== 'envios') return;
+   const loadShippingZones = async () => {
+     try {
+       const res = await shippingApi.getZones();
+       setZones(res.data.zones);
+     } catch (err) {
+       console.error('[Settings] Error loading shipping zones:', err);
+       setSaveError('No se pudieron cargar las zonas de envío');
+     }
+   };
+   loadShippingZones();
+ }, [activeTab]);
```

### **Patch 5: Handlers para CRUD (línea ~580, después de handleNotif)**

```diff
+ const resetZoneForm = () => {
+   setNewZoneName('');
+   setNewZonePrice(5);
+   setNewZoneFree(false);
+   setNewZoneDeliveryTime('');
+   setSelectedEstado(null);
+   setSelectedMunicipios([]);
+   setSelectedParroquias([]);
+   setEditingZone(null);
+   setCoverageMode('rapido');
+ };
+
+ const handleSaveZone = async () => {
+   if (!newZoneName || !selectedEstado) {
+     alert('Nombre y estado son obligatorios');
+     return;
+   }
+   const coverages: CreateShippingZoneInput['coverages'] = [];
+   if (coverageMode === 'rapido') {
+     coverages.push({ estadoId: selectedEstado, municipioId: null, parroquiaId: null });
+   } else {
+     if (selectedMunicipios.length === 0) {
+       alert('Selecciona al menos 1 municipio en modo avanzado');
+       return;
+     }
+     for (const munId of selectedMunicipios) {
+       const parroquiasForMun = selectedParroquias.filter(p =>
+         parroquias.find(par => par.id === p && par.municipioId === munId)
+       );
+       if (parroquiasForMun.length > 0) {
+         for (const parId of parroquiasForMun) {
+           coverages.push({ estadoId: selectedEstado, municipioId: munId, parroquiaId: parId });
+         }
+       } else {
+         coverages.push({ estadoId: selectedEstado, municipioId: munId, parroquiaId: null });
+       }
+     }
+   }
+   const zoneData: CreateShippingZoneInput = {
+     name: newZoneName,
+     price: newZoneFree ? 0 : newZonePrice,
+     free: newZoneFree,
+     deliveryTime: newZoneDeliveryTime || undefined,
+     coverages,
+   };
+   try {
+     if (editingZone) {
+       await shippingApi.updateZone(editingZone.id, zoneData);
+       setZones(prev => prev.map(z => z.id === editingZone.id ? { ...z, ...zoneData } : z));
+     } else {
+       const res = await shippingApi.createZone(zoneData);
+       setZones(prev => [...prev, res.data]);
+     }
+     setShowZoneModal(false);
+     resetZoneForm();
+   } catch (err) {
+     console.error('[Settings] Error saving zone:', err);
+     alert('No se pudo guardar la zona. Intenta de nuevo.');
+   }
+ };
+
+ const handleEditZone = (zone: ShippingZone) => {
+   setEditingZone(zone);
+   setNewZoneName(zone.name);
+   setNewZonePrice(zone.price);
+   setNewZoneFree(zone.free);
+   setNewZoneDeliveryTime(zone.deliveryTime || '');
+   const firstCov = zone.coverages?.[0];
+   if (firstCov) {
+     setSelectedEstado(firstCov.estadoId);
+     setSelectedMunicipios(zone.coverages.filter(c => c.municipioId).map(c => c.municipioId!).filter(Boolean));
+     setSelectedParroquias(zone.coverages.filter(c => c.parroquiaId).map(c => c.parroquiaId!).filter(Boolean));
+   }
+   setCoverageMode(zone.coverages?.length > 1 ? 'avanzado' : 'rapido');
+   setShowZoneModal(true);
+ };
+
+ const handleDeleteZone = async () => {
+   if (!zoneToDelete) return;
+   try {
+     await shippingApi.deleteZone(zoneToDelete);
+     setZones(prev => prev.filter(z => z.id !== zoneToDelete));
+     setShowDeleteConfirm(false);
+     setZoneToDelete(null);
+   } catch (err) {
+     console.error('[Settings] Error deleting zone:', err);
+     alert('No se pudo eliminar la zona');
+   }
+ };
```

### **Patch 6: Reemplazar UI del Tab Envíos (línea ~1350)**

*Reemplaza TODO el bloque `{activeTab === 'envios' && (...)}` con el código que te envié en el mensaje anterior.*

---

## 🚀 Comandos para Ejecutar

```bash
# 1. Sincronizar Prisma con la BD
cd packages/database
pnpm prisma db pull
pnpm prisma generate

# 2. Reiniciar backend para cargar nuevos tipos
cd apps/backend
pnpm dev

# 3. Reiniciar frontend
cd apps/frontend
pnpm dev
```

---

## ✅ Checklist Final

| Tarea | Estado |
|-------|--------|
| ✅ Schema Prisma actualizado | ✅ Listo |
| ✅ Patches para SettingsPage.tsx | ✅ Listo |
| ⏳ Ejecutar `pnpm prisma db pull` | ⏳ Pendiente |
| ⏳ Ejecutar `pnpm prisma generate` | ⏳ Pendiente |
| ⏳ Probar tab Envíos en Settings | ⏳ Pendiente |

**¿Necesitas que genere algún archivo adicional o procedes con los comandos de sincronización?** 🎯

# ✅ Opción B — Patches/Diffs para SettingsPage.tsx

Perfecto, Oscar. Aquí tienes los **patches exactos** para aplicar sobre tu archivo actual. Cada patch indica la línea aproximada y qué reemplazar.

---

## 📝 Patch 1: Agregar Imports de Shipping (Línea ~7)

```diff
  import { settingsApi, PaymentMethods, CatalogOptions, NotificationSettings } from '@/lib/api/settings';
  import { geoApi, Estado, Municipio, Parroquia, Country, VeAreaCode } from '@/lib/api/geo';
  import { metaApi, BankMeta, BusinessTypeMeta, PersonTypeMeta, IslrRegimenMeta } from '@/lib/api/meta';
+ import { shippingApi, ShippingZone, CreateShippingZoneInput } from '@/lib/api/shipping';
+ import { summarizeCoverages, getCoverageShortText } from '@/lib/helpers/summarizeCoverages';
+ import { municipioToItem, parroquiaToItem } from '@/lib/api/shipping';
```

---

## 📝 Patch 2: Actualizar Tipo ShippingZone (Línea ~47)

```diff
- type ShippingZone = { id: string; name: string; price: number; free: boolean };
+ // ShippingZone ahora viene de @/lib/api/shipping (tiene coverages, rates, etc.)
```

---

## 📝 Patch 3: Agregar Estados para UI Avanzada (Línea ~252, después de `const [zones, setZones]`)

```diff
  const [zones, setZones]                           = useState<ShippingZone[]>(DEFAULT_ZONES);
+ const [showZoneModal, setShowZoneModal]           = useState(false);
+ const [editingZone, setEditingZone]               = useState<ShippingZone | null>(null);
+ const [coverageMode, setCoverageMode]             = useState<'rapido' | 'avanzado'>('rapido');
+ const [selectedEstado, setSelectedEstado]         = useState<number | null>(null);
+ const [selectedMunicipios, setSelectedMunicipios] = useState<number[]>([]);
+ const [selectedParroquias, setSelectedParroquias] = useState<number[]>([]);
+ const [showMunicipioModal, setShowMunicipioModal] = useState(false);
+ const [showParroquiaModal, setShowParroquiaModal] = useState(false);
+ const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
+ const [zoneToDelete, setZoneToDelete]             = useState<string | null>(null);
+ const [newZoneName, setNewZoneName]               = useState('');
+ const [newZonePrice, setNewZonePrice]             = useState<number>(5);
+ const [newZoneFree, setNewZoneFree]               = useState(false);
+ const [newZoneDeliveryTime, setNewZoneDeliveryTime] = useState('');
```

---

## 📝 Patch 4: Cargar Zonas Reales desde API (Línea ~520, después del useEffect de WhatsApp)

```diff
  // ── Load WhatsApp ────────────────────────────────────────────────────────
  useEffect(() => {
    setWaLoading(true);
    whatsappApi.getStatus()
      .then(r => setWhatsappStatus(r.data))
      .catch(() => {})
      .finally(() => setWaLoading(false));
  }, []);

+ // ── Load Shipping Zones ─────────────────────────────────────────────────
+ useEffect(() => {
+   if (activeTab !== 'envios') return;
+   const loadShippingZones = async () => {
+     try {
+       const res = await shippingApi.getZones();
+       setZones(res.data.zones);
+     } catch (err) {
+       console.error('[Settings] Error loading shipping zones:', err);
+       setSaveError('No se pudieron cargar las zonas de envío');
+     }
+   };
+   loadShippingZones();
+ }, [activeTab]);
```

---

## 📝 Patch 5: Handlers para CRUD de Zonas (Línea ~580, después de `handleNotif`)

```diff
  const handleNotif = (ch: string, ev: string, val: boolean) =>
    setNotifSettings(p => ({ ...p, [ch]: { ...(p[ch] ?? {}), [ev]: val } }));

  const toggleModule = (id: string) =>
    setModules(p => p.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));

+ // ── Shipping Zone Handlers ──────────────────────────────────────────────
+ const resetZoneForm = () => {
+   setNewZoneName('');
+   setNewZonePrice(5);
+   setNewZoneFree(false);
+   setNewZoneDeliveryTime('');
+   setSelectedEstado(null);
+   setSelectedMunicipios([]);
+   setSelectedParroquias([]);
+   setEditingZone(null);
+   setCoverageMode('rapido');
+ };
+
+ const handleSaveZone = async () => {
+   if (!newZoneName || !selectedEstado) {
+     alert('Nombre y estado son obligatorios');
+     return;
+   }
+   const coverages: CreateShippingZoneInput['coverages'] = [];
+   if (coverageMode === 'rapido') {
+     coverages.push({ estadoId: selectedEstado, municipioId: null, parroquiaId: null });
+   } else {
+     if (selectedMunicipios.length === 0) {
+       alert('Selecciona al menos 1 municipio en modo avanzado');
+       return;
+     }
+     for (const munId of selectedMunicipios) {
+       const parroquiasForMun = selectedParroquias.filter(p =>
+         parroquias.find(par => par.id === p && par.municipioId === munId)
+       );
+       if (parroquiasForMun.length > 0) {
+         for (const parId of parroquiasForMun) {
+           coverages.push({ estadoId: selectedEstado, municipioId: munId, parroquiaId: parId });
+         }
+       } else {
+         coverages.push({ estadoId: selectedEstado, municipioId: munId, parroquiaId: null });
+       }
+     }
+   }
+   const zoneData: CreateShippingZoneInput = {
+     name: newZoneName,
+     price: newZoneFree ? 0 : newZonePrice,
+     free: newZoneFree,
+     deliveryTime: newZoneDeliveryTime || undefined,
+     coverages,
+   };
+   try {
+     if (editingZone) {
+       await shippingApi.updateZone(editingZone.id, zoneData);
+       setZones(prev => prev.map(z => z.id === editingZone.id ? { ...z, ...zoneData } : z));
+     } else {
+       const res = await shippingApi.createZone(zoneData);
+       setZones(prev => [...prev, res.data]);
+     }
+     setShowZoneModal(false);
+     resetZoneForm();
+   } catch (err) {
+     console.error('[Settings] Error saving zone:', err);
+     alert('No se pudo guardar la zona. Intenta de nuevo.');
+   }
+ };
+
+ const handleEditZone = (zone: ShippingZone) => {
+   setEditingZone(zone);
+   setNewZoneName(zone.name);
+   setNewZonePrice(zone.price);
+   setNewZoneFree(zone.free);
+   setNewZoneDeliveryTime(zone.deliveryTime || '');
+   const firstCov = zone.coverages?.[0];
+   if (firstCov) {
+     setSelectedEstado(firstCov.estadoId);
+     setSelectedMunicipios(zone.coverages.filter(c => c.municipioId).map(c => c.municipioId!).filter(Boolean));
+     setSelectedParroquias(zone.coverages.filter(c => c.parroquiaId).map(c => c.parroquiaId!).filter(Boolean));
+   }
+   setCoverageMode(zone.coverages?.length > 1 ? 'avanzado' : 'rapido');
+   setShowZoneModal(true);
+ };
+
+ const handleDeleteZone = async () => {
+   if (!zoneToDelete) return;
+   try {
+     await shippingApi.deleteZone(zoneToDelete);
+     setZones(prev => prev.filter(z => z.id !== zoneToDelete));
+     setShowDeleteConfirm(false);
+     setZoneToDelete(null);
+   } catch (err) {
+     console.error('[Settings] Error deleting zone:', err);
+     alert('No se pudo eliminar la zona');
+   }
+ };
```

---

## 📝 Patch 6: Reemplazar UI del Tab "Envíos" (Línea ~1350)

**Reemplaza TODO el bloque `{activeTab === 'envios' && (...)}`** con esto:

```tsx
{/* ══════════════════════════════════════════════════════════════
TAB: ENVÍOS — VERSIÓN CON DATOS REALES
══════════════════════════════════════════════════════════════ */}
{activeTab === 'envios' && (
  <div className="space-y-4">
    {/* Card: Zonas de envío */}
    <Card>
      <CardHeader 
        title="Zonas de envío" 
        subtitle="Define costos según ubicación del cliente"
        icon="🚚"
        action={
          <button 
            type="button"
            onClick={() => {
              resetZoneForm();
              setShowZoneModal(true);
            }}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-[#f5c842] hover:text-[#f5c842] transition"
          >
            + Agregar zona
          </button>
        }
      />
      
      <div className="divide-y divide-zinc-800 p-2">
        {zones.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm font-medium">Aún no tienes zonas configuradas</p>
            <p className="text-xs mt-1">Crea tu primera zona para definir costos de envío</p>
          </div>
        ) : (
          zones.map(zone => (
            <div key={zone.id} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-zinc-800/30 transition group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm">🗺️</div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-sm font-medium text-zinc-100">{zone.name}</div>
                {zone.coverages && zone.coverages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
                    <span>📍</span>
                    <span className="truncate max-w-[200px]">
                      {getCoverageShortText(zone.coverages)}
                    </span>
                    {/* CoverageDetailPanel si lo tienes importado */}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {zone.free ? (
                  <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400">GRATIS</span>
                ) : (
                  <div className="text-sm font-bold text-zinc-100">${zone.price}</div>
                )}
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                <button 
                  type="button"
                  onClick={() => handleEditZone(zone)}
                  className="text-zinc-600 hover:text-[#f5c842] transition text-xs"
                  title="Editar"
                >
                  ✎
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setZoneToDelete(zone.id);
                    setShowDeleteConfirm(true);
                  }}
                  className="text-zinc-600 hover:text-red-400 transition text-xs"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>

    {/* Card: Opciones de envío */}
    <Card>
      <CardHeader title="Opciones de envío" icon="⚙️" />
      <div className="px-5 py-3">
        <ToggleRow 
          title="Envío gratuito por monto mínimo" 
          desc="Aplica envío gratis cuando el pedido supera cierto valor"
          checked={freeShippingEnabled} 
          onChange={setFreeShippingEnabled} 
        />
        {freeShippingEnabled && (
          <div className="mb-3 ml-0 mt-2">
            <Field label="Monto mínimo para envío gratis ($)">
              <input 
                type="number" 
                value={freeShippingMin}
                onChange={e => setFreeShippingMin(+e.target.value)}
                className={`${iCls} py-2 text-xs`} 
                placeholder="Ej: 50" 
              />
            </Field>
          </div>
        )}
        <ToggleRow 
          title="Pickup / Retiro en tienda" 
          desc="El cliente puede retirar personalmente"
          checked={pickupEnabled} 
          onChange={setPickupEnabled} 
        />
      </div>
    </Card>
  </div>
)}
```

---

## 📝 Patch 7: Agregar Modales (Al final del render, antes del toast de savedOk/saveError)

```tsx
{/* ══════════════════════════════════════════════════════════════
MODAL: CREAR / EDITAR ZONA
══════════════════════════════════════════════════════════════ */}
{showZoneModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 shrink-0">
        <h3 className="text-sm font-bold text-zinc-100">
          {editingZone ? 'Editar zona' : 'Nueva zona'}
        </h3>
        <button onClick={() => setShowZoneModal(false)} className="text-zinc-500 hover:text-zinc-300 transition text-lg leading-none">✕</button>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-zinc-800 px-5 shrink-0">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCoverageMode('rapido')}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition ${
              coverageMode === 'rapido' 
                ? 'bg-zinc-950 text-zinc-100 border-b-2 border-[#f5c842]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🚀 Rápido
          </button>
          <button
            type="button"
            onClick={() => setCoverageMode('avanzado')}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition ${
              coverageMode === 'avanzado' 
                ? 'bg-zinc-950 text-zinc-100 border-b-2 border-[#f5c842]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚙️ Avanzado
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5 space-y-4 overflow-auto">
        <Field label="Nombre de la zona" full>
          <input
            value={newZoneName}
            onChange={e => setNewZoneName(e.target.value)}
            className={iCls}
            placeholder="Ej: Caracas (zona 1)"
          />
        </Field>
        
        {coverageMode === 'rapido' ? (
          <Field label="Estado">
            <select
              value={selectedEstado || ''}
              onChange={e => setSelectedEstado(e.target.value ? Number(e.target.value) : null)}
              className={iCls}
            >
              <option value="">Seleccionar estado...</option>
              {estados.map(e => (
                <option key={e.id} value={e.id}>{e.nombre_estado}</option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Estado">
              <select
                value={selectedEstado || ''}
                onChange={e => setSelectedEstado(e.target.value ? Number(e.target.value) : null)}
                className={iCls}
              >
                <option value="">Seleccionar estado...</option>
                {estados.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre_estado}</option>
                ))}
              </select>
            </Field>
            
            {selectedEstado && (
              <>
                <Field label={`Municipios (${selectedMunicipios.length} seleccionados)`}>
                  <button
                    type="button"
                    onClick={() => setShowMunicipioModal(true)}
                    className={`w-full text-left ${iCls} flex items-center justify-between`}
                  >
                    <span>{selectedMunicipios.length === 0 ? 'Seleccionar municipios...' : `${selectedMunicipios.length} municipios`}</span>
                    <span className="text-zinc-500">▼</span>
                  </button>
                </Field>
                
                {selectedMunicipios.length > 0 && (
                  <Field label={`Parroquias (${selectedParroquias.length} seleccionadas)`}>
                    <button
                      type="button"
                      onClick={() => setShowParroquiaModal(true)}
                      className={`w-full text-left ${iCls} flex items-center justify-between`}
                    >
                      <span>{selectedParroquias.length === 0 ? 'Seleccionar parroquias...' : `${selectedParroquias.length} parroquias`}</span>
                      <span className="text-zinc-500">▼</span>
                    </button>
                  </Field>
                )}
              </>
            )}
          </>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <Field label="Precio de envío ($)">
            <input
              type="number"
              step="0.01"
              value={newZonePrice}
              onChange={e => setNewZonePrice(Number(e.target.value) || 0)}
              className={iCls}
              disabled={newZoneFree}
            />
          </Field>
          <Field label="Tiempo de entrega">
            <input
              value={newZoneDeliveryTime}
              onChange={e => setNewZoneDeliveryTime(e.target.value)}
              className={iCls}
              placeholder="Ej: 24-48h"
            />
          </Field>
        </div>
        
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={newZoneFree}
            onChange={e => setNewZoneFree(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 accent-[#f5c842]"
          />
          Envío gratis
        </label>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4 shrink-0">
        <button
          type="button"
          onClick={() => setShowZoneModal(false)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSaveZone}
          className="rounded-lg bg-[#f5c842] px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#f5c842]/90 transition"
        >
          {editingZone ? 'Guardar cambios' : 'Crear zona'}
        </button>
      </div>
    </div>
  </div>
)}

{/* Modales de selección múltiple */}
{showMunicipioModal && selectedEstado && (
  <MultiSelectModal
    items={municipios.filter(m => m.estadoId === selectedEstado).map(municipioToItem)}
    selected={selectedMunicipios}
    onChange={setSelectedMunicipios}
    title="Seleccionar municipios"
    searchPlaceholder="Buscar municipio..."
    onClose={() => setShowMunicipioModal(false)}
    minItems={1}
  />
)}

{showParroquiaModal && selectedMunicipios.length > 0 && (
  <MultiSelectModal
    items={parroquias.filter(p => selectedMunicipios.includes(p.municipioId)).map(parroquiaToItem)}
    selected={selectedParroquias}
    onChange={setSelectedParroquias}
    title="Seleccionar parroquias"
    searchPlaceholder="Buscar parroquia..."
    onClose={() => setShowParroquiaModal(false)}
  />
)}

{/* ConfirmModal para eliminar */}
{showDeleteConfirm && (
  <ConfirmModal
    title="Eliminar zona"
    message={`¿Eliminar "${zones.find(z => z.id === zoneToDelete)?.name}"? Esta acción no se puede deshacer.`}
    variant="danger"
    onConfirm={handleDeleteZone}
    onCancel={() => {
      setShowDeleteConfirm(false);
      setZoneToDelete(null);
    }}
  />
)}
```

---

## 📋 Resumen de Cambios

| Patch | Líneas Aprox. | Qué Cambia |
|-------|--------------|------------|
| 1 | ~7 | Imports de shipping API |
| 2 | ~47 | Tipo ShippingZone |
| 3 | ~252 | 13 estados nuevos para UI avanzada |
| 4 | ~520 | useEffect para cargar zonas reales |
| 5 | ~580 | 4 handlers (reset, save, edit, delete) |
| 6 | ~1350 | UI completa del tab Envíos |
| 7 | ~final | 3 modales (zona, multi-select, confirm) |

---

## 🚀 Comandos para Sincronizar Prisma

```bash
# 1. Sincronizar schema con la BD
cd packages/database
pnpm prisma db pull
pnpm prisma generate

# 2. Reiniciar backend
cd apps/backend
pnpm dev

# 3. Reiniciar frontend
cd apps/frontend
pnpm dev
```

---

## ✅ Checklist de Aplicación

| Paso | Estado |
|------|--------|
| 1. Aplicar Patch 1 (imports) | ⏳ Pendiente |
| 2. Aplicar Patch 2 (tipo) | ⏳ Pendiente |
| 3. Aplicar Patch 3 (estados) | ⏳ Pendiente |
| 4. Aplicar Patch 4 (useEffect) | ⏳ Pendiente |
| 5. Aplicar Patch 5 (handlers) | ⏳ Pendiente |
| 6. Aplicar Patch 6 (UI tab) | ⏳ Pendiente |
| 7. Aplicar Patch 7 (modales) | ⏳ Pendiente |
| 8. Ejecutar `pnpm prisma db pull` | ⏳ Pendiente |
| 9. Probar en navegador | ⏳ Pendiente |

---

**¿Necesitas que te genere algún archivo completo (como `MultiSelectModal.tsx` o `ConfirmModal.tsx`) si no los tienes, o ya los tienes de la implementación anterior?** 🎯

# 📄 README_usuarios.MD — Adaptado para Arquitectura de 4 Niveles

```markdown
# VentasVE — Sistema de Usuarios: Arquitectura Multi-Tenant

## 🏗️ Estructura del Sistema (4 Niveles)

```
VentasVE Platform
├── 🔹 NIVEL 1: Platform (Gestión de VentasVE)
│   ├── PlatformUser → SUPER_ADMIN / ADMIN / SUPPORT / SALES / TECH / VIEWER
│   ├── PlatformAuditLog → Auditoría de acciones
│   └── SupportTicket → Tickets de soporte
│
├── 🔹 NIVEL 2: Business (Tenant / Negocio Registrado)
│   ├── Business → Tienda-A, Tienda-B... (slug único)
│   ├── StoreUser → OWNER / ADMIN / MANAGER / STAFF / VIEWER
│   ├── Product → Catálogo del negocio
│   ├── Order → Pedidos del negocio
│   ├── ShippingZone → Zonas de envío configuradas
│   └── CustomerBusinessProfile → Perfil del cliente EN este negocio
│
├── 🔹 NIVEL 3: Customer (Cliente Global)
│   ├── Customer → Cuenta única global (email + password)
│   ├── CustomerBusinessProfile → Contexto por negocio (type, wishlist, notas)
│   ├── Address → Direcciones reutilizables entre negocios
│   └── Order → Historial de compras (con businessId)
│
└── 🔹 NIVEL 4: Delivery (Logística Operativa)
    ├── DeliveryPerson → Repartidor (INDEPENDENT / BUSINESS_EMPLOYEE / PLATFORM_POOL)
    ├── DeliveryOrder → Asignación de entrega
    ├── DeliveryDocument → Documentos verificados
    └── DeliveryRating → Calificaciones
```

---

## 👥 Tipos de Usuario y Roles

### 🔹 NIVEL 1: PlatformUser (Admin de VentasVE)

| Rol | Alcance | Permisos Clave |
|-----|---------|---------------|
| `SUPER_ADMIN` | Toda la plataforma | Crear/suspender negocios, billing global, analytics platform |
| `ADMIN` | Platform operativa | Soporte, tickets, verificar repartidores, métricas |
| `SUPPORT` | Tickets de usuarios | Responder tickets, escalar incidencias |
| `SALES` | Onboarding | Demo a nuevos negocios, activar planes |
| `TECH` | Soporte técnico | Integraciones API, debugging avanzado |
| `VIEWER` | Lectura | Analytics platform, reportes globales |

### 🔹 NIVEL 2: StoreUser (Panel del Negocio)

| Rol | Alcance | Permisos Clave |
|-----|---------|---------------|
| `OWNER` | Un negocio | Todo: settings, billing, usuarios, productos, pedidos |
| `ADMIN` | Un negocio | Operativo: productos, pedidos, chat, envíos (sin billing) |
| `MANAGER` | Un negocio | Gestión de equipo: productos, pedidos, staff (sin settings) |
| `STAFF` | Un negocio | Inbox, respuestas, estado de pedidos |
| `VIEWER` | Un negocio | Solo lectura de reportes y dashboard |

### 🔹 NIVEL 3: Customer (Cliente Final)

| Tipo | Características | Beneficios |
|------|----------------|------------|
| `REGISTERED` | Cuenta global, historial por negocio | Pedidos rápidos, wishlist, notificaciones |
| `WHOLESALE` | Precios mayoristas, pedidos mínimos | Descuentos por volumen, condiciones B2B |
| `VIP` | Descuentos automáticos, envío prioritario | Experiencia premium, soporte dedicado |
| `BLACKLIST` | Cliente bloqueado por negocio | No puede comprar en ese negocio específico |

### 🔹 NIVEL 4: DeliveryPerson (Repartidor)

| Tipo | Vinculación | Alcance |
|------|-------------|---------|
| `INDEPENDENT` | Freelance | Asignable a cualquier negocio que lo solicite |
| `BUSINESS_EMPLOYEE` | Nómina del negocio | Solo trabaja para un negocio específico |
| `PLATFORM_POOL` | Pool de VentasVE | Asignado dinámicamente por la plataforma |
| `THIRD_PARTY` | Empresa externa (MRW, Zoom) | Integración vía API con tracking |

---

## 🔄 Flujos de Autenticación

### 🔹 Cliente: Registro en un Negocio

```
Cliente entra a /c/:slug (ej: /c/omarte)
        │
        ▼
POST /api/v1/auth/customer/register
{
  "email": "juan@email.com",
  "password": "secure123",
  "name": "Juan Pérez",
  "phone": "+584125551234",
  "businessId": "ID_OMARTE"
}
        │
        ├── Verifica que el negocio existe y está activo
        ├── Crea Customer global (si no existe)
        ├── Crea CustomerBusinessProfile para ese negocio
        │   • type: REGISTERED (default)
        │   • firstSeenAt: now()
        └── Retorna JWT:
            {
              "sub": "customer_id_global",
              "email": "juan@email.com",
              "businessId": "ID_OMARTE",
              "profileType": "REGISTERED"
            }
```

### 🔹 Cliente: Login en Negocio Nuevo

```
Cliente (ya registrado en tienda-A) entra a /c/tienda-B
        │
        ▼
POST /api/v1/auth/customer/login
{
  "email": "juan@email.com",
  "password": "secure123",
  "businessId": "ID_TIENDA_B"
}
        │
        ├── Valida credenciales globales
        ├── Busca CustomerBusinessProfile(tienda-B)
        │     ├─ ¿Existe? → actualiza lastSeenAt
        │     └─ ¿No existe? → crea perfil automáticamente (type: REGISTERED)
        ├── Verifica isBlocked = false
        └── Retorna JWT con businessId: "ID_TIENDA_B"
```

### 🔹 Cliente: Switch de Negocio (sin re-login)

```
Cliente logueado en tienda-A navega a tienda-B
        │
        ▼
POST /api/v1/auth/customer/switch-business
Headers: { Authorization: "Bearer <token-tienda-A>" }
Body: { "targetBusinessId": "ID_TIENDA_B" }
        │
        ├── Valida token actual
        ├── Busca/crea CustomerBusinessProfile(tienda-B)
        ├── Verifica isBlocked = false
        └── Retorna NUEVO JWT con businessId: "ID_TIENDA_B"
```

### 🔹 StoreUser: Login en Panel

```
Usuario del negocio entra a /dashboard
        │
        ▼
POST /api/v1/auth/store/login
{
  "email": "admin@tienda.com",
  "password": "secure123",
  "businessSlug": "omarte"  // o businessId
}
        │
        ├── Busca StoreUser con email + businessId
        ├── Valida password y isActive = true
        ├── Verifica role tiene permisos para dashboard
        └── Retorna JWT:
            {
              "sub": "store_user_id",
              "email": "admin@tienda.com",
              "businessId": "ID_OMARTE",
              "role": "OWNER"
            }
```

### 🔹 PlatformUser: Login en Admin Global

```
Admin de VentasVE entra a /platform/admin
        │
        ▼
POST /api/v1/platform/auth/login
{
  "email": "superadmin@ventasve.app",
  "password": "secure123"
}
        │
        ├── Valida PlatformUser credentials
        ├── Verifica isActive = true
        ├── Registra login en PlatformAuditLog
        └── Retorna JWT:
            {
              "sub": "platform_user_id",
              "email": "superadmin@ventasve.app",
              "role": "SUPER_ADMIN"
            }
```

---

## 📁 Estructura de Módulos

```
apps/backend/src/
├── auth-platform/                    # Auth para admins de VentasVE
│   ├── auth-platform.module.ts
│   ├── auth-platform.service.ts
│   ├── auth-platform.controller.ts
│   ├── strategies/platform-jwt.strategy.ts
│   ├── guards/platform-jwt.guard.ts
│   └── decorators/current-platform-user.decorator.ts
│
├── auth-store/                       # Auth para usuarios del panel (negocio)
│   ├── auth-store.module.ts
│   ├── auth-store.service.ts
│   ├── auth-store.controller.ts
│   ├── strategies/store-jwt.strategy.ts
│   ├── guards/store-jwt.guard.ts
│   ├── guards/roles.guard.ts        # @Roles(OWNER, ADMIN, ...)
│   └── decorators/current-store-user.decorator.ts
│
├── auth-customer/                    # Auth para clientes finales
│   ├── auth-customer.module.ts
│   ├── auth-customer.service.ts
│   ├── auth-customer.controller.ts
│   ├── strategies/customer-jwt.strategy.ts
│   ├── guards/customer-jwt.guard.ts
│   └── decorators/current-customer.decorator.ts
│
├── auth-delivery/                    # Auth para repartidores
│   ├── auth-delivery.module.ts
│   ├── auth-delivery.service.ts
│   ├── auth-delivery.controller.ts
│   └── strategies/delivery-jwt.strategy.ts
│
├── customers/                        # Gestión de clientes (dashboard)
│   ├── customers.module.ts
│   ├── customers.service.ts         # findOrCreateProfile, updateType, toggleBlock
│   ├── customers.controller.ts      # GET/PATCH /businesses/:id/customers
│   └── dto/
│
├── delivery/                         # Gestión de repartidores
│   ├── delivery.module.ts
│   ├── delivery.service.ts          # assignOrder, updateLocation, verifyDelivery
│   ├── delivery.controller.ts       # GET/PATCH /delivery/assignments
│   └── dto/
│
├── platform-admin/                   # Gestión de platform (super-admin)
│   ├── platform-admin.module.ts
│   ├── platform-admin.service.ts    # suspendBusiness, createPlatformUser
│   ├── platform-admin.controller.ts # GET/POST/PATCH /platform/*
│   └── dto/
│
└── prisma/
    └── schema.prisma                # Modelos completos de los 4 niveles
```

---

## 🌐 Endpoints por Nivel

### 🔹 NIVEL 1: Platform Admin

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/v1/platform/auth/login` | Login de admin de plataforma | — |
| GET | `/api/v1/platform/businesses` | Listar todos los negocios | SUPER_ADMIN, ADMIN |
| PATCH | `/api/v1/platform/businesses/:id/suspend` | Suspender negocio | SUPER_ADMIN |
| GET | `/api/v1/platform/users` | Listar usuarios de plataforma | SUPER_ADMIN |
| POST | `/api/v1/platform/users` | Crear usuario de plataforma | SUPER_ADMIN |
| GET | `/api/v1/platform/tickets` | Tickets de soporte | ADMIN, SUPPORT |
| PATCH | `/api/v1/platform/tickets/:id/assign` | Asignar ticket | ADMIN, SUPPORT |
| GET | `/api/v1/platform/analytics/overview` | Métricas globales | SUPER_ADMIN, ADMIN, VIEWER |

### 🔹 NIVEL 2: StoreUser (Dashboard)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/v1/auth/store/login` | Login de usuario del negocio | — |
| GET | `/api/v1/businesses/me` | Mi negocio (configuración) | OWNER, ADMIN, MANAGER, STAFF, VIEWER |
| PATCH | `/api/v1/businesses/me` | Actualizar configuración | OWNER, ADMIN |
| GET | `/api/v1/businesses/me/users` | Listar usuarios del negocio | OWNER, ADMIN |
| POST | `/api/v1/businesses/me/users/invite` | Invitar nuevo usuario | OWNER |
| GET | `/api/v1/products` | Listar productos del negocio | OWNER, ADMIN, MANAGER, STAFF, VIEWER |
| POST | `/api/v1/products` | Crear producto | OWNER, ADMIN, MANAGER |
| GET | `/api/v1/orders` | Listar pedidos | OWNER, ADMIN, MANAGER, STAFF, VIEWER |
| PATCH | `/api/v1/orders/:id/status` | Actualizar estado de pedido | OWNER, ADMIN, MANAGER, STAFF |
| GET | `/api/v1/customers` | Listar clientes del negocio | OWNER, ADMIN, MANAGER, STAFF |
| PATCH | `/api/v1/customers/:id/type` | Cambiar tipo de cliente | OWNER, ADMIN |
| PATCH | `/api/v1/customers/:id/block` | Bloquear cliente | OWNER, ADMIN |
| GET | `/api/v1/shipping-zones` | Zonas de envío | OWNER, ADMIN, MANAGER |
| POST | `/api/v1/shipping-zones` | Crear zona de envío | OWNER, ADMIN |

### 🔹 NIVEL 3: Customer (Público)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/customer/register` | Registro global + perfil en negocio | — |
| POST | `/api/v1/auth/customer/login` | Login + crea perfil si no existe | — |
| POST | `/api/v1/auth/customer/switch-business` | Nuevo token para otro negocio | Customer JWT |
| GET | `/api/v1/customers/me` | Mi perfil global | Customer JWT |
| PATCH | `/api/v1/customers/me` | Actualizar perfil global | Customer JWT |
| GET | `/api/v1/customers/me/addresses` | Mis direcciones | Customer JWT |
| POST | `/api/v1/customers/me/addresses` | Nueva dirección | Customer JWT |
| GET | `/api/v1/customers/me/orders` | Mis pedidos (todos los negocios) | Customer JWT |
| GET | `/api/v1/catalog/:slug/products` | Catálogo público de un negocio | — |
| POST | `/api/v1/catalog/:slug/orders` | Crear pedido (GUEST o REGISTERED) | — / Customer JWT |

### 🔹 NIVEL 4: Delivery (App Móvil / PWA)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/delivery/register` | Registro de repartidor | — |
| POST | `/api/v1/auth/delivery/login` | Login de repartidor | — |
| GET | `/api/v1/delivery/profile` | Perfil del repartidor | Delivery JWT |
| PATCH | `/api/v1/delivery/profile` | Actualizar perfil | Delivery JWT |
| POST | `/api/v1/delivery/documents` | Subir documentos | Delivery JWT |
| GET | `/api/v1/delivery/assignments` | Entregas asignadas | Delivery JWT |
| PATCH | `/api/v1/delivery/assignments/:id/status` | Actualizar estado (PICKED_UP, DELIVERED) | Delivery JWT |
| POST | `/api/v1/delivery/location` | Actualizar ubicación en tiempo real | Delivery JWT |
| POST | `/api/v1/delivery/assignments/:id/proof` | Subir prueba de entrega (foto, firma, OTP) | Delivery JWT |

---

## 🔐 JWT Payloads por Tipo

### Customer JWT
```typescript
interface CustomerJwtPayload {
  sub: string;         // customerId (global)
  email: string;
  businessId: string;  // negocio activo en esta sesión
  profileType: string; // REGISTERED | WHOLESALE | VIP
  iat: number;
  exp: number;
}
```

### StoreUser JWT
```typescript
interface StoreUserJwtPayload {
  sub: string;         // storeUserId
  email: string;
  businessId: string;  // negocio al que pertenece
  role: string;        // OWNER | ADMIN | MANAGER | STAFF | VIEWER
  permissions?: string[]; // permisos personalizados (opcional)
  iat: number;
  exp: number;
}
```

### PlatformUser JWT
```typescript
interface PlatformUserJwtPayload {
  sub: string;         // platformUserId
  email: string;
  role: string;        // SUPER_ADMIN | ADMIN | SUPPORT | SALES | TECH | VIEWER
  iat: number;
  exp: number;
}
```

### DeliveryPerson JWT
```typescript
interface DeliveryJwtPayload {
  sub: string;         // deliveryPersonId
  email: string;
  type: string;        // INDEPENDENT | BUSINESS_EMPLOYEE | PLATFORM_POOL | THIRD_PARTY
  businessId?: string; // null si es PLATFORM_POOL
  isVerified: boolean;
  iat: number;
  exp: number;
}
```

---

## 🗄️ Schema Prisma (Resumen de Modelos Clave)

```prisma
// NIVEL 1: Platform
model PlatformUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      PlatformUserRole @default(SUPPORT)
  isActive  Boolean  @default(true)
  // ... relaciones con auditLogs, supportTickets, managedBusinesses
}

// NIVEL 2: Business + StoreUser
model Business {
  id          String   @id @default(cuid())
  slug        String   @unique  // usado en URL: /c/:slug
  name        String
  businessType BusinessType @default(OTHER)
  plan        SubscriptionPlan @default(FREE)
  isActive    Boolean  @default(true)
  // ... relaciones con storeUsers, customerProfiles, orders, products
}

model StoreUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      StoreUserRole @default(STAFF)
  businessId String
  business  Business @relation(fields: [businessId], references: [id])
  // ... sesiones, órdenes atendidas
}

// NIVEL 3: Customer Global + Perfil por Negocio
model Customer {
  id       String   @id @default(cuid())
  email    String   @unique  // login único global
  password String?
  name     String
  // ... OAuth fields, isActive, isVerified
  businessProfiles CustomerBusinessProfile[]
  orders           Order[]
  addresses        Address[]
}

model CustomerBusinessProfile {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  businessId String
  business   Business @relation(fields: [businessId], references: [id])
  type       CustomerType @default(REGISTERED)
  wishlist   Json?
  isBlocked  Boolean  @default(false)
  // ... métricas: totalOrders, totalSpent, avgTicket
  @@unique([customerId, businessId])
}

// NIVEL 4: Delivery
model DeliveryPerson {
  id        String   @id @default(cuid())
  email     String   @unique
  phone     String   @unique
  name      String
  idNumber  String   @unique  // Cédula/DNI
  type      DeliveryType @default(INDEPENDENT)
  businessId String?  // null si es PLATFORM_POOL
  isActive  Boolean  @default(true)
  isVerified Boolean @default(false)
  // ... vehicle, location, metrics
  deliveries DeliveryOrder[]
}
```

---

## ⚙️ Setup y Migraciones

```bash
# 1. Variables de entorno (.env en raíz y en apps/backend)
DATABASE_URL="postgresql://ventasve_user:ventasve2026!@localhost:5432/ventasve"
JWT_SECRET="tu-secreto-seguro-min-32-caracteres"
JWT_EXPIRES_IN="7d"

# 2. Migrar schema a la base de datos
cd packages/database
pnpm prisma migrate dev --name "add-multi-tenant-users"

# 3. Generar cliente Prisma
pnpm prisma generate

# 4. Seed inicial (SUPER_ADMIN + negocio de prueba)
pnpm prisma db seed

# 5. Verificar en Prisma Studio
pnpm prisma studio
```

### Seed Inicial (packages/database/prisma/seed.ts)
```typescript
// Crea:
// • PlatformUser: superadmin@ventasve.app / VentasVE2026!SuperAdmin
// • Business: "Hermanos Martínez" (slug: omarte)
// • StoreUser: admin@hermanosmartinez.test / Admin123! (OWNER)
// • Estados: DTTO. CAPITAL, MIRANDA, LA GUAIRA
// • ShippingMethods: DELIVERY_PROPIO, MRW, ZOOM, etc.
```

---

## 🧪 Testing Rápido

```bash
# 1. Probar registro de cliente
curl -X POST http://localhost:3001/api/v1/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@test.com",
    "password": "Cliente123!",
    "name": "Juan Pérez",
    "businessId": "ID_DEL_NEGOCIO"
  }'

# 2. Probar login de StoreUser
curl -X POST http://localhost:3001/api/v1/auth/store/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hermanosmartinez.test",
    "password": "Admin123!",
    "businessSlug": "omarte"
  }'

# 3. Probar switch de negocio (cliente)
curl -X POST http://localhost:3001/api/v1/auth/customer/switch-business \
  -H "Authorization: Bearer TOKEN_ACTUAL" \
  -H "Content-Type: application/json" \
  -d '{ "targetBusinessId": "OTRO_ID_DE_NEGOCIO" }'

# 4. Probar listado de clientes (desde dashboard)
curl http://localhost:3001/api/v1/businesses/ID_NEGOCIO/customers \
  -H "Authorization: Bearer STORE_USER_TOKEN"
```

---

## 🚀 Próximos Pasos

### ✅ Completados
- [x] Schema Prisma con 4 niveles de usuarios
- [x] Migración SQL para tablas nuevas
- [x] Seed inicial de SUPER_ADMIN y negocio de prueba
- [x] Documentación de flujos y endpoints

### 🔜 Pendientes (Prioridad Alta)
- [ ] `AuthStoreModule` — auth para StoreUsers con guards de roles
- [ ] `@Roles()` decorator para proteger endpoints del dashboard
- [ ] `AuthPlatformModule` — auth para admins de VentasVE
- [ ] `AuthDeliveryModule` — auth para repartidores + OTP de entrega

### 🔜 Pendientes (Prioridad Media)
- [ ] Módulo `Products` con catálogo por negocio + permisos por rol
- [ ] Módulo `Orders` con soporte GUEST + REGISTERED + delivery assignment
- [ ] OAuth (Google) para clientes: `POST /auth/customer/google`
- [ ] Webhook de WhatsApp → crear Conversation + Message automáticamente

### 🔜 Pendientes (Prioridad Baja)
- [ ] Tests unitarios para `customers.service.ts` y `auth-customer.service.ts`
- [ ] Tests E2E con Playwright para flujos multi-tenant
- [ ] Documentación OpenAPI/Swagger para endpoints públicos
- [ ] Internacionalización de mensajes de error y validaciones

---

## ❓ FAQ

### ¿Un cliente puede tener diferentes tipos en diferentes negocios?
**Sí.** `CustomerBusinessProfile.type` es independiente por negocio. Juan puede ser `VIP` en tienda-A y `REGISTERED` en tienda-B.

### ¿Qué pasa si un cliente se registra en un negocio que luego es suspendido?
El cliente sigue existiendo (es global). Solo no podrá comprar en ese negocio específico mientras esté suspendido. Puede seguir comprando en otros negocios activos.

### ¿Cómo se maneja la privacidad entre negocios?
Cada negocio solo ve sus propios `CustomerBusinessProfile`. No puede acceder a datos de clientes de otros negocios, ni a su historial en otras tiendas.

### ¿Puedo cambiar el rol de un StoreUser después de crearlo?
**Sí**, pero solo `OWNER` puede cambiar roles. Usa `PATCH /api/v1/businesses/me/users/:id/role` con el nuevo rol.

### ¿Cómo se verifica un repartidor del pool de plataforma?
Un `PlatformUser` con rol `ADMIN` o `SUPPORT` revisa los documentos subidos (`DeliveryDocument`) y marca `isVerified = true` vía `PATCH /api/v1/platform/delivery/:id/verify`.

---

> 📌 **Nota**: Este sistema está diseñado para escalar. Agregar nuevos tipos de usuario o roles no requiere cambiar la arquitectura base, solo extender enums y guards.
```

---

## ✅ Resumen de Cambios Realizados

| Sección | Cambio |
|---------|--------|
| **Estructura** | Actualizada a 4 niveles: Platform, Business, Customer, Delivery |
| **Roles** | Agregados PlatformUserRole, StoreUserRole, CustomerType, DeliveryType |
| **Flujos** | Añadidos login/registro para StoreUser y PlatformUser |
| **Endpoints** | Completos por nivel con roles requeridos |
| **JWT Payloads** | Definidos para los 4 tipos de usuario |
| **Schema** | Resumen de modelos clave con relaciones |
| **Setup** | Comandos actualizados para migración multi-tenant |
| **Testing** | Ejemplos de cURL para cada tipo de auth |
| **FAQ** | Preguntas frecuentes sobre privacidad y escalabilidad |

---

**¿Necesitas que adapte también la documentación de endpoints en OpenAPI/Swagger, o prefieres que procedamos con la implementación de `AuthStoreModule`?** 🎯

# 📄 README_usuarios.MD — Adaptado para Arquitectura de 4 Niveles

```markdown
# VentasVE — Sistema de Usuarios: Arquitectura Multi-Tenant

## 🏗️ Estructura del Sistema (4 Niveles)

```
VentasVE Platform
├── 🔹 NIVEL 1: Platform (Gestión de VentasVE)
│   ├── PlatformUser → SUPER_ADMIN / ADMIN / SUPPORT / SALES / TECH / VIEWER
│   ├── PlatformAuditLog → Auditoría de acciones
│   └── SupportTicket → Tickets de soporte
│
├── 🔹 NIVEL 2: Business (Tenant / Negocio Registrado)
│   ├── Business → Tienda-A, Tienda-B... (slug único)
│   ├── StoreUser → OWNER / ADMIN / MANAGER / STAFF / VIEWER
│   ├── Product → Catálogo del negocio
│   ├── Order → Pedidos del negocio
│   ├── ShippingZone → Zonas de envío configuradas
│   └── CustomerBusinessProfile → Perfil del cliente EN este negocio
│
├── 🔹 NIVEL 3: Customer (Cliente Global)
│   ├── Customer → Cuenta única global (email + password)
│   ├── CustomerBusinessProfile → Contexto por negocio (type, wishlist, notas)
│   ├── Address → Direcciones reutilizables entre negocios
│   └── Order → Historial de compras (con businessId)
│
└── 🔹 NIVEL 4: Delivery (Logística Operativa)
    ├── DeliveryPerson → Repartidor (INDEPENDENT / BUSINESS_EMPLOYEE / PLATFORM_POOL)
    ├── DeliveryOrder → Asignación de entrega
    ├── DeliveryDocument → Documentos verificados
    └── DeliveryRating → Calificaciones
```

---

## 👥 Tipos de Usuario y Roles

### 🔹 NIVEL 1: PlatformUser (Admin de VentasVE)

| Rol | Alcance | Permisos Clave |
|-----|---------|---------------|
| `SUPER_ADMIN` | Toda la plataforma | Crear/suspender negocios, billing global, analytics platform |
| `ADMIN` | Platform operativa | Soporte, tickets, verificar repartidores, métricas |
| `SUPPORT` | Tickets de usuarios | Responder tickets, escalar incidencias |
| `SALES` | Onboarding | Demo a nuevos negocios, activar planes |
| `TECH` | Soporte técnico | Integraciones API, debugging avanzado |
| `VIEWER` | Lectura | Analytics platform, reportes globales |

### 🔹 NIVEL 2: StoreUser (Panel del Negocio)

| Rol | Alcance | Permisos Clave |
|-----|---------|---------------|
| `OWNER` | Un negocio | Todo: settings, billing, usuarios, productos, pedidos |
| `ADMIN` | Un negocio | Operativo: productos, pedidos, chat, envíos (sin billing) |
| `MANAGER` | Un negocio | Gestión de equipo: productos, pedidos, staff (sin settings) |
| `STAFF` | Un negocio | Inbox, respuestas, estado de pedidos |
| `VIEWER` | Un negocio | Solo lectura de reportes y dashboard |

### 🔹 NIVEL 3: Customer (Cliente Final)

| Tipo | Características | Beneficios |
|------|----------------|------------|
| `REGISTERED` | Cuenta global, historial por negocio | Pedidos rápidos, wishlist, notificaciones |
| `WHOLESALE` | Precios mayoristas, pedidos mínimos | Descuentos por volumen, condiciones B2B |
| `VIP` | Descuentos automáticos, envío prioritario | Experiencia premium, soporte dedicado |
| `BLACKLIST` | Cliente bloqueado por negocio | No puede comprar en ese negocio específico |

### 🔹 NIVEL 4: DeliveryPerson (Repartidor)

| Tipo | Vinculación | Alcance |
|------|-------------|---------|
| `INDEPENDENT` | Freelance | Asignable a cualquier negocio que lo solicite |
| `BUSINESS_EMPLOYEE` | Nómina del negocio | Solo trabaja para un negocio específico |
| `PLATFORM_POOL` | Pool de VentasVE | Asignado dinámicamente por la plataforma |
| `THIRD_PARTY` | Empresa externa (MRW, Zoom) | Integración vía API con tracking |

---

## 🔄 Flujos de Autenticación

### 🔹 Cliente: Registro en un Negocio

```
Cliente entra a /c/:slug (ej: /c/omarte)
        │
        ▼
POST /api/v1/auth/customer/register
{
  "email": "juan@email.com",
  "password": "secure123",
  "name": "Juan Pérez",
  "phone": "+584125551234",
  "businessId": "ID_OMARTE"
}
        │
        ├── Verifica que el negocio existe y está activo
        ├── Crea Customer global (si no existe)
        ├── Crea CustomerBusinessProfile para ese negocio
        │   • type: REGISTERED (default)
        │   • firstSeenAt: now()
        └── Retorna JWT:
            {
              "sub": "customer_id_global",
              "email": "juan@email.com",
              "businessId": "ID_OMARTE",
              "profileType": "REGISTERED"
            }
```

### 🔹 Cliente: Login en Negocio Nuevo

```
Cliente (ya registrado en tienda-A) entra a /c/tienda-B
        │
        ▼
POST /api/v1/auth/customer/login
{
  "email": "juan@email.com",
  "password": "secure123",
  "businessId": "ID_TIENDA_B"
}
        │
        ├── Valida credenciales globales
        ├── Busca CustomerBusinessProfile(tienda-B)
        │     ├─ ¿Existe? → actualiza lastSeenAt
        │     └─ ¿No existe? → crea perfil automáticamente (type: REGISTERED)
        ├── Verifica isBlocked = false
        └── Retorna JWT con businessId: "ID_TIENDA_B"
```

### 🔹 Cliente: Switch de Negocio (sin re-login)

```
Cliente logueado en tienda-A navega a tienda-B
        │
        ▼
POST /api/v1/auth/customer/switch-business
Headers: { Authorization: "Bearer <token-tienda-A>" }
Body: { "targetBusinessId": "ID_TIENDA_B" }
        │
        ├── Valida token actual
        ├── Busca/crea CustomerBusinessProfile(tienda-B)
        ├── Verifica isBlocked = false
        └── Retorna NUEVO JWT con businessId: "ID_TIENDA_B"
```

### 🔹 StoreUser: Login en Panel

```
Usuario del negocio entra a /dashboard
        │
        ▼
POST /api/v1/auth/store/login
{
  "email": "admin@tienda.com",
  "password": "secure123",
  "businessSlug": "omarte"  // o businessId
}
        │
        ├── Busca StoreUser con email + businessId
        ├── Valida password y isActive = true
        ├── Verifica role tiene permisos para dashboard
        └── Retorna JWT:
            {
              "sub": "store_user_id",
              "email": "admin@tienda.com",
              "businessId": "ID_OMARTE",
              "role": "OWNER"
            }
```

### 🔹 PlatformUser: Login en Admin Global

```
Admin de VentasVE entra a /platform/admin
        │
        ▼
POST /api/v1/platform/auth/login
{
  "email": "superadmin@ventasve.app",
  "password": "secure123"
}
        │
        ├── Valida PlatformUser credentials
        ├── Verifica isActive = true
        ├── Registra login en PlatformAuditLog
        └── Retorna JWT:
            {
              "sub": "platform_user_id",
              "email": "superadmin@ventasve.app",
              "role": "SUPER_ADMIN"
            }
```

---

## 📁 Estructura de Módulos

```
apps/backend/src/
├── auth-platform/                    # Auth para admins de VentasVE
│   ├── auth-platform.module.ts
│   ├── auth-platform.service.ts
│   ├── auth-platform.controller.ts
│   ├── strategies/platform-jwt.strategy.ts
│   ├── guards/platform-jwt.guard.ts
│   └── decorators/current-platform-user.decorator.ts
│
├── auth-store/                       # Auth para usuarios del panel (negocio)
│   ├── auth-store.module.ts
│   ├── auth-store.service.ts
│   ├── auth-store.controller.ts
│   ├── strategies/store-jwt.strategy.ts
│   ├── guards/store-jwt.guard.ts
│   ├── guards/roles.guard.ts        # @Roles(OWNER, ADMIN, ...)
│   └── decorators/current-store-user.decorator.ts
│
├── auth-customer/                    # Auth para clientes finales
│   ├── auth-customer.module.ts
│   ├── auth-customer.service.ts
│   ├── auth-customer.controller.ts
│   ├── strategies/customer-jwt.strategy.ts
│   ├── guards/customer-jwt.guard.ts
│   └── decorators/current-customer.decorator.ts
│
├── auth-delivery/                    # Auth para repartidores
│   ├── auth-delivery.module.ts
│   ├── auth-delivery.service.ts
│   ├── auth-delivery.controller.ts
│   └── strategies/delivery-jwt.strategy.ts
│
├── customers/                        # Gestión de clientes (dashboard)
│   ├── customers.module.ts
│   ├── customers.service.ts         # findOrCreateProfile, updateType, toggleBlock
│   ├── customers.controller.ts      # GET/PATCH /businesses/:id/customers
│   └── dto/
│
├── delivery/                         # Gestión de repartidores
│   ├── delivery.module.ts
│   ├── delivery.service.ts          # assignOrder, updateLocation, verifyDelivery
│   ├── delivery.controller.ts       # GET/PATCH /delivery/assignments
│   └── dto/
│
├── platform-admin/                   # Gestión de platform (super-admin)
│   ├── platform-admin.module.ts
│   ├── platform-admin.service.ts    # suspendBusiness, createPlatformUser
│   ├── platform-admin.controller.ts # GET/POST/PATCH /platform/*
│   └── dto/
│
└── prisma/
    └── schema.prisma                # Modelos completos de los 4 niveles
```

---

## 🌐 Endpoints por Nivel

### 🔹 NIVEL 1: Platform Admin

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/v1/platform/auth/login` | Login de admin de plataforma | — |
| GET | `/api/v1/platform/businesses` | Listar todos los negocios | SUPER_ADMIN, ADMIN |
| PATCH | `/api/v1/platform/businesses/:id/suspend` | Suspender negocio | SUPER_ADMIN |
| GET | `/api/v1/platform/users` | Listar usuarios de plataforma | SUPER_ADMIN |
| POST | `/api/v1/platform/users` | Crear usuario de plataforma | SUPER_ADMIN |
| GET | `/api/v1/platform/tickets` | Tickets de soporte | ADMIN, SUPPORT |
| PATCH | `/api/v1/platform/tickets/:id/assign` | Asignar ticket | ADMIN, SUPPORT |
| GET | `/api/v1/platform/analytics/overview` | Métricas globales | SUPER_ADMIN, ADMIN, VIEWER |

### 🔹 NIVEL 2: StoreUser (Dashboard)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/v1/auth/store/login` | Login de usuario del negocio | — |
| GET | `/api/v1/businesses/me` | Mi negocio (configuración) | OWNER, ADMIN, MANAGER, STAFF, VIEWER |
| PATCH | `/api/v1/businesses/me` | Actualizar configuración | OWNER, ADMIN |
| GET | `/api/v1/businesses/me/users` | Listar usuarios del negocio | OWNER, ADMIN |
| POST | `/api/v1/businesses/me/users/invite` | Invitar nuevo usuario | OWNER |
| GET | `/api/v1/products` | Listar productos del negocio | OWNER, ADMIN, MANAGER, STAFF, VIEWER |
| POST | `/api/v1/products` | Crear producto | OWNER, ADMIN, MANAGER |
| GET | `/api/v1/orders` | Listar pedidos | OWNER, ADMIN, MANAGER, STAFF, VIEWER |
| PATCH | `/api/v1/orders/:id/status` | Actualizar estado de pedido | OWNER, ADMIN, MANAGER, STAFF |
| GET | `/api/v1/customers` | Listar clientes del negocio | OWNER, ADMIN, MANAGER, STAFF |
| PATCH | `/api/v1/customers/:id/type` | Cambiar tipo de cliente | OWNER, ADMIN |
| PATCH | `/api/v1/customers/:id/block` | Bloquear cliente | OWNER, ADMIN |
| GET | `/api/v1/shipping-zones` | Zonas de envío | OWNER, ADMIN, MANAGER |
| POST | `/api/v1/shipping-zones` | Crear zona de envío | OWNER, ADMIN |

### 🔹 NIVEL 3: Customer (Público)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/customer/register` | Registro global + perfil en negocio | — |
| POST | `/api/v1/auth/customer/login` | Login + crea perfil si no existe | — |
| POST | `/api/v1/auth/customer/switch-business` | Nuevo token para otro negocio | Customer JWT |
| GET | `/api/v1/customers/me` | Mi perfil global | Customer JWT |
| PATCH | `/api/v1/customers/me` | Actualizar perfil global | Customer JWT |
| GET | `/api/v1/customers/me/addresses` | Mis direcciones | Customer JWT |
| POST | `/api/v1/customers/me/addresses` | Nueva dirección | Customer JWT |
| GET | `/api/v1/customers/me/orders` | Mis pedidos (todos los negocios) | Customer JWT |
| GET | `/api/v1/catalog/:slug/products` | Catálogo público de un negocio | — |
| POST | `/api/v1/catalog/:slug/orders` | Crear pedido (GUEST o REGISTERED) | — / Customer JWT |

### 🔹 NIVEL 4: Delivery (App Móvil / PWA)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/delivery/register` | Registro de repartidor | — |
| POST | `/api/v1/auth/delivery/login` | Login de repartidor | — |
| GET | `/api/v1/delivery/profile` | Perfil del repartidor | Delivery JWT |
| PATCH | `/api/v1/delivery/profile` | Actualizar perfil | Delivery JWT |
| POST | `/api/v1/delivery/documents` | Subir documentos | Delivery JWT |
| GET | `/api/v1/delivery/assignments` | Entregas asignadas | Delivery JWT |
| PATCH | `/api/v1/delivery/assignments/:id/status` | Actualizar estado (PICKED_UP, DELIVERED) | Delivery JWT |
| POST | `/api/v1/delivery/location` | Actualizar ubicación en tiempo real | Delivery JWT |
| POST | `/api/v1/delivery/assignments/:id/proof` | Subir prueba de entrega (foto, firma, OTP) | Delivery JWT |

---

## 🔐 JWT Payloads por Tipo

### Customer JWT
```typescript
interface CustomerJwtPayload {
  sub: string;         // customerId (global)
  email: string;
  businessId: string;  // negocio activo en esta sesión
  profileType: string; // REGISTERED | WHOLESALE | VIP
  iat: number;
  exp: number;
}
```

### StoreUser JWT
```typescript
interface StoreUserJwtPayload {
  sub: string;         // storeUserId
  email: string;
  businessId: string;  // negocio al que pertenece
  role: string;        // OWNER | ADMIN | MANAGER | STAFF | VIEWER
  permissions?: string[]; // permisos personalizados (opcional)
  iat: number;
  exp: number;
}
```

### PlatformUser JWT
```typescript
interface PlatformUserJwtPayload {
  sub: string;         // platformUserId
  email: string;
  role: string;        // SUPER_ADMIN | ADMIN | SUPPORT | SALES | TECH | VIEWER
  iat: number;
  exp: number;
}
```

### DeliveryPerson JWT
```typescript
interface DeliveryJwtPayload {
  sub: string;         // deliveryPersonId
  email: string;
  type: string;        // INDEPENDENT | BUSINESS_EMPLOYEE | PLATFORM_POOL | THIRD_PARTY
  businessId?: string; // null si es PLATFORM_POOL
  isVerified: boolean;
  iat: number;
  exp: number;
}
```

---

## 🗄️ Schema Prisma (Resumen de Modelos Clave)

```prisma
// NIVEL 1: Platform
model PlatformUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      PlatformUserRole @default(SUPPORT)
  isActive  Boolean  @default(true)
  // ... relaciones con auditLogs, supportTickets, managedBusinesses
}

// NIVEL 2: Business + StoreUser
model Business {
  id          String   @id @default(cuid())
  slug        String   @unique  // usado en URL: /c/:slug
  name        String
  businessType BusinessType @default(OTHER)
  plan        SubscriptionPlan @default(FREE)
  isActive    Boolean  @default(true)
  // ... relaciones con storeUsers, customerProfiles, orders, products
}

model StoreUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      StoreUserRole @default(STAFF)
  businessId String
  business  Business @relation(fields: [businessId], references: [id])
  // ... sesiones, órdenes atendidas
}

// NIVEL 3: Customer Global + Perfil por Negocio
model Customer {
  id       String   @id @default(cuid())
  email    String   @unique  // login único global
  password String?
  name     String
  // ... OAuth fields, isActive, isVerified
  businessProfiles CustomerBusinessProfile[]
  orders           Order[]
  addresses        Address[]
}

model CustomerBusinessProfile {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  businessId String
  business   Business @relation(fields: [businessId], references: [id])
  type       CustomerType @default(REGISTERED)
  wishlist   Json?
  isBlocked  Boolean  @default(false)
  // ... métricas: totalOrders, totalSpent, avgTicket
  @@unique([customerId, businessId])
}

// NIVEL 4: Delivery
model DeliveryPerson {
  id        String   @id @default(cuid())
  email     String   @unique
  phone     String   @unique
  name      String
  idNumber  String   @unique  // Cédula/DNI
  type      DeliveryType @default(INDEPENDENT)
  businessId String?  // null si es PLATFORM_POOL
  isActive  Boolean  @default(true)
  isVerified Boolean @default(false)
  // ... vehicle, location, metrics
  deliveries DeliveryOrder[]
}
```

---

## ⚙️ Setup y Migraciones

```bash
# 1. Variables de entorno (.env en raíz y en apps/backend)
DATABASE_URL="postgresql://ventasve_user:ventasve2026!@localhost:5432/ventasve"
JWT_SECRET="tu-secreto-seguro-min-32-caracteres"
JWT_EXPIRES_IN="7d"

# 2. Migrar schema a la base de datos
cd packages/database
pnpm prisma migrate dev --name "add-multi-tenant-users"

# 3. Generar cliente Prisma
pnpm prisma generate

# 4. Seed inicial (SUPER_ADMIN + negocio de prueba)
pnpm prisma db seed

# 5. Verificar en Prisma Studio
pnpm prisma studio
```

### Seed Inicial (packages/database/prisma/seed.ts)
```typescript
// Crea:
// • PlatformUser: superadmin@ventasve.app / VentasVE2026!SuperAdmin
// • Business: "Hermanos Martínez" (slug: omarte)
// • StoreUser: admin@hermanosmartinez.test / Admin123! (OWNER)
// • Estados: DTTO. CAPITAL, MIRANDA, LA GUAIRA
// • ShippingMethods: DELIVERY_PROPIO, MRW, ZOOM, etc.
```

---

## 🧪 Testing Rápido

```bash
# 1. Probar registro de cliente
curl -X POST http://localhost:3001/api/v1/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@test.com",
    "password": "Cliente123!",
    "name": "Juan Pérez",
    "businessId": "ID_DEL_NEGOCIO"
  }'

# 2. Probar login de StoreUser
curl -X POST http://localhost:3001/api/v1/auth/store/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hermanosmartinez.test",
    "password": "Admin123!",
    "businessSlug": "omarte"
  }'

# 3. Probar switch de negocio (cliente)
curl -X POST http://localhost:3001/api/v1/auth/customer/switch-business \
  -H "Authorization: Bearer TOKEN_ACTUAL" \
  -H "Content-Type: application/json" \
  -d '{ "targetBusinessId": "OTRO_ID_DE_NEGOCIO" }'

# 4. Probar listado de clientes (desde dashboard)
curl http://localhost:3001/api/v1/businesses/ID_NEGOCIO/customers \
  -H "Authorization: Bearer STORE_USER_TOKEN"
```

---

## 🚀 Próximos Pasos

### ✅ Completados
- [x] Schema Prisma con 4 niveles de usuarios
- [x] Migración SQL para tablas nuevas
- [x] Seed inicial de SUPER_ADMIN y negocio de prueba
- [x] Documentación de flujos y endpoints

### 🔜 Pendientes (Prioridad Alta)
- [ ] `AuthStoreModule` — auth para StoreUsers con guards de roles
- [ ] `@Roles()` decorator para proteger endpoints del dashboard
- [ ] `AuthPlatformModule` — auth para admins de VentasVE
- [ ] `AuthDeliveryModule` — auth para repartidores + OTP de entrega

### 🔜 Pendientes (Prioridad Media)
- [ ] Módulo `Products` con catálogo por negocio + permisos por rol
- [ ] Módulo `Orders` con soporte GUEST + REGISTERED + delivery assignment
- [ ] OAuth (Google) para clientes: `POST /auth/customer/google`
- [ ] Webhook de WhatsApp → crear Conversation + Message automáticamente

### 🔜 Pendientes (Prioridad Baja)
- [ ] Tests unitarios para `customers.service.ts` y `auth-customer.service.ts`
- [ ] Tests E2E con Playwright para flujos multi-tenant
- [ ] Documentación OpenAPI/Swagger para endpoints públicos
- [ ] Internacionalización de mensajes de error y validaciones

---

## ❓ FAQ

### ¿Un cliente puede tener diferentes tipos en diferentes negocios?
**Sí.** `CustomerBusinessProfile.type` es independiente por negocio. Juan puede ser `VIP` en tienda-A y `REGISTERED` en tienda-B.

### ¿Qué pasa si un cliente se registra en un negocio que luego es suspendido?
El cliente sigue existiendo (es global). Solo no podrá comprar en ese negocio específico mientras esté suspendido. Puede seguir comprando en otros negocios activos.

### ¿Cómo se maneja la privacidad entre negocios?
Cada negocio solo ve sus propios `CustomerBusinessProfile`. No puede acceder a datos de clientes de otros negocios, ni a su historial en otras tiendas.

### ¿Puedo cambiar el rol de un StoreUser después de crearlo?
**Sí**, pero solo `OWNER` puede cambiar roles. Usa `PATCH /api/v1/businesses/me/users/:id/role` con el nuevo rol.

### ¿Cómo se verifica un repartidor del pool de plataforma?
Un `PlatformUser` con rol `ADMIN` o `SUPPORT` revisa los documentos subidos (`DeliveryDocument`) y marca `isVerified = true` vía `PATCH /api/v1/platform/delivery/:id/verify`.

---

> 📌 **Nota**: Este sistema está diseñado para escalar. Agregar nuevos tipos de usuario o roles no requiere cambiar la arquitectura base, solo extender enums y guards.
```

---

## ✅ Resumen de Cambios Realizados

| Sección | Cambio |
|---------|--------|
| **Estructura** | Actualizada a 4 niveles: Platform, Business, Customer, Delivery |
| **Roles** | Agregados PlatformUserRole, StoreUserRole, CustomerType, DeliveryType |
| **Flujos** | Añadidos login/registro para StoreUser y PlatformUser |
| **Endpoints** | Completos por nivel con roles requeridos |
| **JWT Payloads** | Definidos para los 4 tipos de usuario |
| **Schema** | Resumen de modelos clave con relaciones |
| **Setup** | Comandos actualizados para migración multi-tenant |
| **Testing** | Ejemplos de cURL para cada tipo de auth |
| **FAQ** | Preguntas frecuentes sobre privacidad y escalabilidad |

---

**¿Necesitas que adapte también la documentación de endpoints en OpenAPI/Swagger, o prefieres que procedamos con la implementación de `AuthStoreModule`?** 🎯