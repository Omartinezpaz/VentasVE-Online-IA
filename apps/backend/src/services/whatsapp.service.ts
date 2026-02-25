import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import prisma, { Channel, MsgRole } from '@ventasve/database';
import { emitToBusiness } from '../lib/websocket';
import { logger } from '../lib/logger';

type ConnectionState = {
  connected: boolean;
  qr: string | null;
};

class WhatsAppService {
  private sockets = new Map<string, any>();
  private states = new Map<string, ConnectionState>();

  async connectBusiness(businessId: string, phoneNumber: string) {
    const authFolder = `whatsapp_auth_${businessId}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const sock = makeWASocket({
      printQRInTerminal: true,
      auth: state,
      browser: ['VentasVE', 'Chrome', '1.0.0'],
      syncFullHistory: false
    });

    this.sockets.set(businessId, sock);
    this.states.set(businessId, { connected: false, qr: null });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.states.set(businessId, { connected: false, qr });
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom | undefined)?.output?.statusCode !== DisconnectReason.loggedOut;

        this.states.set(businessId, { connected: false, qr: null });

        if (shouldReconnect) {
          setTimeout(() => {
            this.connectBusiness(businessId, phoneNumber).catch(console.error);
          }, 5000);
        }
      } else if (connection === 'open') {
        this.states.set(businessId, { connected: true, qr: null });
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message) {
          await this.handleIncomingMessage(businessId, msg).catch(console.error);
        }
      }
    });

    return sock;
  }

  private async handleIncomingMessage(businessId: string, msg: any) {
    const remoteJid = msg.key.remoteJid ?? '';
    const phone = remoteJid.replace('@s.whatsapp.net', '');
    if (!phone) {
      return;
    }

    const content =
      msg.message?.conversation ??
      msg.message?.extendedTextMessage?.text ??
      '';

    if (!content) {
      return;
    }

    let customer = await prisma.customer.findFirst({
      where: {
        businessId,
        phone
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId,
          phone,
          name: msg.pushName || 'Cliente WhatsApp'
        }
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        businessId,
        customerId: customer.id,
        channel: Channel.WHATSAPP
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          customerId: customer.id,
          channel: Channel.WHATSAPP
        }
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MsgRole.CUSTOMER,
        content
      }
    });

    emitToBusiness(businessId, 'new_message', {
      conversation,
      customer,
      message
    });
  }

  async sendMessage(businessId: string, phone: string, text: string) {
    const sock = this.sockets.get(businessId);
    const state = this.states.get(businessId);

    if (!sock || !state?.connected) {
      throw new Error('WhatsApp no conectado para este negocio');
    }

    const jid = `${phone}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text });

    const customer = await prisma.customer.findFirst({
      where: {
        businessId,
        phone
      }
    });

    if (!customer) {
      return;
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        businessId,
        customerId: customer.id,
        channel: Channel.WHATSAPP
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          customerId: customer.id,
          channel: Channel.WHATSAPP
        }
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MsgRole.BOT,
        content: text
      }
    });

    emitToBusiness(businessId, 'new_message', {
      conversation,
      customer,
      message
    });
  }

  getStatus(businessId: string): ConnectionState {
    return this.states.get(businessId) ?? { connected: false, qr: null };
  }

  disconnectBusiness(businessId: string) {
    const sock = this.sockets.get(businessId);

    if (sock) {
      try {
        if (typeof sock.end === 'function') {
          sock.end();
        }
      } catch (err) {
        logger.error({ err, businessId }, 'Failed to disconnect WhatsApp socket');
      }
      this.sockets.delete(businessId);
      this.states.delete(businessId);
    }
  }
}

export const whatsappService = new WhatsAppService();
