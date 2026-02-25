import 'dotenv/config';
import prisma, { PaymentMethod } from '@ventasve/database';

import { randomUUID } from 'crypto';

async function main() {
  const customersData = [
    {
      email: 'demo1@cliente.test',
      name: 'Cliente Demo Uno',
      phone: '+58 412-0000001',
      identification: 'V-10000001',
      firstName: 'Cliente',
      lastName: 'Demo Uno'
    },
    {
      email: 'demo2@cliente.test',
      name: 'Cliente Demo Dos',
      phone: '+58 414-0000002',
      identification: 'V-10000002',
      firstName: 'Cliente',
      lastName: 'Demo Dos'
    },
    {
      email: 'demo3@cliente.test',
      name: 'Cliente Demo Tres',
      phone: '+58 424-0000003',
      identification: 'V-10000003',
      firstName: 'Cliente',
      lastName: 'Demo Tres'
    }
  ];

  for (const item of customersData) {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: item.email
      }
    });

    const customer =
      existingCustomer ??
      (await prisma.customer.create({
        data: {
          email: item.email,
          name: item.name,
          phone: item.phone,
          identification: item.identification,
          isActive: true,
          isVerified: true
        }
      }));

    const existingProfile = await prisma.customerProfile.findUnique({
      where: {
        customerId: customer.id
      }
    });

    if (!existingProfile) {
      await prisma.customerProfile.create({
        data: {
          customerId: customer.id,
          firstName: item.firstName,
          lastName: item.lastName
        }
      });
    }

    const existingAddresses = await prisma.customerAddress.findMany({
      where: {
        customerId: customer.id
      }
    });

    if (existingAddresses.length === 0) {
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Casa',
          street: 'Av. Principal con Calle Demo, casa 1',
          city: 'Caracas',
          state: 'Distrito Capital',
          postalCode: '1010',
          country: 'VE',
          isDefault: true
        }
      });
    }

    const existingPaymentMethods = await prisma.customerPaymentMethod.findMany({
      where: {
        customerId: customer.id
      }
    });

    if (existingPaymentMethods.length === 0) {
      await prisma.customerPaymentMethod.create({
        data: {
          id: randomUUID(),
          customerId: customer.id,
          tipo: PaymentMethod.ZELLE,
          detalles: {
            email: 'zelle.demo@cliente.test',
            name: customer.name ?? 'Cliente Demo'
          },
          nickname: 'Zelle principal',
          isDefault: true
        }
      });

      await prisma.customerPaymentMethod.create({
        data: {
          id: randomUUID(),
          customerId: customer.id,
          tipo: PaymentMethod.PAGO_MOVIL,
          detalles: {
            bank: '0102',
            phone: customer.phone ?? '+58 400-0000000',
            rif: item.identification
          },
          nickname: 'Pago móvil',
          isDefault: false
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

