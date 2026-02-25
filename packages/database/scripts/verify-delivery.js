const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('Starting Delivery Schema Verification...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
      console.error('Error: DATABASE_URL not found in environment.');
      process.exit(1);
  }

  // Setup connection pool and adapter (matching src/index.ts logic)
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({ 
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Get or Create a Business
    let business = await prisma.business.findFirst();
    if (!business) {
      console.log('Creating test business...');
      business = await prisma.business.create({
        data: {
          name: 'Test Business JS',
          slug: 'test-business-js-' + Date.now(),
          address: 'Test Address 123',
          whatsapp: '555-1234',
          type: 'FOOD' // Using a valid enum value
        },
      });
    }
    console.log('Using Business:', business.id);

    // 2. Get or Create a DeliveryPerson
    let person = await prisma.deliveryPerson.findFirst({
        where: { businessId: business.id }
    });
    if (!person) {
        console.log('Creating test delivery person...');
        person = await prisma.deliveryPerson.create({
            data: {
                business: { connect: { id: business.id } },
                name: 'Test Driver JS',
                phone: '555-1234-' + Date.now(),
                email: 'driver-' + Date.now() + '@test.com',
                idNumber: 'V-' + Date.now(),
                isAvailable: true
            }
        });
    }
    console.log('Using DeliveryPerson:', person.id);

    // 3. Get or Create an Order
    let order = await prisma.order.findFirst({
        where: { businessId: business.id }
    });
    if (!order) {
        console.log('Creating test order...');
        // Need a customer first
        let customer = await prisma.customer.findFirst();
        if (!customer) {
             customer = await prisma.customer.create({
                 data: {
                     phone: '555-9876-' + Date.now(),
                     name: 'Test Customer JS'
                 }
             });
        }
        order = await prisma.order.create({
            data: {
                businessId: business.id,
                customerId: customer.id,
                totalCents: 1000,
                paymentMethod: 'CASH_USD',
                status: 'PENDING',
                shippingCostCents: 500, // $5.00
                deliveryAddress: 'Calle Real 456, Caracas'
            }
        });
    }
    console.log('Using Order:', order.id);

    // 4. Create DeliveryOrder (The actual test)
    console.log('Creating DeliveryOrder with new fields...');
    
    // Check if one exists for this order to avoid unique constraint
    const existing = await prisma.deliveryOrder.findUnique({ where: { orderId: order.id } });
    if (existing) {
        await prisma.deliveryOrder.delete({ where: { id: existing.id } });
    }

    const deliveryOrder = await prisma.deliveryOrder.create({
        data: {
            orderId: order.id,
            deliveryPersonId: person.id,
            businessId: business.id,
            status: 'ASSIGNED',
            otpCode: '123456',
            pickupAddress: business.address || 'Tienda Test',
            deliveryAddress: order.deliveryAddress || 'Cliente Test',
            deliveryFee: 5.00 // Testing the Decimal field
        }
    });

    console.log('DeliveryOrder created successfully:', deliveryOrder);

    // Verify fields
    if (deliveryOrder.pickupAddress === (business.address || 'Tienda Test') && 
        deliveryOrder.deliveryAddress === (order.deliveryAddress || 'Cliente Test') &&
        Number(deliveryOrder.deliveryFee) === 5.00) {
        console.log('SUCCESS: All new fields persisted correctly.');
    } else {
        console.error('FAILURE: Missing or incorrect fields in created record.');
        console.log('Expected:', {
            pickup: business.address || 'Tienda Test',
            delivery: order.deliveryAddress || 'Cliente Test',
            fee: 5.00
        });
        console.log('Actual:', {
            pickup: deliveryOrder.pickupAddress,
            delivery: deliveryOrder.deliveryAddress,
            fee: deliveryOrder.deliveryFee
        });
    }

    // Cleanup
    await prisma.deliveryOrder.delete({ where: { id: deliveryOrder.id } });
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
