# 📋 Tareas Pendientes — Estado Real del Proyecto (Actualizado)

Gracias por la claridad, Oscar. Esto es **oro puro** para trabajar con precisión. Aquí está el plan redefinido basado en la **realidad del código**, no en suposiciones.

---

## ✅ Lo que SÍ Está Implementado (Verificado)

| Módulo | Estado | Archivos Reales |
|--------|--------|----------------|
| **Schema Prisma** | ✅ Extendido | `CustomerProfile`, `CustomerPaymentMethod` agregados |
| **Shipping/Geo** | ✅ En uso | `ShippingZone`, `Estado`, `Municipio`, `Parroquia`, `ExchangeRate` |
| **Auth Customer** | ✅ Funcional | `auth-customer.ts` + `/mi-cuenta` + `/mi-cuenta/pedidos` |
| **Checkout** | ✅ Conectado | Token guardado, órdenes creadas |
| **Validación** | ✅ Zod | Middleware `validate()` con Zod (NO class-validator) |

---

## ❌ Lo que FALTA Implementar (Realidad)

| Tarea | Estado Real | Prioridad | Tiempo |
|-------|-------------|-----------|--------|
| **B. DTOs/Zod schemas** | ❌ No existen | 🔴 Alta | ~15 min |
| **C. Service layer (perfil)** | ❌ No existe | 🔴 Alta | ~20 min |
| **D. Endpoints REST (/me/profile)** | ❌ No existen | 🔴 Alta | ~25 min |
| **E. Seed para CustomerProfile** | ❌ No existe | 🟡 Media | ~10 min |
| **F. UI /mi-cuenta/perfil** | ❌ No existe | 🟡 Media | ~40 min |

---

## 🎯 Próximo Paso Confirmado: Endpoints de Perfil

Como dijiste, lo lógico es empezar por **D/C versión perfil**:

```
GET  /api/v1/customers/me/profile      → Obtener mi perfil
PATCH /api/v1/customers/me/profile     → Actualizar mi perfil
```

Esto habilita:
1. ✅ Que el frontend muestre datos reales del cliente
2. ✅ Que el cliente actualice su información personal
3. ✅ Base sólida para luego agregar direcciones y pagos

---

## 📁 Implementación: Backend (Zod + Prisma)

### **1. Zod Schema: `apps/backend/src/customers/schemas/customer-profile.schema.ts`**

```typescript
// apps/backend/src/customers/schemas/customer-profile.schema.ts
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// ESQUEMAS ZOD (Validación en español)
// ─────────────────────────────────────────────────────────────────────────────

export const GeneroSchema = z.enum([
  'MASCULINO',
  'FEMENINO',
  'OTRO',
  'PREFIERO_NO_DECIRLO',
]).optional().nullable();

export const TipoDocumentoSchema = z.enum([
  'V',  // Venezolano
  'E',  // Extranjero
  'J',  // Jurídico (RIF)
  'P',  // Pasaporte
  'OTRO',
]).optional().nullable();

export const UpdateCustomerProfileSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)').optional().nullable(),
  genero: GeneroSchema,
  tipoDocumento: TipoDocumentoSchema,
  idNumber: z.string().min(5, 'El número de documento debe tener al menos 5 caracteres').optional().nullable(),
  rif: z.string().min(5, 'El RIF debe tener al menos 5 caracteres').optional().nullable(),
  preferences: z.object({
    newsletter: z.boolean().optional(),
    notifications: z.boolean().optional(),
    idioma: z.enum(['es', 'en']).optional(),
    moneda: z.enum(['USD', 'VES']).optional(),
  }).optional().nullable(),
  avatar: z.string().url('Debe ser una URL válida').optional().nullable(),
  bio: z.string().max(500, 'La biografía no puede exceder 500 caracteres').optional().nullable(),
});

export type UpdateCustomerProfileInput = z.infer<typeof UpdateCustomerProfileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RESPUESTAS
// ─────────────────────────────────────────────────────────────────────────────

export const CustomerProfileResponseSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().nullable(),
  genero: z.string().nullable(),
  tipoDocumento: z.string().nullable(),
  idNumber: z.string().nullable(),
  rif: z.string().nullable(),
  preferences: z.any().nullable(),
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CustomerProfileResponse = z.infer<typeof CustomerProfileResponseSchema>;
```

