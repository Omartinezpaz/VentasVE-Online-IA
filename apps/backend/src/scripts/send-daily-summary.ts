import 'dotenv/config';
import prisma, { OrderStatus, Role } from '@ventasve/database';
import { dashboardService } from '../services/dashboard.service';
import { exchangeRateService } from '../services/exchange-rate.service';
import { env } from '../lib/env';
import { Resend } from 'resend';

const NOTIFIABLE_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED
];

type BusinessSettings = {
  ownerEmail?: string;
  notificationSettings?: Record<string, Record<string, boolean>>;
};

type DailySummaryMetrics = {
  ordersCount: number;
  salesUsdCents: number;
  avgTicketUsdCents: number;
  marginUsdCents: number;
  marginPercent: number | null;
};

type DailySummaryTopProduct = {
  productId: string;
  name: string;
  quantity: number;
};

const getYesterdayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
};

const computeMetricsForYesterday = async (businessId: string): Promise<DailySummaryMetrics> => {
  const { start, end } = getYesterdayRange();

  const orders = await prisma.order.findMany({
    where: {
      businessId,
      status: {
        in: NOTIFIABLE_STATUSES
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
      ordersCount: 0,
      salesUsdCents: 0,
      avgTicketUsdCents: 0,
      marginUsdCents: 0,
      marginPercent: null
    };
  }

  const orderIds = orders.map(order => order.id);
  const salesUsdCents = orders.reduce((sum, order) => sum + (order.totalCents || 0), 0);

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
  const avgTicketUsdCents = ordersCount > 0 ? Math.round(salesUsdCents / ordersCount) : 0;
  const marginPercent = totalCostCents > 0 ? marginUsdCents / totalCostCents : null;

  return {
    ordersCount,
    salesUsdCents,
    avgTicketUsdCents,
    marginUsdCents,
    marginPercent
  };
};

const getTopProductsForYesterday = async (
  businessId: string
): Promise<DailySummaryTopProduct[]> => {
  const { start, end } = getYesterdayRange();

  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        businessId,
        createdAt: {
          gte: start,
          lte: end
        },
        status: {
          in: NOTIFIABLE_STATUSES
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
    take: 3
  });

  if (!grouped.length) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: grouped.map(group => group.productId)
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  return grouped.map(group => {
    const product = products.find(p => p.id === group.productId);
    return {
      productId: group.productId,
      name: product?.name || 'Producto sin nombre',
      quantity: group._sum.quantity || 0
    };
  });
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const escapeCsv = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildSeriesCsv = async (businessId: string) => {
  const series = await dashboardService.getSalesSeriesForExport(businessId, 7);
  const header = ['date', 'usdCents', 'ves'];
  const lines = series.map(entry =>
    [entry.date, entry.usdCents, entry.ves.toFixed(2)].map(escapeCsv).join(',')
  );
  return [header.join(','), ...lines].join('\n');
};

const formatCurrency = (amountCents: number) => {
  const amount = amountCents / 100;
  return amount.toFixed(2);
};

const buildEmailPayload = async (
  businessId: string,
  businessName: string,
  recipientEmail: string
) => {
  const { start } = getYesterdayRange();
  const dayLabel = formatDate(start);
  const metrics = await computeMetricsForYesterday(businessId);
  const topProducts = await getTopProductsForYesterday(businessId);
  const rate = await exchangeRateService.getCurrent(businessId);
  const usdToVes = Number(rate.usdToVes);
  const seriesCsv = await buildSeriesCsv(businessId);

  const salesUsd = formatCurrency(metrics.salesUsdCents);
  const salesVes = (metrics.salesUsdCents / 100 * usdToVes).toFixed(2);
  const avgTicketUsd = formatCurrency(metrics.avgTicketUsdCents);
  const avgTicketVes = (metrics.avgTicketUsdCents / 100 * usdToVes).toFixed(2);
  const marginUsd = formatCurrency(metrics.marginUsdCents);
  const marginVes = (metrics.marginUsdCents / 100 * usdToVes).toFixed(2);
  const marginPercent =
    metrics.marginPercent !== null ? (metrics.marginPercent * 100).toFixed(1) : null;

  const subject = `Resumen diario de ventas ${dayLabel} — ${businessName}`;

  const lines: string[] = [];
  lines.push(`Hola, este es tu resumen de ventas del día ${dayLabel}`);
  lines.push('');
  lines.push(`Ventas totales: USD ${salesUsd} / Bs. ${salesVes}`);
  lines.push(`Órdenes: ${metrics.ordersCount}`);
  lines.push(`Ticket promedio: USD ${avgTicketUsd} / Bs. ${avgTicketVes}`);
  lines.push(`Margen estimado: USD ${marginUsd} / Bs. ${marginVes}`);
  if (marginPercent !== null) {
    lines.push(`Margen sobre costo: ${marginPercent}%`);
  }
  if (topProducts.length) {
    lines.push('');
    lines.push('Top 3 productos por unidades:');
    topProducts.forEach((product, index) => {
      const skuPart = '';
      lines.push(`${index + 1}. ${product.name}${skuPart} — ${product.quantity} uds`);
    });
  } else {
    lines.push('');
    lines.push('No hubo productos con ventas registradas en este día.');
  }
  lines.push('');
  lines.push('Adjuntamos un CSV con la serie de ventas de los últimos 7 días.');
  const text = lines.join('\n');

  const htmlParts: string[] = [];
  htmlParts.push('<!doctype html><html><body>');
  htmlParts.push(`<h2>Resumen diario de ventas ${dayLabel}</h2>`);
  htmlParts.push(`<p>Hola, este es el resumen de ventas de <strong>${businessName}</strong> para el día ${dayLabel}.</p>`);
  htmlParts.push('<ul>');
  htmlParts.push(`<li><strong>Ventas totales:</strong> USD ${salesUsd} / Bs. ${salesVes}</li>`);
  htmlParts.push(`<li><strong>Órdenes:</strong> ${metrics.ordersCount}</li>`);
  htmlParts.push(`<li><strong>Ticket promedio:</strong> USD ${avgTicketUsd} / Bs. ${avgTicketVes}</li>`);
  htmlParts.push(`<li><strong>Margen estimado:</strong> USD ${marginUsd} / Bs. ${marginVes}</li>`);
  if (marginPercent !== null) {
    htmlParts.push(`<li><strong>Margen sobre costo:</strong> ${marginPercent}%</li>`);
  }
  htmlParts.push('</ul>');
  if (topProducts.length) {
    htmlParts.push('<h3>Top 3 productos por unidades</h3>');
    htmlParts.push('<ol>');
    topProducts.forEach(product => {
      const skuPart = '';
      htmlParts.push(`<li>${product.name}${skuPart} — ${product.quantity} uds</li>`);
    });
    htmlParts.push('</ol>');
  } else {
    htmlParts.push('<p>No hubo productos con ventas registradas en este día.</p>');
  }
  htmlParts.push('<p>Adjuntamos un CSV con la serie de ventas de los últimos 7 días.</p>');
  htmlParts.push('</body></html>');
  const html = htmlParts.join('');

  return {
    to: recipientEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `sales-series-7d-${dayLabel}.csv`,
        content: seriesCsv,
        contentType: 'text/csv; charset=utf-8'
      }
    ]
  };
};

