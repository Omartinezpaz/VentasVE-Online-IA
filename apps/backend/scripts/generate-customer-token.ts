import 'dotenv/config';
import jwt from 'jsonwebtoken';
import prisma from '@ventasve/database';

const args = process.argv.slice(2);

const emailArg =
  args.find(arg => arg.startsWith('--email='))?.split('=')[1] ??
  args[args.findIndex(arg => arg === '--email') + 1];

const businessArg =
  args.find(arg => arg.startsWith('--business='))?.split('=')[1] ??
  args[args.findIndex(arg => arg === '--business') + 1];

if (!emailArg || !businessArg) {
  console.log('Uso: pnpm tsx scripts/generate-customer-token.ts --email=EMAIL --business=SLUG');
  console.log(
    'Ejemplo: pnpm tsx scripts/generate-customer-token.ts --email=demo1@cliente.test --business=omarte'
  );
  process.exit(1);
}

async function main() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET no está definido en .env');
  }

  const customer = await prisma.customer.findFirst({
    where: {
      email: emailArg
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  if (!customer) {
    console.error(`❌ Cliente no encontrado: ${emailArg}`);
    process.exit(1);
  }

  const business = await prisma.business.findUnique({
    where: {
      slug: businessArg
    },
    select: {
      id: true,
      name: true,
      slug: true
    }
  });

  if (!business) {
    console.error(`❌ Negocio no encontrado: ${businessArg}`);
    process.exit(1);
  }

  const profile = await prisma.customerBusinessProfile.findUnique({
    where: {
      unique_customer_business: {
        customerId: customer.id,
        businessId: business.id
      }
    },
    select: {
      type: true
    }
  });

  const payload = {
    sub: customer.id,
    email: customer.email ?? '',
    businessId: business.id,
    profileType: profile?.type ?? 'REGISTERED'
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn: '30d' });

  console.log('\n✅ Token generado exitosamente!\n');
  console.log('👤 Cliente:', customer.name || customer.email);
  console.log('🏪 Negocio:', business.name, `(${business.slug})`);
  console.log('🔑 Tipo de perfil:', payload.profileType);
  console.log('\n📋 JWT (copiar para frontend):\n');
  console.log(token);
  console.log('\n💡 Para usar en frontend:');
  console.log(
    `localStorage.setItem('ventasve_customer_access_token', '${token.replace(/'/g, "\\'")}');`
  );
  console.log('\n🔗 Endpoint para probar:');
  console.log('GET http://localhost:3001/api/v1/customers/me/profile');
  console.log(`Header: Authorization: Bearer ${token.substring(0, 50)}...\n`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

