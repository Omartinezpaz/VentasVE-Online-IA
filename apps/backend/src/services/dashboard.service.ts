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

const VALID_SALES_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED
];

export class DashboardService {
  async getStats(businessId: string, period: Period = 'day', seriesDays = 7) {
    const [salesDayCents, salesWeekCents, salesMonthCents, salesSeries, overview] = await Promise.all([
      this.getSalesForPeriod(businessId, 'day'),
      this.getSalesForPeriod(businessId, 'week'),
      this.getSalesForPeriod(businessId, 'month'),
      this.getSalesSeries(businessId, seriesDays),
      this.getOverview(businessId, period)
    ]);

    const rate = await exchangeRateService.getCurrent(businessId);
    const usdToVes = Number(rate.usdToVes);

    const toAmounts = (totalCents: number) => ({
      usdCents: totalCents,
      ves: (totalCents / 100) * usdToVes
    });

    const [ordersByStatus, topProducts, lowStock, conversion, salesByPaymentMethod, delivery] = await Promise.all([
      this.getOrdersByStatus(businessId, period),
      this.getTopProducts(businessId, period),
      this.getLowStock(businessId),
      this.getConversion(businessId, period),
      this.getSalesByPaymentMethod(businessId, period, usdToVes),
      this.getDeliveryStats(businessId, period, usdToVes)
    ]);

    return {
      sales: {
        day: toAmounts(salesDayCents),
        week: toAmounts(salesWeekCents),
        month: toAmounts(salesMonthCents)
      },
      salesSeries,
      overview,
      period,
      ordersByStatus,
      topProducts,
      lowStock,
      conversion,
      salesByPaymentMethod,
      delivery
    };
  }

  private async getSalesForPeriod(businessId: string, period: Period) {
    const { start, end } = getPeriodRange(period);

    const result = await prisma.order.aggregate({
      _sum: { totalCents: true },
      where: {
        businessId,
        status: {
          in: VALID_SALES_STATUSES
        },
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });

    return result._sum.totalCents || 0;
  }

  private async getSalesSeries(businessId: string, days: number) {
    const now = new Date();
    const totalDays = Math.max(1, Math.min(days, 30));
    
    // Calculate range start (local time midnight of first day)
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (totalDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // Fetch all relevant orders in one query
    const orders = await prisma.order.findMany({
      where: {
        businessId,
        status: {
          in: VALID_SALES_STATUSES
        },
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        createdAt: true,
        totalCents: true
      }
    });

    // Group by local date string (YYYY-MM-DD)
    const salesByDate = new Map<string, number>();
    for (const order of orders) {
      const d = order.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const current = salesByDate.get(key) || 0;
      salesByDate.set(key, current + (order.totalCents || 0));
    }

    // Build result array filling missing days
    const result = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      result.push({
        date: d.toISOString(),
        usdCents: salesByDate.get(key) || 0
      });
    }

    return result;
  }

  async getSalesSeriesForExport(businessId: string, days: number) {
    const rate = await exchangeRateService.getCurrent(businessId);
    const usdToVes = Number(rate.usdToVes);
    const series = await this.getSalesSeries(businessId, days);

    return series.map(entry => ({
      date: entry.date,
      usdCents: entry.usdCents,
      ves: (entry.usdCents / 100) * usdToVes
    }));
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

  private async getOverview(businessId: string, period: Period) {
    const { start, end } = getPeriodRange(period);

    const orders = await prisma.order.findMany({
      where: {
        businessId,
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED
          ]
        },
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        totalCents: true
      }
    });

    if (!orders.length) {
      return {
        orders: 0,
        salesUsdCents: 0,
        avgTicketUsdCents: 0,
        marginUsdCents: 0,
        marginPercent: null as number | null
      };
    }

    const orderIds = orders.map(o => o.id);
    const salesUsdCents = orders.reduce((sum, o) => sum + (o.totalCents || 0), 0);

    const items = await prisma.orderItem.findMany({
      where: {
        orderId: {
          in: orderIds
        }
      },
      select: {
        quantity: true,
        unitPriceCents: true,
        product: {
          select: {
            costCents: true
          }
        }
      }
    });

    let totalCostCents = 0;
    let marginUsdCents = 0;

    for (const item of items) {
      const cost = item.product?.costCents;
      if (typeof cost !== 'number' || cost <= 0) {
        continue;
      }
      const revenue = item.unitPriceCents * item.quantity;
      const costTotal = cost * item.quantity;
      totalCostCents += costTotal;
      marginUsdCents += revenue - costTotal;
    }

    const ordersCount = orders.length;
    const avgTicketUsdCents =
      ordersCount > 0 ? Math.round(salesUsdCents / ordersCount) : 0;
    const marginPercent =
      totalCostCents > 0 ? marginUsdCents / totalCostCents : null;

    return {
      orders: ordersCount,
      salesUsdCents,
      avgTicketUsdCents,
      marginUsdCents,
      marginPercent
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

  private async getDeliveryStats(businessId: string, period: Period, usdToVes: number) {
    const { start, end } = getPeriodRange(period);

    const [totalOrders, completedOrders, feesResult, deliveredOrders] = await Promise.all([
      prisma.deliveryOrder.count({
        where: {
          businessId,
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.deliveryOrder.count({
        where: {
          businessId,
          status: 'DELIVERED',
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.deliveryOrder.aggregate({
        _sum: {
          deliveryFee: true
        },
        where: {
          businessId,
          status: 'DELIVERED',
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.deliveryOrder.findMany({
        where: {
          businessId,
          status: 'DELIVERED',
          createdAt: {
            gte: start,
            lte: end
          },
          deliveredAt: {
            not: null
          }
        },
        select: {
          createdAt: true,
          deliveredAt: true
        }
      })
    ]);

    const totalFeesUsd = feesResult._sum.deliveryFee ? Number(feesResult._sum.deliveryFee) : 0;
    const totalFeesVes = totalFeesUsd * usdToVes;

    let avgDeliveryMinutes = 0;
    if (deliveredOrders.length > 0) {
      const totalMinutes = deliveredOrders.reduce((acc, order) => {
        if (order.deliveredAt) {
          const diffMs = order.deliveredAt.getTime() - order.createdAt.getTime();
          return acc + (diffMs / (1000 * 60));
        }
        return acc;
      }, 0);
      avgDeliveryMinutes = Math.round(totalMinutes / deliveredOrders.length);
    }

    return {
      totalOrders,
      completedOrders,
      totalFees: {
        usd: totalFeesUsd,
        ves: totalFeesVes
      },
      avgDeliveryMinutes,
      successRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    };
  }
}

export const dashboardService = new DashboardService();
