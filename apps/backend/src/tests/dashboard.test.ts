import request from 'supertest';
import app from '../app';
import prisma from '../tests/prisma-mock';

describe('Dashboard Stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna stats para periodo día', async () => {
    (prisma.business.findUnique as any).mockResolvedValue({ settings: {} });
    (prisma.order.aggregate as any).mockResolvedValue({ _sum: { totalCents: 10000 } });
    (prisma.order.groupBy as any).mockResolvedValueOnce([
      { status: 'PENDING', _count: { _all: 2 } }
    ]);
    (prisma.orderItem.groupBy as any).mockResolvedValue([]);
    (prisma.product.findMany as any).mockResolvedValue([]);
    (prisma.conversation.count as any).mockResolvedValue(0);
    (prisma.order.groupBy as any).mockResolvedValueOnce([
      { paymentMethod: 'ZELLE', _sum: { totalCents: 10000 }, _count: { _all: 1 } }
    ]);
    (prisma.order.findMany as any).mockResolvedValue([]);
    (prisma.orderItem.findMany as any).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/dashboard/stats?period=day')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.sales.day.usdCents).toBeDefined();
    expect(Array.isArray(res.body.ordersByStatus)).toBe(true);
  });
});
