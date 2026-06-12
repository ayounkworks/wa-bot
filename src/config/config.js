'use strict';

const path = require('path');

// Validasi env wajib
const required = ['MY_NAME', 'TARGET_GROUP'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] ERROR: env variable ${key} wajib diisi!`);
    process.exit(1);
  }
}

const rawKeywords = process.env.KEYWORDS || 'list kerja,kerja malam,list malam,lembur';
const keywords = rawKeywords
  .split(',')
  .map(k => k.trim().toLowerCase())
  .filter(Boolean);

module.exports = {
  myName: process.env.MY_NAME.trim(),
  targetGroup: process.env.TARGET_GROUP.trim(),
  keywords,
  delayMin: parseInt(process.env.DELAY_MIN || '2000', 10),
  delayMax: parseInt(process.env.DELAY_MAX || '5000', 10),
  fuzzyThreshold: parseFloat(process.env.FUZZY_THRESHOLD || '0.75'),
  paths: {
    session: path.join(__dirname, '../data/session'),
    processed: path.join(__dirname, '../data/processed.json'),
    log: path.join(__dirname, '../data/bot.log'),
  },
  maxProcessedIds: parseInt(process.env.MAX_PROCESSED_IDS || '500', 10),
};