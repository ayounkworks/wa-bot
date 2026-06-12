'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');

const config = require('../config/config');
const logger = require('../utils/logger');
const { onMessages } = require('../handlers/messageHandler');

if (!fs.existsSync(config.paths.session)) {
  fs.mkdirSync(config.paths.session, { recursive: true });
}

const groupMetaCache = new Map();
let retryCount = 0;
const MAX_RETRY = 999; // retry terus, tidak berhenti
const BASE_DELAY_MS = 3000;

async function startClient() {
  const { state, saveCreds } = await useMultiFileAuthState(config.paths.session);
  const { version } = await fetchLatestBaileysVersion();

  logger.info(`Memulai Baileys v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    defaultQueryTimeoutMs: 30_000,
    cachedGroupMetadata: async (jid) => groupMetaCache.get(jid),
  });

  sock.ev.on('groups.update', (updates) => {
    for (const update of updates) {
      if (groupMetaCache.has(update.id)) {
        groupMetaCache.set(update.id, { ...groupMetaCache.get(update.id), ...update });
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const encoded = encodeURIComponent(qr);
      const link = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
      logger.info('=== SCAN QR CODE ===');
      logger.info('Buka link ini di browser lalu scan dengan WhatsApp:');
      logger.info(link);
      logger.info('===================');
    }

    if (connection === 'open') {
      retryCount = 0;
      logger.info('✅ WhatsApp terhubung!');
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      logger.warn(`Koneksi terputus. Kode: ${reason}`);

      if (reason === DisconnectReason.loggedOut) {
        // Hapus session lama lalu buat QR baru
        logger.warn('Session logout. Menghapus session dan membuat QR baru...');
        try {
          fs.rmSync(config.paths.session, { recursive: true, force: true });
          fs.mkdirSync(config.paths.session, { recursive: true });
        } catch (e) {}
        retryCount = 0;
        setTimeout(startClient, 2000);
      } else {
        // Koneksi putus biasa, reconnect dengan backoff
        retryCount++;
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount - 1), 60_000);
        logger.info(`Reconnect ke-${retryCount} dalam ${delay / 1000}s...`);
        setTimeout(startClient, delay);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    await onMessages(sock, messages);
  });

  return sock;
}

module.exports = { startClient };