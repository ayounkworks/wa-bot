'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');

const config = require('../config/config');
const logger = require('../utils/logger');
const { onMessages } = require('../handlers/messageHandler');

// Pastikan folder session ada
if (!fs.existsSync(config.paths.session)) {
  fs.mkdirSync(config.paths.session, { recursive: true });
}

// In-memory store untuk metadata grup (diperlukan groupMetadata())
const store = makeInMemoryStore({
  logger: pino({ level: 'silent' }),
});

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
    logger: pino({ level: 'silent' }), // Matikan log Baileys internal
    printQRInTerminal: true,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false, // Jangan tampak online terus
    defaultQueryTimeoutMs: 30_000,
  });

  // Bind store ke socket agar bisa query metadata grup
  store.bind(sock.ev);

  // ── Event: credentials diperbarui ───────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Event: status koneksi ───────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('QR Code muncul di terminal. Scan dengan WhatsApp!');
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
        // Exponential backoff: 3s, 6s, 12s, 24s, ...
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
    // Hanya proses pesan baru (bukan history sync)
    if (type !== 'notify') return;
    await onMessages(sock, messages);
  });

  return sock;
}

module.exports = { startClient };
