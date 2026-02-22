import prisma from '../tests/prisma-mock';
import { ordersService } from '../services/orders.service';
import { emitToBusiness } from '../lib/websocket';

describe('OrdersService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza error si la orden no tiene items', async () => {
    await expect(
      ordersService.create({
        businessId: 'b1',
        customerId: 'c1',
        items: [],
        paymentMethod: 'ZELLE'
      } as any)
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 422
    });
  });

  it('lanza error si algún producto no existe o no pertenece al negocio', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', businessId: 'b1', deletedAt: null, priceUsdCents: 5000 }
    ]);

    await expect(
      ordersService.create({
        businessId: 'b1',
        customerId: 'c1',
        items: [
          { productId: 'p1', quantity: 1 },
          { productId: 'p2', quantity: 1 }
        ],
        paymentMethod: 'ZELLE'
      } as any)
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 422
    });
  });

  it('calcula totalCents correctamente, usa $transaction y emite new_order', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', businessId: 'b1', deletedAt: null, priceUsdCents: 1000 },
      { id: 'p2', businessId: 'b1', deletedAt: null, priceUsdCents: 2500 }
    ]);

    let createdData: any;

    (prisma as any).$transaction = jest.fn(async (fn: any) => {
      const tx = {
        order: {
          create: jest.fn().mockImplementation(async (args: any) => {
            createdData = args.data;
            return { id: 'ord1' };
          }),
          findUnique: jest.fn().mockResolvedValue({
            id: 'ord1',
            businessId: 'b1',
            customerId: 'c1',
            status: 'PENDING',
            totalCents: 8000
          })
        },
        orderItem: {
          createMany: jest.fn().mockResolvedValue(undefined)
        }
      };

      return fn(tx);
    });

    const result = await ordersService.create({
      businessId: 'b1',
      customerId: 'c1',
      items: [
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 2 }
      ],
      paymentMethod: 'ZELLE',
      deliveryAddress: 'Dir',
      notes: 'Nota',
      exchangeRate: 40,
      shippingZoneSlug: 'zone-1',
      shippingCostCents: 500,
      shippingMethodCode: 'DELIVERY'
    } as any);

    expect((prisma.product.findMany as jest.Mock)).toHaveBeenCalledWith({
      where: {
        id: { in: ['p1', 'p2'] },
        businessId: 'b1',
        deletedAt: null
      }
    });

    expect(createdData.totalCents).toBe(8000);
    expect(createdData.shipping_zone_slug).toBe('zone-1');
    expect(createdData.shipping_cost_cents).toBe(500);
    expect(createdData.shipping_method_code).toBe('DELIVERY');

    expect(result).toMatchObject({
      id: 'ord1',
      businessId: 'b1',
      customerId: 'c1',
      totalCents: 8000
    });

    expect(emitToBusiness as jest.Mock).toHaveBeenCalledWith(
      'b1',
      'new_order',
      expect.anything()
    );
  });
});
