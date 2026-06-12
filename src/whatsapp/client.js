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
const qrcode = require('qrcode-terminal');

const config = require('../config/config');
const logger = require('../utils/logger');
const { onMessages } = require('../handlers/messageHandler');

// Pastikan folder session ada
if (!fs.existsSync(config.paths.session)) {
  fs.mkdirSync(config.paths.session, { recursive: true });
}

// Cache metadata grup secara manual
const groupMetaCache = new Map();

let retryCount = 0;
const MAX_RETRY = 10;
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

  // Update cache saat ada perubahan grup
  sock.ev.on('groups.update', (updates) => {
    for (const update of updates) {
      if (groupMetaCache.has(update.id)) {
        const existing = groupMetaCache.get(update.id);
        groupMetaCache.set(update.id, { ...existing, ...update });
      }
    }
  });

  // ── Event: credentials diperbarui ───────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Event: status koneksi ───────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('========== SCAN QR CODE DI BAWAH INI ==========');
      qrcode.generate(qr, { small: true });
      logger.info('================================================');
    }

    if (connection === 'open') {
      retryCount = 0;
      logger.info('✅ WhatsApp terhubung!');
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      logger.warn(`Koneksi terputus. Kode: ${reason}`);

      const shouldReconnect =
        reason !== DisconnectReason.loggedOut &&
        reason !== DisconnectReason.forbidden;

      if (shouldReconnect) {
        if (retryCount >= MAX_RETRY) {
          logger.error(`Gagal reconnect setelah ${MAX_RETRY} percobaan. Restart manual diperlukan.`);
          return;
        }
        retryCount++;
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount - 1), 60_000);
        logger.info(`Mencoba reconnect ke-${retryCount} dalam ${delay / 1000}s...`);
        setTimeout(startClient, delay);
      } else {
        logger.error('Session dihapus atau diblokir. Hapus folder data/session dan restart.');
        process.exit(1);
      }
    }
  });

  // ── Event: pesan masuk ──────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    await onMessages(sock, messages);
  });

  return sock;
}

module.exports = { startClient };