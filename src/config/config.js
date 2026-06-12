'use strict';

const path = require('path');

const required = ['MY_NAMES', 'TARGET_GROUPS'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] ERROR: env variable ${key} wajib diisi!`);
    process.exit(1);
  }
}

// Support multi nama: "Nurul,Umar,Abi"
const myNames = process.env.MY_NAMES
  .split(',')
  .map(n => n.trim())
  .filter(Boolean);

// Support multi grup: "Grup A,Grup B"
const targetGroups = process.env.TARGET_GROUPS
  .split(',')
  .map(g => g.trim())
  .filter(Boolean);

const rawKeywords = process.env.KEYWORDS || 'list kerja,kerja malam,list malam,lembur,list';
const keywords = rawKeywords
  .split(',')
  .map(k => k.trim().toLowerCase())
  .filter(Boolean);

module.exports = {
  myNames,        // array nama
  targetGroups,   // array grup
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