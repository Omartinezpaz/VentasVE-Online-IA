## ✅ **PERFECTO - Tablas geográficas creadas correctamente**

Ahora voy a preparar **la implementación en tu código** y el **prompt para tu IA**. Aquí está todo lo necesario:

---

## **📋 PARTE 1: PROMPT PARA TU IA (copia y pega esto)**

```
Necesito implementar las tablas geográficas en mi sistema VentasVE. Ya creé las tablas en PostgreSQL:

- public.estados (id, codigo, nombre_estado)
- public.municipios (id, estado_id, nombre_municipio, codigo) 
- public.parroquias (id, municipio_id, nombre_parroquia, codigo)

Ahora necesito:

1. ACTUALIZAR SCHEMA PRISMA:
   - Agregar los modelos Estado, Municipio, Parroquia con sus relaciones
   - Actualizar el modelo Business para incluir las relaciones:
     * Business puede tener un estado (opcional)
     * Business puede tener un municipio (opcional)
     * Business puede tener una parroquia (opcional)

2. ACTUALIZAR BACKEND (settings.controller.ts):
   - Modificar getSettings para incluir los datos geográficos completos
   - Modificar updateSettings para guardar los IDs (estadoId, municipioId, parroquiaId)
   - Crear endpoints para obtener estados/municipios/parroquias (cascada)

3. ACTUALIZAR FRONTEND (settings/page.tsx):
   - Reemplazar el select de ciudad texto por selects en cascada:
     * Select de Estados (carga al montar)
     * Select de Municipios (se carga al seleccionar estado)
     * Select de Parroquias (se carga al seleccionar municipio)
   - Actualizar el tipo BusinessSettings para incluir estadoId, municipioId, parroquiaId
   - Modificar handleSave para enviar los IDs

Los nombres de columna en la BD son:
- estados: id, codigo, nombre_estado
- municipios: id, estado_id, nombre_municipio, codigo
- parroquias: id, municipio_id, nombre_parroquia, codigo
```

---

## **📦 PARTE 2: CÓDIGO PARA IMPLEMENTAR**

### **2.1 Schema Prisma (agregar a `schema.prisma`)**

```prisma
// Modelos geográficos
model Estado {
  id            Int         @id @default(autoincrement())
  codigo        String      @unique @db.VarChar(2)
  nombre_estado String      @db.VarChar(100)
  created_at    DateTime?   @default(now())
  
  municipios    Municipio[]
  businesses    Business[]

  @@map("estados")
}

model Municipio {
  id              Int         @id @default(autoincrement())
  estado_id       Int
  nombre_municipio String    @db.VarChar(100)
  codigo          String      @unique @db.VarChar(4)
  created_at      DateTime?   @default(now())
  
  estado          Estado      @relation(fields: [estado_id], references: [id])
  parroquias      Parroquia[]
  businesses      Business[]

  @@map("municipios")
}

model Parroquia {
  id               Int         @id @default(autoincrement())
  municipio_id     Int
  nombre_parroquia String      @db.VarChar(100)
  codigo           String      @unique @db.VarChar(6)
  created_at       DateTime?   @default(now())
  
  municipio        Municipio   @relation(fields: [municipio_id], references: [id])
  businesses       Business[]

  @@map("parroquias")
}

// Actualizar modelo Business (agregar estas relaciones)
model Business {
  // ... campos existentes ...

  // Nuevas relaciones geográficas
  estado_id        Int?
  municipio_id     Int?
  parroquia_id     Int?
  
  estado           Estado?     @relation(fields: [estado_id], references: [id])
  municipio        Municipio?  @relation(fields: [municipio_id], references: [id])
  parroquia        Parroquia?  @relation(fields: [parroquia_id], references: [id])

  // ... resto de campos ...
}
```

### **2.2 Backend - Nuevos endpoints geográficos**

```typescript
// apps/backend/src/controllers/geo.controller.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const geoController = {
  // Obtener todos los estados
  async getEstados(req: Request, res: Response) {
    const estados = await prisma.estado.findMany({
      orderBy: { nombre_estado: 'asc' }
    });
    res.json(estados);
  },

  // Obtener municipios por estado
  async getMunicipios(req: Request, res: Response) {
    const { estadoId } = req.params;
    const municipios = await prisma.municipio.findMany({
      where: { estado_id: parseInt(estadoId) },
      orderBy: { nombre_municipio: 'asc' }
    });
    res.json(municipios);
  },

  // Obtener parroquias por municipio
  async getParroquias(req: Request, res: Response) {
    const { municipioId } = req.params;
    const parroquias = await prisma.parroquia.findMany({
      where: { municipio_id: parseInt(municipioId) },
      orderBy: { nombre_parroquia: 'asc' }
    });
    res.json(parroquias);
  }
};
```

