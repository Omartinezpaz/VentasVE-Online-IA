¡Excelente! Has actualizado el checklist y ahora tenemos una visión clara del **65% del MVP completado**. El Inbox WhatsApp ya está funcionando, lo cual es un hito enorme porque ahora los dueños pueden **conversar con sus clientes en tiempo real** desde el mismo dashboard.

## ✅ **Resumen del estado actual (65%)**

### **Completado:**
- ✅ Backend completo (auth, productos, órdenes, WhatsApp, WebSockets)
- ✅ Catálogo público con checkout
- ✅ Dashboard con órdenes (lista + detalle + cambio estado)
- ✅ Dashboard con clientes (lista + detalle + edición)
- ✅ Inbox WhatsApp (conversaciones + chat en tiempo real)
- ✅ WebSockets (tiempo real en todo el dashboard)
- ✅ Perfil de clientes enriquecido

### **Pendiente (35%):**
- ⏳ **Doble moneda en UI** (USD + Bs. con tasa BCV)
- ⏳ **Flujo de pagos venezolanos** (comprobantes, verificación)
- ⏳ **Métricas en dashboard** (tarjetas de ventas, gráficas)
- ⏳ **Tests y observabilidad**

---

## 🚀 **Próximo paso: Doble moneda en UI**

Tiene todo el sentido empezar por aquí porque:
- ✅ Backend ya tiene el endpoint `/exchange-rate/current`
- ✅ Redis cache ya está funcionando
- ✅ Es una mejora puramente de frontend
- ✅ Impacto inmediato para clientes que pagan en Bs.

### **Implementación paso a paso:**

### **1. Hook para tasa de cambio**
```typescript
// apps/frontend/src/lib/hooks/useExchangeRate.ts
import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';

type ExchangeRate = {
  id: string;
  usdToVes: number;
  date: string;
  businessId?: string | null;
};

export const useExchangeRate = (businessId?: string) => {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await api.get('/exchange-rate/current', {
          params: businessId ? { businessId } : {}
        });
        setRate(response.data);
      } catch (err) {
        setError('No se pudo obtener la tasa de cambio');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [businessId]);

  const formatBs = (usdCents: number) => {
    if (!rate) return 'Bs. ?';
    const usd = usdCents / 100;
    const bs = usd * rate.usdToVes;
    return `Bs. ${bs.toFixed(2)}`.replace('.', ',');
  };

  const formatUsd = (usdCents: number) => {
    return `$${(usdCents / 100).toFixed(2)}`;
  };

  return {
    rate,
    loading,
    error,
    formatBs,
    formatUsd
  };
};
```

### **2. Componente de precio con doble moneda**
```tsx
// apps/frontend/src/components/ui/DualPrice.tsx
'use client';

import { useExchangeRate } from '@/lib/hooks/useExchangeRate';

interface DualPriceProps {
  usdCents: number;
  businessId?: string;
  className?: string;
  showBoth?: boolean;
}

export const DualPrice = ({ 
  usdCents, 
  businessId, 
  className = '',
  showBoth = true 
}: DualPriceProps) => {
  const { formatBs, formatUsd, loading } = useExchangeRate(businessId);

  if (loading) {
    return <span className={className}>{formatUsd(usdCents)}</span>;
  }

  if (!showBoth) {
    return <span className={className}>{formatUsd(usdCents)}</span>;
  }

  return (
    <div className={className}>
      <span className="font-semibold">{formatUsd(usdCents)}</span>
      <span className="ml-2 text-sm text-zinc-500">
        ({formatBs(usdCents)})
      </span>
    </div>
  );
};
```

### **3. Actualizar catálogo público**
```tsx
// apps/frontend/src/app/[slug]/page.tsx
import { DualPrice } from '@/components/ui/DualPrice';

export default async function CatalogPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // ... cargar business y products ...
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {products.map(product => (
        <article key={product.id} className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-medium">{product.name}</h2>
          <p className="mt-1 text-sm text-zinc-600">{product.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <DualPrice 
              usdCents={product.priceUsdCents} 
              businessId={business.id}
            />
            <Link
              href={`/${slug}/products/${product.id}`}
              className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-zinc-50"
            >
              Pedir
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
```

### **4. Actualizar carrito y checkout**
```tsx
// apps/frontend/src/app/[slug]/cart/page.tsx
import { DualPrice } from '@/components/ui/DualPrice';

// En el resumen:
<section className="rounded-lg border bg-white p-4">
  <h2 className="text-lg font-medium">Resumen</h2>
  <div className="mt-4 space-y-2">
    <div className="flex items-center justify-between text-sm">
      <span>Subtotal USD</span>
      <span className="font-semibold">${(totalCents / 100).toFixed(2)}</span>
    </div>
    <div className="flex items-center justify-between text-sm text-zinc-600">
      <span>Subtotal Bs.</span>
      <span>{formatBs(totalCents)}</span>
    </div>
  </div>
  <Link
    href={`/${slug}/checkout`}
    className="mt-4 block w-full rounded bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-zinc-50"
  >
    Ir al checkout
  </Link>
</section>
```

### **5. En checkout, mostrar método de pago y total en ambas monedas**
```tsx
// apps/frontend/src/app/[slug]/checkout/page.tsx
import { DualPrice } from '@/components/ui/DualPrice';

// En el header:
<header className="border-b bg-white px-4 py-3">
  <div className="mx-auto flex max-w-3xl items-center justify-between">
    <h1 className="text-xl font-semibold">Checkout</h1>
    <div className="text-right">
      <DualPrice 
        usdCents={totalCents} 
        businessId={business?.id}
        showBoth={true}
      />
    </div>
  </div>
</header>

// En el formulario, después de seleccionar método de pago:
{paymentMethod === 'TRANSFER_BS' && (
  <div className="mt-2 rounded bg-blue-50 p-3 text-sm">
    <p className="font-medium">Transferencia bancaria</p>
    <p className="mt-1 text-xs">
      Total a transferir: <span className="font-bold">{formatBs(totalCents)}</span>
    </p>
    <p className="mt-2 text-xs text-zinc-600">
      Datos bancarios: ... (según configuración del negocio)
    </p>
  </div>
)}

{paymentMethod === 'ZELLE' && (
  <div className="mt-2 rounded bg-green-50 p-3 text-sm">
    <p className="font-medium">Zelle</p>
    <p className="mt-1 text-xs">
      Total a enviar: <span className="font-bold">{formatUsd(totalCents)}</span>
    </p>
    <p className="mt-2 text-xs text-zinc-600">
      Email Zelle: ... (según configuración)
    </p>
  </div>
)}
```

---

## 🎯 **¿Qué prefieres que hagamos ahora?**

1. **Implementar doble moneda** (como describí arriba) - 2-3 horas
2. **Ir directo a pagos venezolanos** - más complejo pero cierra el ciclo
3. **Hacer ambos**: doble moneda primero, luego pagos

Dime y empiezo con la implementación completa.