---

### **2. Service: `apps/backend/src/customers/customers.service.ts`**

```typescript
// apps/backend/src/customers/customers.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerProfileInput } from './schemas/customer-profile.schema';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // PERFIL PERSONAL DEL CLIENTE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Obtener perfil personal del cliente autenticado
   */
  async getMyProfile(customerId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { customerId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado. Debes crear tu perfil primero.');
    }

    return profile;
  }

  /**
   * Crear o actualizar perfil personal del cliente
   */
  async updateMyProfile(customerId: string, data: UpdateCustomerProfileInput) {
    // Verificar que el cliente existe
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Verificar unicidad de idNumber y RIF si se están actualizando
    if (data.idNumber) {
      const existingByIdNumber = await this.prisma.customerProfile.findFirst({
        where: {
          idNumber: data.idNumber,
          customerId: { not: customerId },
        },
      });

      if (existingByIdNumber) {
        throw new ConflictException('El número de documento ya está registrado por otro cliente');
      }
    }

    if (data.rif) {
      const existingByRif = await this.prisma.customerProfile.findFirst({
        where: {
          rif: data.rif,
          customerId: { not: customerId },
        },
      });

      if (existingByRif) {
        throw new ConflictException('El RIF ya está registrado por otro cliente');
      }
    }

    // Actualizar o crear perfil (upsert)
    const profile = await this.prisma.customerProfile.upsert({
      where: { customerId },
      update: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      create: {
        customerId,
        firstName: data.firstName || customer.name.split(' ')[0] || 'Cliente',
        lastName: data.lastName || customer.name.split(' ')[1] || '',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        genero: data.genero,
        tipoDocumento: data.tipoDocumento,
        idNumber: data.idNumber,
        rif: data.rif,
        preferences: data.preferences,
        avatar: data.avatar,
        bio: data.bio,
      },
    });

    return profile;
  }

  /**
   * Obtener o crear perfil (para checkout o primer acceso)
   */
  async findOrCreateProfile(customerId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { customerId },
    });

    if (profile) {
      return profile;
    }

    // Crear perfil mínimo con datos del Customer
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const [firstName, ...lastNameParts] = customer.name.split(' ');

    return this.prisma.customerProfile.create({
      data: {
        customerId,
        firstName: firstName || 'Cliente',
        lastName: lastNameParts.join(' ') || '',
      },
    });
  }
}
```

---

### **3. Controller: `apps/backend/src/customers/customers.controller.ts`**

```typescript
// apps/backend/src/customers/customers.controller.ts
import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerJwtGuard } from '../auth-customer/guards/customer-jwt.guard';
import { CurrentCustomer } from '../auth-customer/decorators/current-customer.decorator';
import { validate } from '../common/middleware/validate.middleware';
import {
  UpdateCustomerProfileSchema,
  UpdateCustomerProfileInput,
  CustomerProfileResponseSchema,
} from './schemas/customer-profile.schema';

@ApiTags('Customers - Perfil Personal')
@ApiBearerAuth('access-token')
@Controller('customers/me')
@UseGuards(CustomerJwtGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/v1/customers/me/profile
  // ───────────────────────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({
    summary: 'Obtener mi perfil personal',
    description: 'Retorna el perfil personal del cliente autenticado (datos globales, no por negocio)',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido exitosamente',
    type: CustomerProfileResponseSchema,
  })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getMyProfile(@CurrentCustomer() customer: any) {
    const profile = await this.customersService.getMyProfile(customer.customerId);
    return {
      success: true,
      data: profile,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/customers/me/profile
  // ───────────────────────────────────────────────────────────────────────────

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar mi perfil personal',
    description: 'Actualiza los datos personales del cliente autenticado. Campos opcionales: solo los enviados serán actualizados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: CustomerProfileResponseSchema,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Documento o RIF ya registrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async updateMyProfile(
    @CurrentCustomer() customer: any,
    @Body() body: UpdateCustomerProfileInput,
  ) {
    // Validar con Zod
    const validatedData = validate(UpdateCustomerProfileSchema, body);

    const profile = await this.customersService.updateMyProfile(
      customer.customerId,
      validatedData,
    );

    return {
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: profile,
    };
  }
}
```

---

### **4. Módulo: `apps/backend/src/customers/customers.module.ts`**

