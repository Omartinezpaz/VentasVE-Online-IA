import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';

export const getPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.metodoPago.findMany({
      where: { activo: true },
      orderBy: [
        { orden: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        icono: true,
        requiereCuenta: true,
        requiereComprobante: true,
        orden: true
      }
    });

    res.json(
      data.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        icono: r.icono,
        requiereCuenta: r.requiereCuenta,
        requiereComprobante: r.requiereComprobante,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

export const getBusinessTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.tipoNegocio.findMany({
      where: { activo: true },
      orderBy: [
        { orden: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        icono: true,
        descripcion: true,
        orden: true
      }
    });

    res.json(
      data.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        icono: r.icono,
        descripcion: r.descripcion,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

export const getBanks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.banco.findMany({
      where: { activo: true },
      orderBy: [
        { orden: 'asc' },
        { nombreCorto: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        codigoIbp: true,
        nombre: true,
        nombreCorto: true,
        orden: true
      }
    });

    res.json(
      data.map((r) => ({
        id: r.id,
        codigo_ibp: r.codigoIbp,
        nombre: r.nombre,
        nombre_corto: r.nombreCorto,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

export const getIslrRegimens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.regimenIslr.findMany({
      where: { activo: true },
      orderBy: [
        { orden: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        orden: true
      }
    });

    res.json(
      data.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

export const getPersonTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.tipoPersona.findMany({
      where: { activo: true },
      orderBy: [
        { orden: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        requiereRazonSocial: true,
        requiereNombreCompleto: true,
        orden: true
      }
    });

    res.json(
      data.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        requiereRazonSocial: r.requiereRazonSocial,
        requiereNombreCompleto: r.requiereNombreCompleto,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

