import prisma, { Channel, MsgRole, OrderStatus } from '@ventasve/database';
import { whatsappService } from './whatsapp.service';
import { emitToBusiness } from '../lib/websocket';
import { env } from '../lib/env';

const shouldNotifyStatus = (status: OrderStatus) => {
  return status === OrderStatus.CONFIRMED ||
    status === OrderStatus.PREPARING ||
    status === OrderStatus.SHIPPED ||
    status === OrderStatus.DELIVERED ||
    status === OrderStatus.CANCELLED;
};

const buildOrderStatusMessage = async (orderId: string, status: OrderStatus) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  const code = order?.orderNumber ?? null;
  const base = code ? `Tu orden #${code}` : 'Tu orden';

  if (status === OrderStatus.SHIPPED) {
    const deliveryOrder = await prisma.deliveryOrder.findFirst({
      where: {
        orderId: orderId,
        businessId: order?.businessId
      },
      select: {
        otpCode: true
      }
    });

    if (deliveryOrder?.otpCode) {
      return `${base} ha sido enviada 🚚.\nCódigo de entrega: ${deliveryOrder.otpCode}`;
    }
    return `${base} ha sido enviada 🚚`;
  }

  if (status === OrderStatus.DELIVERED) {
    const deliveryOrder = await prisma.deliveryOrder.findFirst({
      where: {
        orderId: orderId,
        businessId: order?.businessId
      },
      select: {
        id: true
      }
    });

    const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
    const ratingLink = deliveryOrder ? `${frontendUrl}/rating/${deliveryOrder.id}` : null;
    if (ratingLink) {
      return `${base} fue entregada 📦.\n¿Nos cuentas cómo fue tu experiencia? Califícala aquí: ${ratingLink}`;
    }
    return `${base} fue entregada 📦`;
  }

  switch (status) {
    case OrderStatus.CONFIRMED:
      return `${base} ha sido confirmada ✅`;
    case OrderStatus.PREPARING:
      return `${base} está siendo preparada 🧺`;
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

    const content = await buildOrderStatusMessage(orderId, newStatus);

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
