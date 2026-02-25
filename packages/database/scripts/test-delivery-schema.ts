import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Get or Create a Business
    let business = await prisma.business.findFirst();
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: 'Test Business',
          slug: 'test-business',
          address: 'Test Address 123',
          ownerId: 'test-owner-id',
        },
      });
    }

    // 2. Get or Create a DeliveryPerson
    let person = await prisma.deliveryPerson.findFirst({
        where: { businessId: business.id }
    });
    if (!person) {
        person = await prisma.deliveryPerson.create({
            data: {
                businessId: business.id,
                name: 'Test Driver',
                phone: '555-1234',
                email: 'driver@test.com',
                passwordHash: 'dummy',
                isAvailable: true
            }
        });
    }

    // 3. Get or Create an Order
    let order = await prisma.order.findFirst({
        where: { businessId: business.id }
    });
    if (!order) {
        // Need a customer first
        let customer = await prisma.customer.findFirst();
        if (!customer) {
             customer = await prisma.customer.create({
                 data: {
                     phone: '555-9876',
                     name: 'Test Customer'
                 }
             });
        }
        order = await prisma.order.create({
            data: {
                businessId: business.id,
                customerId: customer.id,
                totalCents: 1000,
                paymentMethod: 'CASH',
                status: 'PENDING',
                shippingCostCents: 500, // $5.00
                deliveryAddress: 'Calle Real 456, Caracas'
            }
        });
    }

    // 4. Create DeliveryOrder (The actual test)
    console.log('Creating DeliveryOrder with new fields...');
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
    if (deliveryOrder.pickupAddress && deliveryOrder.deliveryAddress && deliveryOrder.deliveryFee) {
        console.log('SUCCESS: All new fields persisted correctly.');
    } else {
        console.error('FAILURE: Missing fields in created record.');
    }

    // Cleanup
    await prisma.deliveryOrder.delete({ where: { id: deliveryOrder.id } });
    console.log('Cleanup complete.');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
