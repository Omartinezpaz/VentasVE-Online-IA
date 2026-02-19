const prisma = {
  order: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
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
    count: jest.fn()
  },
  business: {
    findUnique: jest.fn()
  }
} as any;

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
} as any;

export const Role = {
  OWNER: 'OWNER',
  AGENT: 'AGENT',
  SUPER_ADMIN: 'SUPER_ADMIN'
} as any;

export default prisma;
