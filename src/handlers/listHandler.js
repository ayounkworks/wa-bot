'use strict';

const config = require('../config/config');
const { parseList } = require('../utils/parser');
const { buildList } = require('../utils/formatter');
const { isDuplicate } = require('../utils/fuzzy');
const { isProcessed, markProcessed } = require('../utils/store');
const logger = require('../utils/logger');

async function handleList(sock, msg, groupName) {
  const msgId = msg.key.id;
  const chatJid = msg.key.remoteJid;

  // ── 1. Anti duplikat pesan ──────────────────────────────────────────
  if (isProcessed(msgId)) {
    logger.info(`[SKIP] Pesan ${msgId} sudah diproses.`);
    return;
  }

  // ── 2. Cek grup target ──────────────────────────────────────────────
  if (groupName !== config.targetGroup) return;

  // ── 3. Ambil teks pesan ─────────────────────────────────────────────
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();

  if (!text) return;

  // ── 4. Cek keyword ──────────────────────────────────────────────────
  const textLower = text.toLowerCase();
  const hasKeyword = config.keywords.some(kw => textLower.includes(kw));
  if (!hasKeyword) return;

  // ── Mulai proses ────────────────────────────────────────────────────
  logger.info(`[PROSES] Pesan di grup "${groupName}"`);

  markProcessed(msgId);

  // ── 5. Parse list ───────────────────────────────────────────────────
  const { header, items } = parseList(text);

  if (items.length === 0) {
    logger.warn('[SKIP] Tidak ada item list ditemukan.');
    return;
  }

  logger.info(`[PARSE] Header: "${header}" | ${items.length} item`);

  // ── 6. Cek duplikat nama ────────────────────────────────────────────
  const names = items.map(i => i.name);
  const dupCheck = isDuplicate(config.myName, names, config.fuzzyThreshold);

  if (dupCheck.found) {
    logger.info(`[SKIP] Nama "${config.myName}" sudah ada (cocok: "${dupCheck.matchedName}")`);
    return;
  }

  // ── 7. Build & kirim ────────────────────────────────────────────────
  const newText = buildList(header, items, config.myName);
  logger.info('[GENERATE]\n' + newText);

  const delayMs = config.delayMin + Math.floor(Math.random() * (config.delayMax - config.delayMin));
  logger.info(`[DELAY] ${delayMs}ms...`);
  await new Promise(r => setTimeout(r, delayMs));

  try {
    await sock.sendMessage(chatJid, { text: newText });
    logger.info('[OK] Berhasil dikirim.');
  } catch (err) {
    logger.error('[ERROR] Gagal kirim:', err.message);
  }
}

module.exports = { handleList };