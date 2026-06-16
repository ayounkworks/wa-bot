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
  if (isProcessed(msgId)) return;

  // ── 2. Cek grup target ──────────────────────────────────────────────
  const isTargetGroup = config.targetGroups.some(g => g === groupName);
  if (!isTargetGroup) return;

  // ── 3. Cek pengirim harus atasan ───────────────────────────────────
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.replace(/[^0-9]/g, '');
  const isBoss = config.bossNumbers.some(n => senderNumber.includes(n) || n.includes(senderNumber));
  if (!isBoss) {
    logger.info(`[SKIP] Bukan dari atasan: ${senderNumber}`);
    return;
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

  // ── Cek exclude keyword ─────────────────────────────────────────────
  const hasExcludeKeyword = config.excludeKeywords.some(kw => textLower.includes(kw));
  if (hasExcludeKeyword) {
    logger.info('[SKIP] Pesan mengandung exclude keyword.');
    return;
  }

  // ── 6. Parse list ───────────────────────────────────────────────────
  const { header, items } = parseList(text);

  // Cukup cek ada item (walau kosong)
  if (items.length === 0) {
    logger.warn('[SKIP] Tidak ada item list ditemukan.');
    return;
  }

  logger.info(`[PROSES] Grup: "${groupName}" | Atasan: ${senderNumber} | ${items.length} item`);
  markProcessed(msgId);

  // ── 7. Cek semua nama, kumpulkan yang belum ada ─────────────────────
  const existingNames = items.map(i => i.name).filter(Boolean);
  const namesToAdd = [];

  for (const name of config.myNames) {
    const dupCheck = isDuplicate(name, existingNames, config.fuzzyThreshold);
    if (dupCheck.found) {
      logger.info(`[SKIP] "${name}" sudah ada (cocok: "${dupCheck.matchedName}")`);
    } else {
      namesToAdd.push(name);
    }
  }

  if (namesToAdd.length === 0) {
    logger.info('[SKIP] Semua nama sudah ada di list.');
    return;
  }

  // ── 8. Tambahkan semua nama yang belum ada ──────────────────────────
  let currentItems = [...items];
  let currentHeader = header;
  let outputText = '';

  for (const name of namesToAdd) {
    outputText = buildList(currentHeader, currentItems, name);
    const reparsed = parseList(outputText);
    currentHeader = reparsed.header;
    currentItems = reparsed.items;
  }

  logger.info('[GENERATE]\n' + outputText);

  // ── 9. Langsung kirim tanpa delay ──────────────────────────────────
  try {
    await sock.sendMessage(chatJid, { text: outputText });
    logger.info(`[OK] Berhasil kirim ${namesToAdd.length} nama: ${namesToAdd.join(', ')}`);
  } catch (err) {
    logger.error('[ERROR] Gagal kirim:', err.message);
  }
}

module.exports = { handleList };
