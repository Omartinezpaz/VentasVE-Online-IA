
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Starting Shipping Zones Debug...');

  try {
    // 1. Get a business
    const business = await prisma.business.findFirst();
    if (!business) {
      console.log('No business found in DB');
      return;
    }
    const businessId = business.id;
    console.log(`Checking zones for business: ${businessId} (${business.name})`);

    // 2. Fetch zones using the same query as the controller
    const zones = await prisma.shippingZone.findMany({
      where: { businessId },
      include: {
        coverages: {
          include: {
            estado: true,
            municipio: true,
            parroquia: true
          }
        },
        rates: {
          include: {
            method: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${zones.length} zones`);

    // 3. Simulate mapping logic
    zones.forEach((zone, i) => {
      console.log(`\n[${i}] Zone: ${zone.name} (${zone.id})`);
      
      // Check coverages
      console.log(`  Coverages: ${zone.coverages.length}`);
      zone.coverages.forEach(cov => {
        if (!cov.estado) {
          console.error(`  ❌ Coverage ${cov.id} is missing 'estado' relation! (estadoId: ${cov.estadoId})`);
        } else {
          console.log(`    - Estado: ${cov.estado.nombreEstado}`);
        }
      });

      // Check rates
      console.log(`  Rates: ${zone.rates.length}`);
      zone.rates.forEach(rate => {
        if (!rate.method) {
          console.error(`  ❌ Rate ${rate.id} is missing 'method' relation! (methodId: ${rate.methodId})`);
        } else {
          console.log(`    - Method: ${rate.method.name} (${rate.method.code})`);
        }
      });
    });

    // 4. Check ShippingMethod table
    const methods = await prisma.shippingMethod.findMany();
    console.log(`\nTotal ShippingMethods in DB: ${methods.length}`);
    methods.forEach(m => console.log(`  - ${m.id}: ${m.name} (${m.code})`));

  } catch (error) {
    console.error('❌ Error executing script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
