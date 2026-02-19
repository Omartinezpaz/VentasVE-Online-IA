import request from 'supertest';
import app from '../app';
import prisma from '../tests/prisma-mock';
import { emitToBusiness } from '../lib/websocket';

describe('Payments Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea pago PENDING y emite new_payment', async () => {
    (prisma.order.findFirst as any).mockResolvedValue({
      id: 'order1',
      businessId: 'b1',
      totalCents: 10000
    });
    (prisma.payment.create as any).mockResolvedValue({
      id: 'pay1',
      orderId: 'order1',
      method: 'ZELLE',
      amountCents: 10000,
      currency: 'USD',
      status: 'PENDING',
      order: { id: 'order1', orderNumber: 1, totalCents: 10000, customer: null }
    });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', 'Bearer token')
      .send({ orderId: '11111111-1111-1111-1111-111111111111', method: 'ZELLE', reference: 'REF123' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect((emitToBusiness as any)).toHaveBeenCalledWith('b1', 'new_payment', expect.anything());
  });

  it('verifica pago y emite payment_verified y order_status_changed', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay1',
      orderId: 'order1'
    });
    (prisma.payment.update as any).mockResolvedValue({
      id: 'pay1',
      orderId: 'order1',
      status: 'VERIFIED',
      order: { id: 'order1', orderNumber: 1, totalCents: 10000, customer: null }
    });
    (prisma.order.update as any).mockResolvedValue({
      id: 'order1',
      status: 'CONFIRMED'
    });

    const res = await request(app)
      .patch('/api/v1/payments/pay1/verify')
      .set('Authorization', 'Bearer token')
      .send({ status: 'VERIFIED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('VERIFIED');
    expect((emitToBusiness as any)).toHaveBeenCalledWith('b1', 'payment_verified', expect.anything());
    expect((emitToBusiness as any)).toHaveBeenCalledWith('b1', 'order_status_changed', expect.objectContaining({ orderId: 'order1' }));
  });

  it('rechaza pago y emite payment_verified sin cambiar orden', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue({
      id: 'pay2',
      orderId: 'order2'
    });
    (prisma.payment.update as any).mockResolvedValue({
      id: 'pay2',
      orderId: 'order2',
      status: 'REJECTED',
      order: { id: 'order2', orderNumber: 2, totalCents: 5000, customer: null }
    });

    const res = await request(app)
      .patch('/api/v1/payments/pay2/verify')
      .set('Authorization', 'Bearer token')
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
    expect((emitToBusiness as any)).toHaveBeenCalledWith('b1', 'payment_verified', expect.anything());
  });

  it('lista pagos pendientes', async () => {
    (prisma.payment.findMany as any).mockResolvedValue([{ id: 'p1', status: 'PENDING', orderId: 'o1' }]);
    (prisma.payment.count as any).mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/payments?status=PENDING')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
