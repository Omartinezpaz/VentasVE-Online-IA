jest.mock('../middleware/auth', () => {
  return {
    authenticate: (req: any, res: any, next: any) => {
      req.user = { userId: 'u1', businessId: 'b1', role: 'OWNER', email: 'owner@test.com' };
      next();
    },
    requireRole: () => (req: any, res: any, next: any) => next()
  };
});

jest.mock('../services/exchange-rate.service', () => ({
  exchangeRateService: {
    getCurrent: jest.fn().mockResolvedValue({ usdToVes: 40 })
  }
}));

jest.mock('../services/whatsapp.service', () => ({
  whatsappService: {
    connectBusiness: jest.fn(),
    sendMessage: jest.fn(),
    getStatus: jest.fn().mockReturnValue({ connected: false, qr: null }),
    disconnectBusiness: jest.fn()
  }
}));

jest.mock('../lib/websocket', () => ({
  emitToBusiness: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: () => 'req-id'
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(64);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'y'.repeat(64);
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
