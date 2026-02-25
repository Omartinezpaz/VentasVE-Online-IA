
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check for DeliveryPerson table existence by trying to count
    console.log('Checking DeliveryPerson...');
    const count = await prisma.deliveryPerson.count();
    console.log(`DeliveryPerson count: ${count}`);

    // Check for Pais table
    console.log('Checking Pais...');
    const paisCount = await prisma.pais.count();
    console.log(`Pais count: ${paisCount}`);

    // Check for a standard table
    console.log('Checking Business...');
    const businessCount = await prisma.business.count();
    console.log(`Business count: ${businessCount}`);
    
    console.log('All tables accessed successfully.');
  } catch (e) {
    console.error('Error accessing tables:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
