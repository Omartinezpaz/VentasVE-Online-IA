import request from 'supertest';
import app from '../app';
import prisma from '../tests/prisma-mock';
import { whatsappService } from '../services/whatsapp.service';

jest.mock('../services/whatsapp.service', () => ({
  whatsappService: {
    connectBusiness: jest.fn(),
    getStatus: jest.fn().mockReturnValue({ connected: false, qr: null }),
    disconnectBusiness: jest.fn()
  }
}));

describe('WhatsappController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/v1/whatsapp/connect devuelve error si no hay número configurado', async () => {
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce({
      whatsapp: null
    });

    const res = await request(app).post('/api/v1/whatsapp/connect');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WHATSAPP_PHONE_REQUIRED');
  });

  it('POST /api/v1/whatsapp/connect inicia conexión cuando hay número configurado', async () => {
    (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce({
      whatsapp: '+584121234567'
    });

    const res = await request(app).post('/api/v1/whatsapp/connect');

    expect(res.status).toBe(200);
    expect((whatsappService.connectBusiness as jest.Mock)).toHaveBeenCalledWith(
      'b1',
      '+584121234567'
    );
  });

  it('GET /api/v1/whatsapp/status devuelve estado actual', async () => {
    (whatsappService.getStatus as jest.Mock).mockReturnValueOnce({
      connected: true,
      qr: null
    });

    const res = await request(app).get('/api/v1/whatsapp/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: true, qr: null });
  });

  it('POST /api/v1/whatsapp/disconnect desconecta el negocio', async () => {
    const res = await request(app).post('/api/v1/whatsapp/disconnect');

    expect(res.status).toBe(200);
    expect((whatsappService.disconnectBusiness as jest.Mock)).toHaveBeenCalledWith('b1');
  });
});
