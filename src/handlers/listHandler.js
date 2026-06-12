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
  if (items.length === 0) {
    logger.warn('[SKIP] Tidak ada item list ditemukan.');
    return;
  }

  logger.info(`[PROSES] Grup: "${groupName}" | ${items.length} item`);
  markProcessed(msgId);

  // ── 6. Cek semua nama, kumpulkan yang belum ada ─────────────────────
  const existingNames = items.map(i => i.name);
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

  for (const name of namesToAdd) {
    const newText = buildList(currentHeader, currentItems, name);
    // Parse ulang untuk update nomor urut
    const reparsed = require('../utils/parser').parseList(newText);
    currentHeader = reparsed.header;
    currentItems = reparsed.items;
  }

  const finalText = buildList(currentHeader, items, namesToAdd[0]);

  // Kalau lebih dari 1 nama, build manual
  let outputText;
  if (namesToAdd.length === 1) {
    outputText = buildList(header, items, namesToAdd[0]);
  } else {
    // Tambah semua nama satu per satu
    let workItems = [...items];
    for (const name of namesToAdd) {
      const nextNum = Math.max(...workItems.map(i => i.number)) + 1;
      workItems.push({ number: nextNum, name });
    }
    const lines = [];
    if (header && header.trim()) {
      lines.push(header.trim());
      lines.push('');
    }
    for (const item of workItems) {
      lines.push(`${item.number}. ${item.name}`);
    }
    outputText = lines.join('\n');
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