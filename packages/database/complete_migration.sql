DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('FASHION', 'FOOD', 'BEAUTY', 'TECH', 'GROCERY', 'HOME', 'HEALTH', 'EDUCATION', 'AUTO', 'SERVICE', 'PET', 'OTHER');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'AGENT', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('WEB', 'WHATSAPP', 'BOT', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ZELLE', 'PAGO_MOVIL', 'BINANCE', 'CASH_USD', 'TRANSFER_BS', 'CRYPTO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('V', 'E', 'J', 'P', 'OTHER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'WEB');

-- CreateEnum
CREATE TYPE "ConvStatus" AS ENUM ('OPEN', 'BOT', 'HUMAN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MsgRole" AS ENUM ('CUSTOMER', 'BOT', 'AGENT');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BusinessType" NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "whatsapp" TEXT NOT NULL,
    "city" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catalogOptions" JSONB,
    "description" TEXT,
    "instagram" TEXT,
    "paymentMethods" JSONB,
    "schedule" TEXT,
    "store_latitude" DOUBLE PRECISION,
    "store_longitude" DOUBLE PRECISION,
    "store_address" VARCHAR(200),

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(2) NOT NULL,
    "nombre_estado" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipios" (
    "id" SERIAL NOT NULL,
    "estado_id" INTEGER NOT NULL,
    "nombre_municipio" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(4) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parroquias" (
    "id" SERIAL NOT NULL,
    "municipio_id" INTEGER NOT NULL,
    "nombre_parroquia" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(6) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parroquias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreUser" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "storeUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceUsdCents" INTEGER NOT NULL,
    "costCents" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[],
    "variants" JSONB NOT NULL DEFAULT '[]',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "identification" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "facebookId" TEXT,
    "oauthProvider" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "idType" "IdType",
    "idNumber" TEXT,
    "preferences" JSONB,
    "avatar" TEXT,
    "bio" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" SERIAL NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "source" "OrderSource" NOT NULL DEFAULT 'WEB',
    "totalCents" INTEGER NOT NULL,
    "exchangeRate" DECIMAL(65,30),
    "paymentMethod" "PaymentMethod" NOT NULL,
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shipping_zone_slug" VARCHAR(50),
    "shipping_cost_cents" INTEGER,
    "shipping_method_code" VARCHAR(20),
    "delivery_lat" DOUBLE PRECISION,
    "delivery_lng" DOUBLE PRECISION,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_business_profiles" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "wishlist" JSONB,
    "internalNote" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgTicket" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_payment_methods" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "PaymentMethod" NOT NULL,
    "details" JSONB NOT NULL,
    "nickname" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'VE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "variantSelected" JSONB,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reference" TEXT,
    "proofImageUrl" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "status" "ConvStatus" NOT NULL DEFAULT 'BOT',
    "botActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MsgRole" NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "waId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "usdToVes" DECIMAL(65,30) NOT NULL,
    "source" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bancos" (
    "id" SERIAL NOT NULL,
    "codigo_ibp" VARCHAR(4) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "nombre_corto" VARCHAR(50),
    "activo" BOOLEAN DEFAULT true,
    "orden" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bancos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pago" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "icono" VARCHAR(10),
    "descripcion" TEXT,
    "requiere_cuenta" BOOLEAN DEFAULT true,
    "requiere_comprobante" BOOLEAN DEFAULT true,
    "orden" INTEGER DEFAULT 0,
    "activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regimenes_islr" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "porcentaje_base" DECIMAL(5,2),
    "requiere_declaracion" BOOLEAN DEFAULT true,
    "activo" BOOLEAN DEFAULT true,
    "orden" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regimenes_islr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_documento" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(4) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "mascara" VARCHAR(20),
    "longitud_min" INTEGER DEFAULT 7,
    "longitud_max" INTEGER DEFAULT 12,
    "requiere_digito_verificador" BOOLEAN DEFAULT false,
    "activo" BOOLEAN DEFAULT true,
    "orden" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_negocio" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "icono" VARCHAR(10),
    "descripcion" TEXT,
    "campos_especiales" JSONB,
    "activo" BOOLEAN DEFAULT true,
    "orden" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_persona" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "requiere_razon_social" BOOLEAN DEFAULT false,
    "requiere_nombre_completo" BOOLEAN DEFAULT true,
    "campos_adicionales" JSONB,
    "activo" BOOLEAN DEFAULT true,
    "orden" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_methods" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "icon" VARCHAR(10),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "free" BOOLEAN NOT NULL DEFAULT false,
    "freeOver" DECIMAL(10,2),
    "radius" INTEGER,
    "deliveryTime" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "methodId" INTEGER NOT NULL,
    "costType" VARCHAR(10) NOT NULL DEFAULT 'fixed',
    "costValue" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_zone_coverage" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "estadoId" INTEGER NOT NULL,
    "municipioId" INTEGER,
    "parroquiaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_zone_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "estados_codigo_key" ON "estados"("codigo");

-- CreateIndex
CREATE INDEX "idx_estados_codigo" ON "estados"("codigo");

-- CreateIndex
CREATE INDEX "idx_estados_nombre" ON "estados"("nombre_estado");

-- CreateIndex
CREATE UNIQUE INDEX "municipios_codigo_key" ON "municipios"("codigo");

-- CreateIndex
CREATE INDEX "idx_municipios_codigo" ON "municipios"("codigo");

-- CreateIndex
CREATE INDEX "idx_municipios_estado_id" ON "municipios"("estado_id");

-- CreateIndex
CREATE UNIQUE INDEX "parroquias_codigo_key" ON "parroquias"("codigo");

-- CreateIndex
CREATE INDEX "idx_parroquias_codigo" ON "parroquias"("codigo");

-- CreateIndex
CREATE INDEX "idx_parroquias_municipio_id" ON "parroquias"("municipio_id");

-- CreateIndex
CREATE UNIQUE INDEX "StoreUser_email_key" ON "StoreUser"("email");

-- CreateIndex
CREATE INDEX "StoreUser_businessId_idx" ON "StoreUser"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_storeUserId_idx" ON "Session"("storeUserId");

-- CreateIndex
CREATE INDEX "Category_businessId_idx" ON "Category"("businessId");

-- CreateIndex
CREATE INDEX "Product_businessId_idx" ON "Product"("businessId");

-- CreateIndex
CREATE INDEX "Product_businessId_isPublished_idx" ON "Product"("businessId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_googleId_key" ON "Customer"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_facebookId_key" ON "Customer"("facebookId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_customerId_key" ON "customer_profiles"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_idNumber_key" ON "customer_profiles"("idNumber");

-- CreateIndex
CREATE INDEX "customer_profiles_customerId_idx" ON "customer_profiles"("customerId");

-- CreateIndex
CREATE INDEX "Order_businessId_status_idx" ON "Order"("businessId", "status");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_customer_business" ON "customer_business_profiles"("customerId", "businessId");

-- CreateIndex
CREATE INDEX "customer_payment_methods_customerId_isDefault_idx" ON "customer_payment_methods"("customerId", "isDefault");

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_isDefault_idx" ON "customer_addresses"("customerId", "isDefault");

-- CreateIndex
CREATE INDEX "Payment_businessId_status_idx" ON "Payment"("businessId", "status");

-- CreateIndex
CREATE INDEX "PaymentConfig_businessId_idx" ON "PaymentConfig"("businessId");

-- CreateIndex
CREATE INDEX "Conversation_businessId_status_idx" ON "Conversation"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Message_waId_key" ON "Message"("waId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "ExchangeRate_date_idx" ON "ExchangeRate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "bancos_codigo_ibp_key" ON "bancos"("codigo_ibp");

-- CreateIndex
CREATE INDEX "idx_bancos_activo" ON "bancos"("activo") WHERE (activo = true);

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pago_codigo_key" ON "metodos_pago"("codigo");

-- CreateIndex
CREATE INDEX "idx_metodos_pago_activo" ON "metodos_pago"("activo") WHERE (activo = true);

-- CreateIndex
CREATE UNIQUE INDEX "regimenes_islr_codigo_key" ON "regimenes_islr"("codigo");

-- CreateIndex
CREATE INDEX "idx_regimenes_islr_activo" ON "regimenes_islr"("activo") WHERE (activo = true);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_codigo_key" ON "tipos_documento"("codigo");

-- CreateIndex
CREATE INDEX "idx_tipos_documento_activo" ON "tipos_documento"("activo") WHERE (activo = true);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_negocio_codigo_key" ON "tipos_negocio"("codigo");

-- CreateIndex
CREATE INDEX "idx_tipos_negocio_activo" ON "tipos_negocio"("activo") WHERE (activo = true);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_persona_codigo_key" ON "tipos_persona"("codigo");

-- CreateIndex
CREATE INDEX "idx_tipos_persona_activo" ON "tipos_persona"("activo") WHERE (activo = true);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_methods_code_key" ON "shipping_methods"("code");

-- CreateIndex
CREATE INDEX "shipping_zones_businessId_idx" ON "shipping_zones"("businessId");

-- CreateIndex
CREATE INDEX "shipping_zones_businessId_isActive_idx" ON "shipping_zones"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "shipping_rates_zoneId_isActive_idx" ON "shipping_rates"("zoneId", "isActive");

-- CreateIndex
CREATE INDEX "shipping_rates_methodId_idx" ON "shipping_rates"("methodId");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rates_zoneId_methodId_costType_costValue_key" ON "shipping_rates"("zoneId", "methodId", "costType", "costValue");

-- CreateIndex
CREATE INDEX "shipping_zone_coverage_zoneId_idx" ON "shipping_zone_coverage"("zoneId");

-- CreateIndex
CREATE INDEX "shipping_zone_coverage_estadoId_idx" ON "shipping_zone_coverage"("estadoId");

-- CreateIndex
CREATE INDEX "shipping_zone_coverage_municipioId_idx" ON "shipping_zone_coverage"("municipioId");

-- CreateIndex
CREATE INDEX "shipping_zone_coverage_parroquiaId_idx" ON "shipping_zone_coverage"("parroquiaId");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_zone_coverage_zoneId_estadoId_municipioId_parroqui_key" ON "shipping_zone_coverage"("zoneId", "estadoId", "municipioId", "parroquiaId");

-- AddForeignKey
ALTER TABLE "municipios" ADD CONSTRAINT "municipios_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parroquias" ADD CONSTRAINT "parroquias_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StoreUser" ADD CONSTRAINT "StoreUser_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_storeUserId_fkey" FOREIGN KEY ("storeUserId") REFERENCES "StoreUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_business_profiles" ADD CONSTRAINT "customer_business_profiles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_business_profiles" ADD CONSTRAINT "customer_business_profiles_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payment_methods" ADD CONSTRAINT "customer_payment_methods_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentConfig" ADD CONSTRAINT "PaymentConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zones" ADD CONSTRAINT "shipping_zones_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "shipping_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zone_coverage" ADD CONSTRAINT "shipping_zone_coverage_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zone_coverage" ADD CONSTRAINT "shipping_zone_coverage_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "estados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zone_coverage" ADD CONSTRAINT "shipping_zone_coverage_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_zone_coverage" ADD CONSTRAINT "shipping_zone_coverage_parroquiaId_fkey" FOREIGN KEY ("parroquiaId") REFERENCES "parroquias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

