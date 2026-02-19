import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';
import { AuthRequest } from '../middleware/auth';
import { whatsappService } from '../services/whatsapp.service';

export const connect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        whatsapp: true
      }
    });

    if (!business?.whatsapp) {
      return res.status(400).json({
        error: 'El negocio necesita un número de WhatsApp configurado',
        code: 'WHATSAPP_PHONE_REQUIRED'
      });
    }

    await whatsappService.connectBusiness(businessId, business.whatsapp);

    res.json({
      message: 'Iniciando conexión WhatsApp. Escanea el QR en el dashboard.'
    });
  } catch (error) {
    next(error);
  }
};

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;

    const status = whatsappService.getStatus(businessId);

    res.json(status);
  } catch (error) {
    next(error);
  }
};

export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId;

    whatsappService.disconnectBusiness(businessId);

    res.json({
      message: 'WhatsApp desconectado'
    });
  } catch (error) {
    next(error);
  }
};

