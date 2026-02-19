import { Request, Response, NextFunction } from 'express';
import prisma, { MsgRole, ConvStatus } from '@ventasve/database';
import { AuthRequest } from '../middleware/auth';
import { whatsappService } from '../services/whatsapp.service';
import { emitToBusiness } from '../lib/websocket';

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;

    const page = Number((req.query.page as string) ?? '1');
    const limit = Number((req.query.limit as string) ?? '20');
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { businessId },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.conversation.count({ where: { businessId } })
    ]);

    res.json({
      data: conversations,
      meta: { page, limit, total }
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { id } = req.params;

    const page = Number((req.query.page as string) ?? '1');
    const limit = Number((req.query.limit as string) ?? '50');
    const skip = (page - 1) * limit;

    const conversation = await prisma.conversation.findFirst({
      where: { id, businessId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit
    });

    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { id } = req.params;
    const { content } = req.body as { content?: string };

    if (!content) {
      return res.status(400).json({ error: 'Contenido requerido' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, businessId },
      include: { customer: true }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role: MsgRole.AGENT,
        content
      }
    });

    emitToBusiness(businessId, 'new_message', {
      conversation,
      customer: conversation.customer,
      message
    });

    const phone = conversation.customer?.phone;

    if (phone) {
      try {
        await whatsappService.sendMessage(businessId, phone, content);
      } catch (error) {
        console.error('Error enviando WhatsApp:', error);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

export const toggleBot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;
    const { id } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, businessId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    const nextBotActive = !conversation.botActive;
    const nextStatus = nextBotActive ? ConvStatus.BOT : ConvStatus.HUMAN;

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        botActive: nextBotActive,
        status: nextStatus
      }
    });

    emitToBusiness(businessId, 'conversation_updated', updated);

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