```typescript
// apps/backend/src/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthCustomerModule } from '../auth-customer/auth-customer.module';

@Module({
  imports: [PrismaModule, AuthCustomerModule],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
```

---

## 🧪 Testing con cURL

```bash
# ─────────────────────────────────────────────────────────────────────────────
# 1. OBTENER MI PERFIL
# ─────────────────────────────────────────────────────────────────────────────
curl -X GET http://localhost:3001/api/v1/customers/me/profile \
  -H "Authorization: Bearer TU_CUSTOMER_TOKEN_AQUI"

# Respuesta esperada (200):
{
  "success": true,
  "data": {
    "id": "cm_abc123",
    "customerId": "cust_xyz789",
    "firstName": "Juan",
    "lastName": "Pérez",
    "dateOfBirth": "1990-05-15",
    "genero": "MASCULINO",
    "tipoDocumento": "V",
    "idNumber": "V-12345678",
    "rif": "V-12345678-2",
    "preferences": {
      "newsletter": true,
      "notifications": true,
      "idioma": "es",
      "moneda": "USD"
    },
    "avatar": null,
    "bio": null,
    "createdAt": "2026-02-22T10:00:00.000Z",
    "updatedAt": "2026-02-22T10:00:00.000Z"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. ACTUALIZAR MI PERFIL
# ─────────────────────────────────────────────────────────────────────────────
curl -X PATCH http://localhost:3001/api/v1/customers/me/profile \
  -H "Authorization: Bearer TU_CUSTOMER_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "lastName": "Pérez Rodríguez",
    "genero": "MASCULINO",
    "tipoDocumento": "V",
    "idNumber": "V-12345678",
    "rif": "V-12345678-2",
    "preferences": {
      "newsletter": true,
      "notifications": false,
      "idioma": "es",
      "moneda": "USD"
    },
    "bio": "Cliente frecuente de productos artesanales"
  }'

# Respuesta esperada (200):
{
  "success": true,
  "message": "Perfil actualizado exitosamente",
  "data": { ...perfil actualizado... }
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. ERRORES COMUNES
# ─────────────────────────────────────────────────────────────────────────────

# 401 - No autenticado (token faltante o inválido)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

# 404 - Perfil no encontrado (primera vez, debe crear)
{
  "statusCode": 404,
  "message": "Perfil no encontrado. Debes crear tu perfil primero.",
  "error": "Not Found"
}

# 409 - Documento duplicado
{
  "statusCode": 409,
  "message": "El número de documento ya está registrado por otro cliente",
  "error": "Conflict"
}

# 400 - Validación Zod fallida
{
  "statusCode": 400,
  "message": [
    "El nombre debe tener al menos 2 caracteres",
    "Formato de fecha inválido (YYYY-MM-DD)"
  ],
  "error": "Bad Request"
}
```

---

## 📋 Checklist de Implementación

| Paso | Tarea | Estado |
|------|-------|--------|
| 1 | Crear `customers-profile.schema.ts` con Zod | ⏳ Pendiente |
| 2 | Agregar métodos en `customers.service.ts` | ⏳ Pendiente |
| 3 | Agregar endpoints en `customers.controller.ts` | ⏳ Pendiente |
| 4 | Registrar `CustomersModule` en `app.module.ts` | ⏳ Pendiente |
| 5 | Sincronizar Prisma (`pnpm prisma generate`) | ⏳ Pendiente |
| 6 | Probar con cURL/Postman | ⏳ Pendiente |
| 7 | Actualizar frontend `/mi-cuenta/perfil` | ⏳ Pendiente |

---

## 🚀 ¿Confirmas que proceda con esta implementación?

| Opción | Qué hago |
|--------|----------|
| **"Sí, procede"** | Genero los 4 archivos completos listos para copiar/pegar |
| **"Primero sincroniza Prisma"** | Te guío paso a paso con `pnpm prisma generate` |
| **"Mejor empieza por el frontend"** | Genero la UI `/mi-cuenta/perfil` asumiendo que el backend funcionará |
| **"Agrega direcciones primero"** | Cambio el orden: Address CRUD antes que perfil |

**Mi recomendación**: Ve con **"Sí, procede"** para tener el backend funcional hoy mismo. El frontend será trivial una vez que el endpoint responda.

¿Confirmas? 🎯