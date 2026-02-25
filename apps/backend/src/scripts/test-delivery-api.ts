
import 'dotenv/config';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me-longer-version-1234567890';
const API_URL = 'http://localhost:3001/api/v1';

async function main() {
  console.log('Starting Delivery API Test (Backend -> Frontend Simulation)...');

  try {
    // 1. Setup Data
    console.log('Setting up test data...');
    
    // Business
    let business = await prisma.business.findFirst({ where: { slug: 'api-delivery-test' } });
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: 'API Delivery Test Biz',
          slug: 'api-delivery-test',
          type: 'FOOD',
          whatsapp: '555-API-00'
        }
      });
    }

    // User (Admin)
    let user = await prisma.storeUser.findFirst({ where: { email: 'admin@api-test.com' } });
    if (!user) {
      user = await prisma.storeUser.create({
        data: {
          email: 'admin@api-test.com',
          name: 'Admin Tester',
          passwordHash: 'hashed_password', // Dummy
          businessId: business.id,
          role: 'OWNER'
        }
      });
    }

    // Generate Token
    const token = jwt.sign(
      { 
        userId: user.id, 
        businessId: business.id, 
        role: user.role,
        email: user.email 
      },
      process.env.JWT_SECRET || 'super-secret-key-change-me-longer-version-1234567890',
      { expiresIn: '1h' }
    );
    console.log('Generated Token for user:', user.email);

    // Customer
    let customer = await prisma.customer.findFirst({ where: { phone: '555-API-99' } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: 'API Customer',
          phone: '555-API-99'
        }
      });
    }

    // Delivery Person
    let person = await prisma.deliveryPerson.findFirst({ where: { email: 'driver-api@example.com' } });
    if (!person) {
      person = await prisma.deliveryPerson.create({
        data: {
          businessId: business.id,
          name: 'API Driver',
          email: 'driver-api@example.com',
          phone: '555-API-88',
          idNumber: 'V-API-88',
          isAvailable: true,
          passwordHash: '$2b$12$e/y.d4.w.T.r.1.e.1.2.3.4.5.6.7.8.9.0' // Mock hash if needed, but better to set correctly via script if we want real login
        }
      });
    }

    // Update password for login test
    // Hash for '123456' generated with 12 rounds (matching backend env if set, or default)
    // Actually, let's use the same bcrypt logic as auth service to be sure
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('123456', 12);
    
    await prisma.deliveryPerson.update({
      where: { id: person.id },
      data: { passwordHash: hash }
    });

    // Test Delivery Login
    console.log('\n--- Testing Delivery Login API ---');
    const loginRes = await fetch(`${API_URL}/auth/login-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'driver-api@example.com',
        password: '123456'
      })
    });
    
    if (loginRes.ok) {
      const data = await loginRes.json();
      console.log('✅ Delivery Login Successful');
      console.log('Token:', data.accessToken ? 'Present' : 'Missing');
      console.log('User Role:', data.user.role);
    } else {
      console.error('❌ Delivery Login Failed:', await loginRes.text());
    }

    // Order
    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        totalCents: 5000,
        paymentMethod: 'CASH_USD',
        status: 'CONFIRMED',
        shippingCostCents: 500,
        deliveryAddress: 'API Test Address'
      }
    });
    console.log('Order created:', order.id);

    // 2. Test Assign API (Simulating Frontend)
    console.log('\n--- Testing Assign API ---');
    // Frontend sends POST /delivery/orders/:id/assign with { deliveryPersonId }
    // Note: orderId is NOT in body
    
    const assignRes = await fetch(`${API_URL}/delivery/orders/${order.id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        deliveryPersonId: person.id
        // orderId is MISSING from body, testing if backend handles it
      })
    });

    const assignData = await assignRes.json();
    
    if (!assignRes.ok) {
      console.error('Assign failed:', assignData);
      throw new Error(`Assign API failed with status ${assignRes.status}`);
    }

    console.log('Assign Success:', assignData.success);
    const deliveryOrderId = assignData.deliveryOrder.id;
    const otpCode = assignData.deliveryOrder.otpCode;
    console.log('DeliveryOrder ID:', deliveryOrderId);
    console.log('OTP (from response):', otpCode);

    // 3. Test Confirm OTP API (Simulating Frontend)
    console.log('\n--- Testing Confirm OTP API ---');
    // Frontend sends POST /delivery/orders/:id/confirm-otp with { otpCode }
    // Note: orderId, deliveryPersonId are MISSING from body
    // Note: otp is named otpCode in body

    const confirmRes = await fetch(`${API_URL}/delivery/orders/${order.id}/confirm-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        otpCode: otpCode
      })
    });

    const confirmData = await confirmRes.json();

    if (!confirmRes.ok) {
      console.error('Confirm failed:', confirmData);
      throw new Error(`Confirm API failed with status ${confirmRes.status}`);
    }

    console.log('Confirm Success:', confirmData.success);
    console.log('Status:', confirmData.deliveryOrder.status);

    // Cleanup
    console.log('\nCleaning up...');
    await prisma.deliveryOrder.delete({ where: { id: deliveryOrderId } });
    await prisma.order.delete({ where: { id: order.id } });

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
