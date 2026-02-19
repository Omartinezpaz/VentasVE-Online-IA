import prisma, { Channel, MsgRole, OrderStatus } from '@ventasve/database';
import { whatsappService } from './whatsapp.service';
import { emitToBusiness } from '../lib/websocket';

const shouldNotifyStatus = (status: OrderStatus) => {
  return status === OrderStatus.CONFIRMED ||
    status === OrderStatus.PREPARING ||
    status === OrderStatus.SHIPPED ||
    status === OrderStatus.DELIVERED ||
    status === OrderStatus.CANCELLED;
};

const buildOrderStatusMessage = (orderNumber: number | null, status: OrderStatus) => {
  const code = orderNumber ?? null;
  const base = code ? `Tu orden #${code}` : 'Tu orden';

  switch (status) {
    case OrderStatus.CONFIRMED:
      return `${base} ha sido confirmada ✅`;
    case OrderStatus.PREPARING:
      return `${base} está siendo preparada 🧺`;
    case OrderStatus.SHIPPED:
      return `${base} ha sido enviada 🚚`;
    case OrderStatus.DELIVERED:
      return `${base} fue entregada 📦`;
    case OrderStatus.CANCELLED:
      return `${base} fue cancelada ❌`;
    default:
      return `${base} cambió de estado`;
  }
};

export class NotificationsService {
  async onOrderStatusChanged(orderId: string, newStatus: OrderStatus) {
    if (!shouldNotifyStatus(newStatus)) {
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true
      }
    });

    if (!order) {
      return;
    }

    const customer = order.customer;
    if (!customer || !customer.phone) {
      return;
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        businessId: order.businessId,
        customerId: customer.id,
        channel: Channel.WHATSAPP
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId: order.businessId,
          customerId: customer.id,
          channel: Channel.WHATSAPP
        }
      });
    }

    const content = buildOrderStatusMessage(order.orderNumber ?? null, newStatus);

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MsgRole.BOT,
        content
      }
    });

    try {
      await whatsappService.sendMessage(order.businessId, customer.phone, content);
    } catch (error) {
      console.error('Error enviando WhatsApp', error);
    }

    emitToBusiness(order.businessId, 'order_status_changed', {
      orderId: order.id,
      status: newStatus,
      customer,
      order
    });
  }
}

export const notificationsService = new NotificationsService();
