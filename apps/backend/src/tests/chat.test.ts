import request from 'supertest';
import app from '../app';
import prisma from '../tests/prisma-mock';
import { emitToBusiness } from '../lib/websocket';
import { whatsappService } from '../services/whatsapp.service';

describe('ChatController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/chat devuelve conversaciones paginadas del negocio autenticado', async () => {
    (prisma.conversation.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'c1',
        businessId: 'b1',
        customerId: 'cust1',
        updatedAt: new Date().toISOString(),
        customer: { id: 'cust1', name: 'Cliente', phone: '+584121234567' },
        messages: [{ id: 'm1', content: 'Hola', createdAt: new Date().toISOString() }],
        _count: { messages: 1 }
      }
    ]);
    (prisma.conversation.count as jest.Mock).mockResolvedValueOnce(1);

    const res = await request(app).get('/api/v1/conversations?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1 });
    expect(res.body.data).toHaveLength(1);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'b1' },
        skip: 0,
        take: 20
      })
    );
  });

  it('GET /api/v1/chat/:id/messages devuelve mensajes cuando la conversación existe', async () => {
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'c1',
      businessId: 'b1'
    });
    (prisma.message.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'm1', conversationId: 'c1', content: 'Hola', createdAt: new Date().toISOString() }
    ]);

    const res = await request(app).get('/api/v1/conversations/c1/messages?page=1&limit=50');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: 'c1' },
        skip: 0,
        take: 50
      })
    );
  });

  it('GET /api/v1/chat/:id/messages retorna 404 si la conversación no existe', async () => {
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/conversations/unknown/messages');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Conversación no encontrada');
  });

  it('POST /api/v1/chat/:id/messages crea mensaje, emite evento y envía WhatsApp si hay teléfono', async () => {
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'c1',
      businessId: 'b1',
      customer: { id: 'cust1', phone: '+584121234567', name: 'Cliente' }
    });
    (prisma.message.create as jest.Mock).mockResolvedValueOnce({
      id: 'm1',
      conversationId: 'c1',
      content: 'Respuesta',
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/api/v1/conversations/c1/messages')
      .send({ content: 'Respuesta' });

    expect(res.status).toBe(201);
    expect(prisma.message.create).toHaveBeenCalled();
    expect((emitToBusiness as jest.Mock)).toHaveBeenCalledWith(
      'b1',
      'new_message',
      expect.objectContaining({
        conversation: expect.any(Object),
        message: expect.any(Object)
      })
    );
    expect((whatsappService.sendMessage as jest.Mock)).toHaveBeenCalledWith(
      'b1',
      '+584121234567',
      'Respuesta'
    );
  });

  it('POST /api/v1/chat/:id/messages retorna 400 si falta contenido', async () => {
    const res = await request(app)
      .post('/api/v1/conversations/c1/messages')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Contenido requerido');
  });

  it('POST /api/v1/chat/:id/messages retorna 404 si la conversación no existe', async () => {
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/conversations/unknown/messages')
      .send({ content: 'Hola' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Conversación no encontrada');
  });

  it('PATCH /api/v1/chat/:id/bot alterna botActive y emite evento', async () => {
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'c1',
      businessId: 'b1',
      botActive: false
    });
    (prisma.conversation.update as jest.Mock).mockResolvedValueOnce({
      id: 'c1',
      businessId: 'b1',
      botActive: true,
      status: 'BOT'
    });

    const res = await request(app).patch('/api/v1/conversations/c1/bot');

    expect(res.status).toBe(200);
    expect(prisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({
          botActive: true
        })
      })
    );
    expect((emitToBusiness as jest.Mock)).toHaveBeenCalledWith(
      'b1',
      'conversation_updated',
      expect.objectContaining({ id: 'c1', botActive: true })
    );
  });

  it('PATCH /api/v1/chat/:id/bot retorna 404 si la conversación no existe', async () => {
    (prisma.conversation.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await request(app).patch('/api/v1/conversations/unknown/bot');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Conversación no encontrada');
  });
});