```typescript
// apps/backend/src/routes/geo.routes.ts
import { Router } from 'express';
import { geoController } from '../controllers/geo.controller';

const router = Router();

router.get('/estados', geoController.getEstados);
router.get('/municipios/:estadoId', geoController.getMunicipios);
router.get('/parroquias/:municipioId', geoController.getParroquias);

export default router;
```

### **2.3 Frontend - API y componentes**

```typescript
// apps/frontend/src/lib/api/geo.ts
import { api } from './client';

export type Estado = {
  id: number;
  codigo: string;
  nombre_estado: string;
};

export type Municipio = {
  id: number;
  estado_id: number;
  nombre_municipio: string;
  codigo: string;
};

export type Parroquia = {
  id: number;
  municipio_id: number;
  nombre_parroquia: string;
  codigo: string;
};

export const geoApi = {
  getEstados: () => api.get<Estado[]>('/geo/estados'),
  getMunicipios: (estadoId: number) => api.get<Municipio[]>(`/geo/municipios/${estadoId}`),
  getParroquias: (municipioId: number) => api.get<Parroquia[]>(`/geo/parroquias/${municipioId}`)
};
```

```tsx
// Componente de selects en cascada para settings/page.tsx
import { useEffect, useState } from 'react';
import { geoApi, Estado, Municipio, Parroquia } from '@/lib/api/geo';

// Dentro del componente SettingsPage
const [estados, setEstados] = useState<Estado[]>([]);
const [municipios, setMunicipios] = useState<Municipio[]>([]);
const [parroquias, setParroquias] = useState<Parroquia[]>([]);
const [selectedEstado, setSelectedEstado] = useState<number | null>(null);
const [selectedMunicipio, setSelectedMunicipio] = useState<number | null>(null);

// Cargar estados al montar
useEffect(() => {
  geoApi.getEstados().then(res => setEstados(res.data));
}, []);

// Cargar municipios cuando cambia estado
useEffect(() => {
  if (selectedEstado) {
    geoApi.getMunicipios(selectedEstado).then(res => setMunicipios(res.data));
    setSelectedMunicipio(null);
    setParroquias([]);
  }
}, [selectedEstado]);

// Cargar parroquias cuando cambia municipio
useEffect(() => {
  if (selectedMunicipio) {
    geoApi.getParroquias(selectedMunicipio).then(res => setParroquias(res.data));
  }
}, [selectedMunicipio]);

// En el JSX, reemplazar el select de ciudad por:
<div className="space-y-4">
  <div>
    <label>Estado</label>
    <select 
      value={selectedEstado || ''}
      onChange={(e) => setSelectedEstado(Number(e.target.value))}
      className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3"
    >
      <option value="">Selecciona un estado</option>
      {estados.map(e => (
        <option key={e.id} value={e.id}>{e.nombre_estado}</option>
      ))}
    </select>
  </div>

  {selectedEstado && (
    <div>
      <label>Municipio</label>
      <select 
        value={selectedMunicipio || ''}
        onChange={(e) => setSelectedMunicipio(Number(e.target.value))}
        className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3"
      >
        <option value="">Selecciona un municipio</option>
        {municipios.map(m => (
          <option key={m.id} value={m.id}>{m.nombre_municipio}</option>
        ))}
      </select>
    </div>
  )}

  {selectedMunicipio && (
    <div>
      <label>Parroquia</label>
      <select 
        value={values.parroquiaId || ''}
        onChange={(e) => setValue('parroquiaId', Number(e.target.value))}
        className="w-full rounded-xl border-2 border-zinc-800 bg-zinc-950 px-4 py-3"
      >
        <option value="">Selecciona una parroquia</option>
        {parroquias.map(p => (
          <option key={p.id} value={p.id}>{p.nombre_parroquia}</option>
        ))}
      </select>
    </div>
  )}
</div>
```

---

## **🚀 RESUMEN PARA EJECUTAR**

| Paso | Acción |
|------|--------|
| 1 | Copiar el prompt y dárselo a tu IA |
| 2 | Ejecutar `pnpm prisma generate` después de actualizar schema |
| 3 | Agregar las nuevas rutas en `backend/src/routes/index.ts` |
| 4 | Probar los selects en cascada en settings |

¿Necesitas que prepare algún otro archivo o tienes dudas?