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

  // ── 2. Cek grup target (support multi grup) ─────────────────────────
  const isTargetGroup = config.targetGroups.some(g => g === groupName);
  if (!isTargetGroup) return;

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

  // ── 5. Parse list ───────────────────────────────────────────────────
  const { header, items } = parseList(text);
  if (!items.some(i => i.name)) {
    logger.warn('[SKIP] Tidak ada item list ditemukan.');
    return;
  }

  logger.info(`[PROSES] Grup: "${groupName}" | ${items.length} item`);
  markProcessed(msgId);

  // ── 6. Cek semua nama, kumpulkan yang belum ada ─────────────────────
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

  // ── 7. Tambahkan semua nama yang belum ada ──────────────────────────
  let currentItems = [...items];
  let currentHeader = header;
  let outputText = '';

  for (const name of namesToAdd) {
    outputText = buildList(currentHeader, currentItems, name);
    // Parse ulang agar nama berikutnya mengisi slot kosong selanjutnya
    const reparsed = parseList(outputText);
    currentHeader = reparsed.header;
    currentItems = reparsed.items;
  }

  logger.info('[GENERATE]\n' + outputText);

  // ── 8. Delay & kirim ───────────────────────────────────────────────
  const delayMs = config.delayMin + Math.floor(Math.random() * (config.delayMax - config.delayMin));
  await new Promise(r => setTimeout(r, delayMs));

  try {
    await sock.sendMessage(chatJid, { text: outputText });
    logger.info(`[OK] Berhasil kirim ${namesToAdd.length} nama: ${namesToAdd.join(', ')}`);
  } catch (err) {
    logger.error('[ERROR] Gagal kirim:', err.message);
  }
}

module.exports = { handleList };