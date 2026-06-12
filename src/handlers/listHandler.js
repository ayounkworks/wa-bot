'use strict';

const config = require('../config/config');
const { parseList } = require('../utils/parser');
const { buildList } = require('../utils/formatter');
const { isDuplicate } = require('../utils/fuzzy');
const { isProcessed, markProcessed } = require('../utils/store');
const logger = require('../utils/logger');

/**
 * Delay acak antara min dan max (ms)
 */
function randomDelay(min, max) {
  const ms = min + Math.floor(Math.random() * (max - min));
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Proses pesan masuk.
 * @param {object} sock - Baileys socket
 * @param {object} msg - Objek pesan dari Baileys
 * @param {string} groupName - Nama grup asal pesan
 */
async function handleList(sock, msg, groupName) {
  const msgId = msg.key.id;
  const sender = msg.key.participant || msg.key.remoteJid;
  const chatJid = msg.key.remoteJid;

  // ── 1. Anti duplikat pesan ──────────────────────────────────────────
  if (isProcessed(msgId)) {
    logger.info(`[SKIP] Pesan ${msgId} sudah diproses sebelumnya.`);
    return;
  }

  // ── 2. Cek grup target ──────────────────────────────────────────────
  if (groupName !== config.targetGroup) {
    return; // Bukan grup target, abaikan diam-diam
  }

  // ── 3. Cek pengirim = atasan ────────────────────────────────────────
  const senderClean = sender.replace(/@.+/, '') + '@s.whatsapp.net';
  if (senderClean !== config.bossNumber) {
    return; // Bukan atasan, abaikan
  }

  // ── 4. Ambil teks pesan ─────────────────────────────────────────────
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();

  if (!text) return;

  // ── 5. Cek keyword ──────────────────────────────────────────────────
  const textLower = text.toLowerCase();
  const hasKeyword = config.keywords.some(kw => textLower.includes(kw));
  if (!hasKeyword) return;

  // ── Mulai proses ────────────────────────────────────────────────────
  logger.info(`[PROSES] Pesan dari atasan di grup "${groupName}"`);
  logger.info(`[TEKS] ${text.substring(0, 100)}...`);

  // Tandai segera (sebelum kirim) agar tidak double proses meski error
  markProcessed(msgId);

  // ── 6. Parse list ───────────────────────────────────────────────────
  const { header, items } = parseList(text);

  if (items.length === 0) {
    logger.warn('[SKIP] Tidak ditemukan item list dalam pesan.');
    return;
  }

  logger.info(`[PARSE] Header: "${header}" | ${items.length} item ditemukan`);

  // ── 7. Cek duplikat nama ────────────────────────────────────────────
  const names = items.map(i => i.name);
  const dupCheck = isDuplicate(config.myName, names, config.fuzzyThreshold);

  if (dupCheck.found) {
    logger.info(
      `[SKIP] Nama "${config.myName}" sudah ada (cocok dengan "${dupCheck.matchedName}", skor: ${dupCheck.score.toFixed(2)})`
    );
    return;
  }

  // ── 8. Build list baru ──────────────────────────────────────────────
  const newText = buildList(header, items, config.myName);
  logger.info('[GENERATE] List baru:\n' + newText);

  // ── 9. Delay acak ───────────────────────────────────────────────────
  const delayMs = config.delayMin + Math.floor(Math.random() * (config.delayMax - config.delayMin));
  logger.info(`[DELAY] Menunggu ${delayMs}ms sebelum kirim...`);
  await randomDelay(config.delayMin, config.delayMax);

  // ── 10. Kirim ke grup ───────────────────────────────────────────────
  try {
    await sock.sendMessage(chatJid, { text: newText });
    logger.info(`[OK] List berhasil dikirim ke grup "${groupName}"`);
  } catch (err) {
    logger.error('[ERROR] Gagal kirim pesan:', err.message);
  }
}

module.exports = { handleList };
