import prisma, { BusinessType, Plan, Role } from '../src';

async function main() {
  const existing = await prisma.storeUser.findUnique({
    where: { email: 'owner@mi-primer-negocio.test' }
  });

  if (existing) {
    console.log('Owner ya existe, no se crean datos nuevos');
    return;
  }

  const passwordHash = '$2b$12$eBieKszAL1uuPvuXgWgb6..Hoh1Ey5UUJ1P6lqFmdWQya22Luqdsu';

  const business = await prisma.business.create({
    data: {
      slug: 'mi-primer-negocio',
      name: 'Mi Primer Negocio',
      type: BusinessType.OTHER,
      plan: Plan.FREE,
      whatsapp: '+584120000000',
      city: 'Caracas',
      isActive: true
    }
  });

  const user = await prisma.storeUser.create({
    data: {
      email: 'owner@mi-primer-negocio.test',
      passwordHash,
      name: 'Dueño del Negocio',
      role: Role.OWNER,
      businessId: business.id,
      isVerified: true
    }
  });

  console.log('Primer OWNER creado');
  console.log('Business slug:', business.slug);
  console.log('Email:', user.email);
  console.log('Password:', 'Owner123!');
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
