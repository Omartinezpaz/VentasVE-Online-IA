import prisma, { OrderStatus } from '../tests/prisma-mock';
import { notificationsService } from '../services/notifications.service';
import { whatsappService } from '../services/whatsapp.service';
import { emitToBusiness } from '../lib/websocket';

describe('NotificationsService.onOrderStatusChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no hace nada si el estado no es notificable', async () => {
    await notificationsService.onOrderStatusChanged('order1', OrderStatus.PENDING);

    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect((whatsappService.sendMessage as jest.Mock)).not.toHaveBeenCalled();
    expect((emitToBusiness as jest.Mock)).not.toHaveBeenCalled();
  });

  it('no notifica si la orden no existe', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await notificationsService.onOrderStatusChanged('order1', OrderStatus.CONFIRMED);

    expect((whatsappService.sendMessage as jest.Mock)).not.toHaveBeenCalled();
    expect((emitToBusiness as jest.Mock)).not.toHaveBeenCalled();
  });

  it('no notifica si el cliente no tiene teléfono', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'order1',
      businessId: 'b1',
      orderNumber: 123,
      customer: { id: 'cust1', phone: null }
    });

    await notificationsService.onOrderStatusChanged('order1', OrderStatus.CONFIRMED);

    expect((whatsappService.sendMessage as jest.Mock)).not.toHaveBeenCalled();
    expect((emitToBusiness as jest.Mock)).not.toHaveBeenCalled();
  });

  it('crea conversación si no existe y envía mensaje y WhatsApp', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'order1',
      businessId: 'b1',
      orderNumber: 123,
      customerId: 'cust1',
      customer: { id: 'cust1', phone: '+584121234567', name: 'Cliente' }
    });

    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (prisma.conversation.create as jest.Mock).mockResolvedValueOnce({
      id: 'conv1',
      businessId: 'b1',
      customerId: 'cust1'
    });

    let createdContent: string | null = null;
    (prisma.message.create as jest.Mock).mockImplementationOnce(async (args: any) => {
      createdContent = args.data.content;
      return {
        id: 'msg1',
        conversationId: 'conv1',
        role: args.data.role,
        content: args.data.content
      };
    });

    await notificationsService.onOrderStatusChanged('order1', OrderStatus.CONFIRMED);

    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        businessId: 'b1',
        customerId: 'cust1',
        channel: expect.anything()
      }
    });

    expect(prisma.message.create).toHaveBeenCalled();
    expect(createdContent).not.toBeNull();

    expect((whatsappService.sendMessage as jest.Mock)).toHaveBeenCalledWith(
      'b1',
      '+584121234567',
      createdContent
    );

    expect((emitToBusiness as jest.Mock)).toHaveBeenCalledWith(
      'b1',
      'order_status_changed',
      expect.objectContaining({
        orderId: 'order1',
        status: OrderStatus.CONFIRMED
      })
    );
  });

  it('reutiliza conversación existente si ya hay una para el cliente', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'order1',
      businessId: 'b1',
      orderNumber: 456,
      customerId: 'cust1',
      customer: { id: 'cust1', phone: '+584121234567', name: 'Cliente' }
    });

    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'conv-existing',
      businessId: 'b1',
      customerId: 'cust1'
    });

    (prisma.message.create as jest.Mock).mockResolvedValueOnce({
      id: 'msg1',
      conversationId: 'conv-existing',
      role: 'BOT',
      content: 'cuerpo'
    });

    await notificationsService.onOrderStatusChanged('order1', OrderStatus.DELIVERED);

    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conv-existing',
        role: expect.any(String),
        content: expect.any(String)
      })
    });
    expect((whatsappService.sendMessage as jest.Mock)).toHaveBeenCalled();
    expect((emitToBusiness as jest.Mock)).toHaveBeenCalled();
  });
});