const sendEmail = async (payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: { filename: string; content: string; contentType: string }[];
}) => {
  if (!env.RESEND_API_KEY) {
    console.log('[daily-summary-email][SEND_STUB]', {
      to: payload.to,
      subject: payload.subject,
      attachments: payload.attachments.map(a => a.filename)
    });
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const from = env.EMAIL_FROM || 'no-reply@localhost';

  await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content
    }))
  });

  console.log('[daily-summary-email][SENT_RESEND]', {
    to: payload.to,
    subject: payload.subject,
    attachments: payload.attachments.map(a => a.filename)
  });
};

const main = async () => {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true
    }
  });

  for (const business of businesses) {
    const settings = (business.settings || {}) as BusinessSettings;
    const notificationSettings = settings.notificationSettings || {};
    const emailSettings = notificationSettings.email || {};
    const dailySummaryEnabled = emailSettings.dailySummary === true;

    if (!dailySummaryEnabled) {
      continue;
    }

    let recipientEmail = settings.ownerEmail;

    if (!recipientEmail) {
      const ownerUser = await prisma.storeUser.findFirst({
        where: {
          businessId: business.id,
          role: Role.OWNER
        },
        select: {
          email: true
        }
      });

      recipientEmail = ownerUser?.email;
    }

    if (!recipientEmail) {
      console.log(
        '[daily-summary-email][SKIP_NO_EMAIL]',
        business.slug || business.id
      );
      continue;
    }

    try {
      const payload = await buildEmailPayload(
        business.id,
        business.name || business.slug || 'Tu negocio',
        recipientEmail
      );
      await sendEmail(payload);
    } catch (error) {
      console.error(
        '[daily-summary-email][ERROR]',
        business.slug || business.id,
        error
      );
    }
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
