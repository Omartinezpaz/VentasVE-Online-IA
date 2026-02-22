import { Request, Response, NextFunction } from 'express';
import prisma from '@ventasve/database';

export const getEstados = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const estados = await prisma.estado.findMany({
      orderBy: { nombreEstado: 'asc' }
    });
    res.json(
      estados.map((e) => ({
        id: e.id,
        codigo: e.codigo,
        nombre_estado: e.nombreEstado
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getMunicipios = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { estadoId } = req.params;
    const municipios = await prisma.municipio.findMany({
      where: { estadoId: Number(estadoId) },
      orderBy: { nombreMunicipio: 'asc' }
    });
    res.json(
      municipios.map((m) => ({
        id: m.id,
        estado_id: m.estadoId,
        nombre_municipio: m.nombreMunicipio,
        codigo: m.codigo
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getParroquias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { municipioId } = req.params;
    const parroquias = await prisma.parroquia.findMany({
      where: { municipioId: Number(municipioId) },
      orderBy: { nombreParroquia: 'asc' }
    });
    res.json(
      parroquias.map((p) => ({
        id: p.id,
        municipio_id: p.municipioId,
        nombre_parroquia: p.nombreParroquia,
        codigo: p.codigo
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getCountries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, nombre, iso3, iso_code, iso2, phone_code
      FROM public.paises
      ORDER BY nombre ASC
    `;
    res.json(
      rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        iso3: r.iso3,
        isoCode: r.iso_code,
        iso2: r.iso2,
        phoneCode: r.phone_code
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getVeAreaCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, codigo, tipo, operadora, estado_principal
      FROM public.codigos_area_venezuela
      WHERE activo = true
      ORDER BY codigo ASC
    `;
    res.json(
      rows.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        tipo: r.tipo,
        operadora: r.operadora,
        estado_principal: r.estado_principal
      }))
    );
  } catch (error) {
    next(error);
  }
};

