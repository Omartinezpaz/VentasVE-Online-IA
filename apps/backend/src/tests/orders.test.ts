import request from 'supertest';
import app from '../app';
import { ordersService } from '../services/orders.service';
import { catalogService } from '../services/catalog.service';

jest.mock('../services/orders.service', () => ({
  ordersService: {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../services/catalog.service', () => ({
  catalogService: {
    invalidateByBusinessId: jest.fn()
  }
}));

describe('Orders Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea una orden nueva usando ordersService y limpia cache de catálogo', async () => {
    (ordersService.create as jest.Mock).mockResolvedValue({
      id: 'ord1',
      businessId: 'b1',
      customerId: 'cust1',
      status: 'PENDING',
      totalCents: 10000
    });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', 'Bearer token')
      .send({
        customerId: '11111111-1111-1111-1111-111111111111',
        items: [{ productId: '22222222-2222-2222-2222-222222222222', quantity: 2 }],
        paymentMethod: 'ZELLE',
        notes: 'Test order'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('ord1');
    expect(ordersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'b1',
        customerId: '11111111-1111-1111-1111-111111111111'
      })
    );
    expect(catalogService.invalidateByBusinessId).toHaveBeenCalledWith('b1');
  });

  it('lista órdenes paginadas usando ordersService.list', async () => {
    (ordersService.list as jest.Mock).mockResolvedValue({
      data: [{ id: 'ord1', businessId: 'b1', status: 'PENDING' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
    });

    const res = await request(app)
      .get('/api/v1/orders?page=1&limit=20&status=CONFIRMED')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBe(1);
    expect(ordersService.list).toHaveBeenCalledWith('b1', {
      page: 1,
      limit: 20,
      status: 'CONFIRMED'
    });
  });
});
