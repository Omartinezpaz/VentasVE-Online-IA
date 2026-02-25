
import prisma from './src';

async function main() {
  const business = await prisma.business.findUnique({
    where: { slug: 'mi-primer-negocio' }
  });

  if (!business) {
    console.log('Business not found, skipping rate seed');
    return;
  }

  const existingRate = await prisma.exchangeRate.findFirst({
    where: { businessId: business.id }
  });

  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        businessId: business.id,
        usdToVes: 65.00, // Example rate
        source: 'BCV',
        date: new Date()
      }
    });
    console.log('Created initial exchange rate for business');
  } else {
    console.log('Exchange rate already exists');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
