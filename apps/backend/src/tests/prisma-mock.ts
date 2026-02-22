const prisma = {
  order: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  payment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn()
  },
  orderItem: {
    groupBy: jest.fn()
  },
  product: {
    findMany: jest.fn()
  },
  conversation: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  business: {
    findUnique: jest.fn()
  },
  customer: {
    findFirst: jest.fn(),
    create: jest.fn()
  },
  message: {
    findMany: jest.fn(),
    create: jest.fn()
  },
  session: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn()
  },
  $queryRaw: jest.fn()
} as any;

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
} as any;

export const OrderSource = {
  WEB: 'WEB',
  WHATSAPP: 'WHATSAPP',
  IN_STORE: 'IN_STORE'
} as any;

export const ConvStatus = {
  BOT: 'BOT',
  HUMAN: 'HUMAN'
} as any;

export const MsgRole = {
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  BOT: 'BOT',
  SYSTEM: 'SYSTEM'
} as any;

export const Channel = {
  WHATSAPP: 'WHATSAPP'
} as any;

export const Role = {
  OWNER: 'OWNER',
  AGENT: 'AGENT',
  SUPER_ADMIN: 'SUPER_ADMIN'
} as any;

export const PaymentMethod = {
  ZELLE: 'ZELLE',
  PAGO_MOVIL: 'PAGO_MOVIL',
  BINANCE: 'BINANCE',
  CASH_USD: 'CASH_USD',
  TRANSFER_BS: 'TRANSFER_BS',
  CRYPTO: 'CRYPTO'
} as any;

export const PaymentStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
} as any;

export default prisma;
