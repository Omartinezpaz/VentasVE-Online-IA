
import prisma from './src/index';

async function main() {
  try {
    console.log('Checking for ExchangeRate table...');
    // This will throw if the table doesn't exist in the DB
    await prisma.exchangeRate.count();
    console.log('MIGRATION_SUCCESS');
  } catch (error: any) {
    // Check if error is related to missing table (code P2021)
    if (error.code === 'P2021' || error.message?.includes('relation "public.ExchangeRate" does not exist')) {
      console.log('MIGRATION_PENDING');
    } else {
      console.error('ERROR:', error);
      process.exit(1);
    }
  }
}

main();
