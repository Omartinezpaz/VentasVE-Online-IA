import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';

export const getPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.$queryRaw<any[]>`
      SELECT id, codigo, nombre, icono, requiere_cuenta, requiere_comprobante, orden
      FROM public.metodos_pago
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    res.json(
      data.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        icono: r.icono,
        requiereCuenta: r.requiere_cuenta,
        requiereComprobante: r.requiere_comprobante,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

export const getBusinessTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.$queryRaw<any[]>`
      SELECT id, codigo, nombre, icono, descripcion, orden
      FROM public.tipos_negocio
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
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
    const data = await prisma.$queryRaw<any[]>`
      SELECT id, codigo_ibp, nombre, nombre_corto, orden
      FROM public.bancos
      WHERE activo = true
      ORDER BY orden ASC, nombre_corto ASC, nombre ASC
    `;
    res.json(
      data.map((r) => ({
        id: r.id,
        codigo_ibp: r.codigo_ibp,
        nombre: r.nombre,
        nombre_corto: r.nombre_corto,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

export const getIslrRegimens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.$queryRaw<any[]>`
      SELECT id, codigo, nombre, descripcion, orden
      FROM public.regimenes_islr
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
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
    const data = await prisma.$queryRaw<any[]>`
      SELECT id, codigo, nombre, descripcion, requiere_razon_social, requiere_nombre_completo, orden
      FROM public.tipos_persona
      WHERE activo = true
      ORDER BY orden ASC, nombre ASC
    `;
    res.json(
      data.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
        requiereRazonSocial: r.requiere_razon_social,
        requiereNombreCompleto: r.requiere_nombre_completo,
        orden: r.orden,
      }))
    );
  } catch (e) {
    next(e);
  }
};

