import { PrismaClient, BusinessType, Plan } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding restaurant data...');

  const business = await prisma.business.upsert({
    where: { slug: 'sushizen' },
    update: {},
    create: {
      slug: 'sushizen',
      name: 'Sushi Zen',
      type: BusinessType.FOOD,
      plan: Plan.PRO,
      whatsapp: '+584121234567',
      city: 'Caracas',
      description: 'El mejor sushi de la ciudad con ingredientes frescos y tradicionales.',
      instagram: '@sushizen_ve',
      schedule: 'Mar-Dom 12:00 PM - 10:00 PM',
      catalogOptions: {
        showBs: true,
        showStock: false,
        showChatButton: true,
      },
      paymentMethods: {
        zelle: { email: 'pagos@sushizen.com', name: 'Sushi Zen C.A.' },
        pagoMovil: { phone: '04121234567', bank: 'Banesco', id: 'V-12345678' },
      }
    },
  });

  const category = await prisma.category.create({
    data: {
      businessId: business.id,
      name: 'Rolls y Combos',
      description: 'Nuestra especialidad en sushi rolls y combinaciones familiares.',
    }
  });

  const products = [
    { name: 'Ceviche Roll', price: 1200, description: 'Ceviche estilo japonés con aguacate' },
    { name: 'Combo Fuji', price: 1500, description: '12 piezas Fuji roll + bebida' },
    { name: 'Combo Ninja', price: 1600, description: '12 piezas Ninja roll + bebida' },
    { name: 'Combo TNT', price: 1500, description: '12 piezas TNT roll + bebida' },
    { name: 'Duo Roll', price: 2800, description: '36 piezas para 2 personas' },
    { name: 'Edamame', price: 600, description: 'Soya verde con sal marina' },
    { name: 'Gyozas (6 pcs)', price: 800, description: 'Empanaditas japonesas fritas' },
    { name: 'Mega Family', price: 6500, description: '84 piezas de sushi variado + bebida 2L + postre' },
    { name: 'Bebida 1L', price: 300, description: 'Refresco de 1 litro' },
    { name: 'Salsa de Anguila', price: 200, description: 'Salsa dulce tradicional' },
    { name: 'Jengibre Extra', price: 100, description: 'Porción adicional de jengibre' },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: category.id,
        name: p.name,
        description: p.description,
        priceUsdCents: p.price,
        stock: 50,
        isPublished: true,
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
