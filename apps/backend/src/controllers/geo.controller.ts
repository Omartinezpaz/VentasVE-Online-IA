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
    const countries = await prisma.pais.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        iso3: true,
        isoCode: true,
        iso2: true,
        phoneCode: true
      }
    });

    res.json(
      countries.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        iso3: c.iso3,
        isoCode: c.isoCode,
        iso2: c.iso2,
        phoneCode: c.phoneCode
      }))
    );
  } catch (error) {
    next(error);
  }
};

export const getVeAreaCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const areaCodes = await prisma.codigosAreaVenezuela.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
      select: {
        id: true,
        codigo: true,
        tipo: true,
        operadora: true,
        estadoPrincipal: true
      }
    });

    res.json(
      areaCodes.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        tipo: c.tipo,
        operadora: c.operadora,
        estado_principal: c.estadoPrincipal
      }))
    );
  } catch (error) {
    next(error);
  }
};

