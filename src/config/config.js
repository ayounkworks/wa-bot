'use strict';

const path = require('path');

// Validasi env wajib
const required = ['BOSS_NUMBER', 'MY_NAME', 'TARGET_GROUP'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] ERROR: env variable ${key} wajib diisi!`);
    process.exit(1);
  }
}

// Parse keywords dari env, fallback ke default
const rawKeywords = process.env.KEYWORDS || 'list kerja,kerja malam,list malam,lembur';
const keywords = rawKeywords
  .split(',')
  .map(k => k.trim().toLowerCase())
  .filter(Boolean);

module.exports = {
  // Identitas bot
  myName: process.env.MY_NAME.trim(),

  // Nomor atasan format: 628xxx (tanpa + atau spasi)
  bossNumber: process.env.BOSS_NUMBER.trim() + '@s.whatsapp.net',

  // Nama grup WhatsApp (harus persis sama)
  targetGroup: process.env.TARGET_GROUP.trim(),

  // Keywords yang memicu bot (case-insensitive)
  keywords,

  // Delay sebelum kirim (ms)
  delayMin: parseInt(process.env.DELAY_MIN || '2000', 10),
  delayMax: parseInt(process.env.DELAY_MAX || '5000', 10),

  // Fuzzy match threshold (0-1, makin kecil makin ketat)
  fuzzyThreshold: parseFloat(process.env.FUZZY_THRESHOLD || '0.75'),

  // Path file data
  paths: {
    session: path.join(__dirname, '../data/session'),
    processed: path.join(__dirname, '../data/processed.json'),
    log: path.join(__dirname, '../data/bot.log'),
  },

  // Max Message IDs yang disimpan (biar file tidak membengkak)
  maxProcessedIds: parseInt(process.env.MAX_PROCESSED_IDS || '500', 10),
};
