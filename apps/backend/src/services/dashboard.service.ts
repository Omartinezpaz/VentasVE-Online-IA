import prisma, { OrderStatus } from '@ventasve/database';
import { exchangeRateService } from './exchange-rate.service';

type Period = 'day' | 'week' | 'month';

const getPeriodRange = (period: Period) => {
  const now = new Date();

  if (period === 'day') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (period === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: now };
};

export class DashboardService {
  async getStats(businessId: string, period: Period = 'day') {
    const [salesDayCents, salesWeekCents, salesMonthCents] = await Promise.all([
      this.getSalesForPeriod(businessId, 'day'),
      this.getSalesForPeriod(businessId, 'week'),
      this.getSalesForPeriod(businessId, 'month')
    ]);

    const rate = await exchangeRateService.getCurrent(businessId);
    const usdToVes = Number(rate.usdToVes);

    const toAmounts = (totalCents: number) => ({
      usdCents: totalCents,
      ves: (totalCents / 100) * usdToVes
    });

    const [ordersByStatus, topProducts, lowStock, conversion, salesByPaymentMethod] = await Promise.all([
      this.getOrdersByStatus(businessId, period),
      this.getTopProducts(businessId, period),
      this.getLowStock(businessId),
      this.getConversion(businessId, period),
      this.getSalesByPaymentMethod(businessId, period, usdToVes)
    ]);

    return {
      sales: {
        day: toAmounts(salesDayCents),
        week: toAmounts(salesWeekCents),
        month: toAmounts(salesMonthCents)
      },
      period,
      ordersByStatus,
      topProducts,
      lowStock,
      conversion,
      salesByPaymentMethod
    };
  }

  private async getSalesForPeriod(businessId: string, period: Period) {
    const { start, end } = getPeriodRange(period);

    const result = await prisma.order.aggregate({
      _sum: { totalCents: true },
      where: {
        businessId,
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
        },
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });

    return result._sum.totalCents || 0;
  }

  private async getOrdersByStatus(businessId: string, period: Period) {
    const { start, end } = getPeriodRange(period);

    const result = await prisma.order.groupBy({
      by: ['status'],
      where: {
        businessId,
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _count: {
        _all: true
      }
    });

    return result.map(item => ({
      status: item.status,
      count: item._count._all
    }));
  }

  private async getTopProducts(businessId: string, period: Period) {
    const { start, end } = getPeriodRange(period);

    const result = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          businessId,
          createdAt: {
            gte: start,
            lte: end
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: result.map(r => r.productId)
        }
      }
    });

    return result.map(r => ({
      productId: r.productId,
      quantity: r._sum.quantity || 0,
      product: products.find(p => p.id === r.productId) || null
    }));
  }

  private async getLowStockThreshold(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { settings: true }
    });

    const settings = (business?.settings || {}) as any;
    const threshold = typeof settings.dashboardLowStockThreshold === 'number'
      ? settings.dashboardLowStockThreshold
      : 10;

    return threshold;
  }

  private async getLowStock(businessId: string) {
    const threshold = await this.getLowStockThreshold(businessId);

    const products = await prisma.product.findMany({
      where: {
        businessId,
        isPublished: true,
        deletedAt: null,
        stock: {
          lt: threshold
        }
      },
      orderBy: {
        stock: 'asc'
      },
      take: 20
    });

    return {
      threshold,
      products
    };
  }

  private async getConversion(businessId: string, period: Period) {
    const { start, end } = getPeriodRange(period);

    const [ordersCount, visitsCount] = await Promise.all([
      prisma.order.count({
        where: {
          businessId,
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.conversation.count({
        where: {
          businessId,
          channel: 'WEB',
          createdAt: {
            gte: start,
            lte: end
          }
        }
      })
    ]);

    const visits = visitsCount || 0;
    const rate = visits > 0 ? ordersCount / visits : 0;

    return {
      orders: ordersCount,
      visits,
      rate
    };
  }

  private async getSalesByPaymentMethod(businessId: string, period: Period, usdToVes: number) {
    const { start, end } = getPeriodRange(period);

    const result = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        businessId,
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
        },
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _sum: {
        totalCents: true
      },
      _count: {
        _all: true
      }
    });

    return result.map(item => {
      const usdCents = item._sum.totalCents || 0;
      const ves = (usdCents / 100) * usdToVes;

      return {
        paymentMethod: item.paymentMethod,
        orders: item._count._all,
        usdCents,
        ves
      };
    });
  }
}

export const dashboardService = new DashboardService();
