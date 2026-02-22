import request from 'supertest';
import app from '../app';
import { catalogService } from '../services/catalog.service';
import { ordersService } from '../services/orders.service';
import prisma from '../tests/prisma-mock';

jest.mock('../services/catalog.service', () => ({
  catalogService: {
    getCatalogBySlug: jest.fn(),
    getProducts: jest.fn(),
    invalidateBySlug: jest.fn(),
    invalidateByBusinessId: jest.fn()
  }
}));

jest.mock('../services/orders.service', () => ({
  ordersService: {
    createPublicOrder: jest.fn()
  }
}));

describe('Catálogo público', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/catalog/:slug retorna 404 si no existe catálogo', async () => {
    (catalogService.getCatalogBySlug as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/catalog/no-exists');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CATALOG_NOT_FOUND');
  });

  it('GET /api/v1/catalog/:slug retorna datos del catálogo cuando existe', async () => {
    (catalogService.getCatalogBySlug as jest.Mock).mockResolvedValueOnce({
      id: 'b1',
      name: 'Test Biz',
      slug: 'test-biz'
    });

    const res = await request(app).get('/api/v1/catalog/test-biz');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'b1',
      name: 'Test Biz',
      slug: 'test-biz'
    });
  });

  it('POST /api/v1/catalog/:slug/orders crea orden pública y limpia cache', async () => {
    (ordersService.createPublicOrder as jest.Mock).mockResolvedValueOnce({
      id: 'ord1',
      totalCents: 8000
    });

    const res = await request(app)
      .post('/api/v1/catalog/test-biz/orders')
      .send({
        customer: {
          phone: '+584121234567',
          name: 'Cliente Test'
        },
        items: [
          { productId: '11111111-1111-1111-1111-111111111111', quantity: 2 }
        ],
        paymentMethod: 'ZELLE',
        notes: 'Orden pública'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('ord1');
    expect(ordersService.createPublicOrder).toHaveBeenCalledWith({
      slug: 'test-biz',
      customer: expect.objectContaining({ phone: '+584121234567' }),
      items: [
        { productId: '11111111-1111-1111-1111-111111111111', quantity: 2 }
      ],
      paymentMethod: 'ZELLE',
      notes: 'Orden pública'
    });
    expect(catalogService.invalidateBySlug).toHaveBeenCalledWith('test-biz');
  });

  it('GET /api/v1/catalog/:slug/payment-methods filtra según configuración del negocio', async () => {
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'b1',
      paymentMethods: {
        zelle: { email: 'test@zelle.com' },
        pagoMovil: { phone: '04121234567', bank: '0102', id: 'V12345678' },
        binance: { id: 'binance-id' },
        transfer: { account: '0102-0000-00-0000000000', name: 'Test' },
        cashUsd: 1
      }
    });

    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        codigo: 'ZELLE',
        nombre: 'Zelle',
        icono: 'zelle.svg',
        requiere_cuenta: true,
        requiere_comprobante: true,
        orden: 1
      },
      {
        id: 2,
        codigo: 'PAGO_MOVIL',
        nombre: 'Pago Móvil',
        icono: 'pm.svg',
        requiere_cuenta: true,
        requiere_comprobante: false,
        orden: 2
      },
      {
        id: 3,
        codigo: 'OTHER',
        nombre: 'Otro',
        icono: null,
        requiere_cuenta: false,
        requiere_comprobante: false,
        orden: 3
      }
    ]);

    const res = await request(app).get('/api/v1/catalog/test-biz/payment-methods');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((m: any) => m.code)).toEqual(['ZELLE', 'PAGO_MOVIL']);
  });

  it('GET /api/v1/catalog/:slug/payment-config retorna configuración sin exponer negocio inexistente', async () => {
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const resNotFound = await request(app).get('/api/v1/catalog/unknown/payment-config');
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.code).toBe('CATALOG_NOT_FOUND');

    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce({
      paymentMethods: {
        zelle: { email: 'z@test.com' }
      }
    });

    const res = await request(app).get('/api/v1/catalog/test-biz/payment-config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      zelle: { email: 'z@test.com' }
    });
  });

  it('GET /api/v1/catalog/:slug/shipping-zones retorna 404 si el negocio no existe', async () => {
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/catalog/unknown/shipping-zones?amount=25');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CATALOG_NOT_FOUND');
  });

  it('GET /api/v1/catalog/:slug/shipping-zones calcula costos y zonas correctamente', async () => {
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'b1',
      settings: {
        shippingZones: [
          {
            id: 'z1',
            slug: 'zona-a',
            name: 'Zona A',
            price: 5,
            free: false,
            distanceKm: 10,
            deliveryTime: '24-48h'
          }
        ],
        shippingOptions: {
          freeShippingEnabled: true,
          freeShippingMin: 20,
          pickupEnabled: true
        }
      }
    });

    const res = await request(app).get('/api/v1/catalog/test-biz/shipping-zones?amount=30');

    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('USD');
    expect(res.body.cartAmount).toBe(30);
    expect(res.body.zones).toHaveLength(1);
    const zone = res.body.zones[0];
    expect(zone.slug).toBe('zona-a');
    expect(zone.methods).toHaveLength(1);

    const method = zone.methods[0];

    expect(method.cost).toBe(0);
    expect(method.isFree).toBe(true);
    expect(method.formattedCost).toBe('Gratis');
  });

  it('GET /api/v1/catalog/:slug/shipping-zones responde lista vacía si no hay configuración', async () => {
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'b1',
      settings: {}
    });

    const res = await request(app).get('/api/v1/catalog/test-biz/shipping-zones?amount=15');

    expect(res.status).toBe(200);
    expect(res.body.zones).toEqual([]);
    expect(res.body.currency).toBe('USD');
    expect(res.body.cartAmount).toBe(15);
  });
});
