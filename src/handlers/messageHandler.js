'use strict';

const { handleList } = require('./listHandler');
const logger = require('../utils/logger');

// Cache nama grup agar tidak query terus
const groupNameCache = new Map();

/**
 * Ambil nama grup dari JID, dengan caching.
 * @param {object} sock
 * @param {string} jid
 * @returns {Promise<string>}
 */
async function getGroupName(sock, jid) {
  if (groupNameCache.has(jid)) return groupNameCache.get(jid);
  try {
    const meta = await sock.groupMetadata(jid);
    const name = meta.subject || jid;
    groupNameCache.set(jid, name);
    return name;
  } catch (err) {
    logger.warn(`Gagal ambil metadata grup ${jid}: ${err.message}`);
    return jid;
  }
}

/**
 * Handler utama untuk semua pesan masuk.
 * @param {object} sock
 * @param {object[]} messages
 */
async function onMessages(sock, messages) {
  for (const msg of messages) {
    // Abaikan pesan dari diri sendiri / status
    if (msg.key.fromMe) continue;
    if (msg.key.remoteJid === 'status@broadcast') continue;

    const jid = msg.key.remoteJid;

    // Hanya proses pesan dari grup
    if (!jid.endsWith('@g.us')) continue;

    try {
      const groupName = await getGroupName(sock, jid);
      await handleList(sock, msg, groupName);
    } catch (err) {
      logger.error(`Error memproses pesan dari ${jid}:`, err.message);
    }
  }
}

module.exports = { onMessages };
