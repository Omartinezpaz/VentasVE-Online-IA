import { Router } from 'express';
import authRoutes from './auth.routes';
import businessRoutes from './business.routes';
import catalogRoutes from './catalog.routes';
import productRoutes from './products.routes';
import orderRoutes from './orders.routes';
import paymentRoutes from './payments.routes';
import chatRoutes from './chat.routes';
import customerRoutes from './customers.routes';
import exchangeRateRoutes from './exchange-rate.routes';
import dashboardRoutes from './dashboard.routes';
import settingsRoutes from './settings.routes';
import whatsappRoutes from './whatsapp.routes';

const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/business', businessRoutes);
v1Router.use('/catalog', catalogRoutes);
v1Router.use('/products', productRoutes);
v1Router.use('/orders', orderRoutes);
v1Router.use('/payments', paymentRoutes);
v1Router.use('/conversations', chatRoutes);
v1Router.use('/customers', customerRoutes);
v1Router.use('/exchange-rate', exchangeRateRoutes);
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/whatsapp', whatsappRoutes);
v1Router.use('/settings', settingsRoutes);

export { v1Router };
