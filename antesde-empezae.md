Sí. Hay cosas que si no haces antes de escribir la primera línea de código, te van a costar días de trabajo después. Déjame ser directo.

---

## Lo que falta antes de empezar a programar

### 1. El entorno local tiene que funcionar en 10 minutos

Antes de tocar código de negocio, necesitas que cualquier persona (o tú mismo en una computadora nueva) pueda levantar el proyecto con tres comandos:

```bash
git clone https://github.com/tu-usuario/ventasve
cd ventasve
pnpm setup  # instala, levanta Docker, migra DB, siembra datos de prueba
```

Si eso no funciona, el proyecto está roto por definición. Crea este script antes que cualquier feature.

---

### 2. Los 5 negocios beta — esto es lo más importante de toda la lista

No es técnico, pero es lo que decide si el proyecto vive o muere. Antes de escribir código necesitas comprometerte con 5 dueños de negocio reales en Venezuela que accedan a usar la plataforma durante 4 semanas a cambio de acceso gratuito y tu tiempo de soporte.

Por qué esto va antes que el código: vas a descubrir en la semana 2 que los negocios de comida necesitan un campo de "tiempo de preparación" que no está en el schema, o que el 80% de tus usuarios confirman pagos por audio de WhatsApp y no por imagen. Ese conocimiento vale más que cualquier línea de código que escribas ahora.

La forma más rápida de conseguirlos: habla con dueños de tiendas en Instagram venezolanas. DM directo, propuesta simple: "Te ayudo a tener un catálogo online gratis a cambio de feedback honesto".

---

### 3. Dominio y staging desde el día 1

Compra el dominio hoy. `ventasve.app` o similar. No esperes al MVP para hacer esto porque el slug del catálogo público (`ventasve.app/c/mismodas`) es parte del valor del producto y necesitas que los beta testers lo prueben con la URL real, no con `localhost:3000`.

Para staging necesitas exactamente esto:

```
producción  → ventasve.app          (solo cuando esté listo)
staging     → staging.ventasve.app  (desde el día 1, conectado a main)
preview     → pr-123.ventasve.app   (automático por Vercel en cada PR)
```

El staging conectado a `main` es lo que le muestras a los beta testers. Cada vez que mergeas un PR, ellos ven los cambios al día siguiente sin que tengas que hacer nada.

---

### 4. El `docker-compose.yml` que necesitas ahora mismo

No instales PostgreSQL ni Redis directo en tu máquina. Todo en Docker desde el inicio:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ventasve_dev
      POSTGRES_USER: ventasve
      POSTGRES_PASSWORD: dev_password_local
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # UI para ver emails de desarrollo

volumes:
  postgres_data:
```

`mailhog` es clave: cuando el sistema envíe el email de verificación de cuenta o el de reset de contraseña, lo vas a ver en `localhost:8025` sin necesitar una cuenta real de email. Ahorra horas de debugging.

---

### 5. Tres decisiones pendientes que no están en la documentación

Necesitas tomar estas decisiones antes de escribir código porque afectan el schema y la arquitectura:

**¿Multiusuario desde el MVP o solo un usuario por negocio?**
El schema ya tiene soporte para roles (`OWNER`, `AGENT`), pero implementar invitaciones de equipo toma tiempo. Recomiendo: en el MVP el negocio tiene un solo usuario (OWNER). La pantalla de "invitar agente" la dejas en la UI pero desactivada con "Próximamente". Esto simplifica auth y los primeros 5 negocios beta probablemente son operados por una sola persona.

**¿Baileys o API Oficial de Meta para el MVP?**
Baileys es más rápido de conectar (escaneas un QR y listo) pero viola los términos de WhatsApp y Meta puede banear el número. La API Oficial requiere aprobación que puede tomar 1-4 semanas. Mi recomendación: usa Baileys para los 5 beta testers con números de prueba. Mientras tanto, inicia el proceso de aprobación de Meta. Cuando llegues a usuarios pagando, ya tienes la API oficial aprobada.

**¿Imágenes en Cloudflare R2 o en el servidor?**
Nunca en el servidor. Cloudflare R2 tiene capa gratuita generosa (10GB storage, 1M operaciones/mes) y cero egress fees, que importa mucho cuando tus usuarios están en Venezuela con conexiones variables. Configura R2 antes de implementar subida de fotos de productos.

---

### 6. Lo que Cursor o Claude Code necesitan además del `CLAUDE.md`

El `CLAUDE.md` que tienes es el contrato de código. Pero la IA también necesita contexto inmediato. Crea estos tres archivos adicionales:

**`.cursorrules`** (si usas Cursor) — instrucciones de estilo en tiempo real:
```
- Siempre TypeScript strict, nunca any
- Imports absolutos desde src/, no relativos con ../../../
- Los services siempre en clases, los controllers como objetos literales
- Zod schema antes del controller en el mismo PR
- Comentarios en español, código en inglés
```

**`TODO.md`** en la raíz — el backlog vivo que la IA puede ver:
```markdown
## En progreso
- [ ] Auth: registro y login (Semana 1)

## Próximo
- [ ] Products CRUD
- [ ] Image upload con R2

## Bloqueado
- [ ] WhatsApp bot (esperando decisión Baileys vs Meta)
```

**`DECISIONS.md`** — el log de decisiones técnicas con fecha, para que cuando la IA sugiera algo que ya descartaste, puedas referenciar por qué:
```markdown
## 2026-02-18 — Precios en centavos
Decisión: guardar precios como Integer en centavos USD
Razón: evitar errores de punto flotante en cálculos de totales
Alternativa descartada: Decimal(10,2) — más complejo, mismo resultado
```

---

### 7. La pregunta que debes responderte hoy

¿Cuánto tiempo tienes por semana para esto?

Si la respuesta es menos de 15 horas semanales, el roadmap de 16 semanas que tienes se convierte en 32. No es un problema, pero necesitas saberlo para no comprometer a los beta testers con fechas que no vas a cumplir.

Si tienes un co-fundador técnico o puedes contratar un desarrollador part-time desde la semana 5 en adelante (cuando el auth y el catálogo ya estén listos y la arquitectura sea estable), el proyecto avanza mucho más rápido.

---

Eso es todo lo que falta. Cuando tengas los 5 beta confirmados, el dominio comprado, el Docker funcionando y las tres decisiones tomadas, puedes abrir el editor y empezar con `auth/register`. Todo lo demás está documentado.