'use strict';

const { handleList } = require('./listHandler');
const logger = require('../utils/logger');

const groupNameCache = new Map();

async function getGroupName(sock, jid) {
  if (groupNameCache.has(jid)) return groupNameCache.get(jid);
  try {
    const meta = await sock.groupMetadata(jid);
    const name = meta.subject || jid;
    groupNameCache.set(jid, name);
    setTimeout(() => groupNameCache.delete(jid), 30 * 60 * 1000);
    return name;
  } catch (err) {
    logger.warn(`Gagal ambil metadata grup ${jid}: ${err.message}`);
    return jid;
  }
}

async function onMessages(sock, messages) {
  for (const msg of messages) {
    if (msg.key.fromMe) continue;
    if (msg.key.remoteJid === 'status@broadcast') continue;

    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) continue;

    try {
      const groupName = await getGroupName(sock, jid);

      // DEBUG: log semua pesan grup yang masuk
      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''
      ).trim();
      logger.info(`[DEBUG] Grup: "${groupName}" | Teks: "${text.substring(0, 50)}"`);

      await handleList(sock, msg, groupName);
    } catch (err) {
      logger.error(`Error memproses pesan:`, err.message);
    }
  }
}

module.exports = { onMessages };