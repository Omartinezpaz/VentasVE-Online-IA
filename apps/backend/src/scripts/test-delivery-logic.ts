
import { prisma } from '../lib/prisma';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

async function main() {
  console.log('Starting Delivery Logic Test...');

  try {
    // 1. Setup Data
    console.log('Setting up test data...');
    
    // Business
    let business = await prisma.business.findFirst({ where: { slug: 'delivery-test-biz' } });
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: 'Delivery Test Biz',
          slug: 'delivery-test-biz',
          type: 'FOOD',
          whatsapp: '555-0000'
        }
      });
    }
    console.log('Business:', business.id);

    // Customer
    let customer = await prisma.customer.findFirst({ where: { phone: '555-9999' } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: 'Delivery Test Customer',
          phone: '555-9999'
        }
      });
    }
    console.log('Customer:', customer.id);

    // Delivery Person
    let person = await prisma.deliveryPerson.findFirst({ where: { email: 'driver-test@example.com' } });
    if (!person) {
      person = await prisma.deliveryPerson.create({
        data: {
          businessId: business.id,
          name: 'Test Driver',
          email: 'driver-test@example.com',
          phone: '555-8888',
          idNumber: 'V-99999999',
          isAvailable: true
        }
      });
    } else {
      // Reset availability
      await prisma.deliveryPerson.update({
        where: { id: person.id },
        data: { isAvailable: true }
      });
    }
    console.log('DeliveryPerson:', person.id);

    // Order
    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        totalCents: 2500, // $25.00
        paymentMethod: 'CASH_USD',
        status: 'CONFIRMED', // Ready for delivery
        shippingCostCents: 300, // $3.00
        deliveryAddress: 'Test Address 123'
      }
    });
    console.log('Order created:', order.id);

    // 2. Test Assignment Logic (Simulation of controller logic)
    console.log('\n--- Testing Assignment Logic ---');
    
    // Verify constraints
    if (!person.isAvailable) {
      console.warn('Warning: Driver is not available (but logic allows assignment currently)');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otp);

    const deliveryOrder = await prisma.$transaction(async (tx) => {
      // Create delivery order
      const newDelivery = await tx.deliveryOrder.create({
        data: {
          deliveryPersonId: person.id,
          businessId: order.businessId,
          status: 'ASSIGNED',
          orderId: order.id,
          pickupAddress: business.store_address || 'Tienda Principal',
          deliveryAddress: order.deliveryAddress || 'Dirección del cliente',
          deliveryFee: order.shippingCostCents ? order.shippingCostCents / 100 : 0,
          otpCode: otp
        }
      });

      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'SHIPPED' }
      });

      // Update driver availability (OPTIONAL but good practice)
      // await tx.deliveryPerson.update({
      //   where: { id: person.id },
      //   data: { isAvailable: false }
      // });

      return newDelivery;
    });

    console.log('DeliveryOrder created:', deliveryOrder.id);
    console.log('Status:', deliveryOrder.status);
    console.log('Fee:', deliveryOrder.deliveryFee);

    // Verify DB state
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    if (updatedOrder?.status !== 'SHIPPED') {
      throw new Error(`Order status should be SHIPPED, got ${updatedOrder?.status}`);
    }
    console.log('✅ Assignment successful');

    // 3. Test Confirmation Logic (Simulation of controller logic)
    console.log('\n--- Testing Confirmation Logic ---');

    // Validate OTP
    if (deliveryOrder.otpCode !== otp) {
      throw new Error('OTP mismatch (should not happen in test)');
    }

    const confirmedDelivery = await prisma.$transaction(async (tx) => {
      // Update delivery order
      const updated = await tx.deliveryOrder.update({
        where: { id: deliveryOrder.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date()
        }
      });

      // Update main order
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'DELIVERED' }
      });

      // Update driver stats
      await tx.deliveryPerson.update({
        where: { id: person.id },
        data: {
          completedOrders: { increment: 1 },
          totalDeliveries: { increment: 1 },
          isAvailable: true
        }
      });

      return updated;
    });

    console.log('DeliveryOrder confirmed:', confirmedDelivery.status);
    
    // Verify DB state
    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    if (finalOrder?.status !== 'DELIVERED') {
      throw new Error(`Order status should be DELIVERED, got ${finalOrder?.status}`);
    }
    
    const updatedPerson = await prisma.deliveryPerson.findUnique({ where: { id: person.id } });
    console.log('Driver completed orders:', updatedPerson?.completedOrders);
    
    console.log('✅ Confirmation successful');

    // Cleanup
    console.log('\nCleaning up...');
    await prisma.deliveryOrder.delete({ where: { id: deliveryOrder.id } });
    await prisma.order.delete({ where: { id: order.id } });
    // Keep business/customer/person for reuse

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
