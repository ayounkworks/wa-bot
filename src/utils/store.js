'use strict';

const fs = require('fs');
const config = require('../config/config');
const logger = require('./logger');

// Cache in-memory agar tidak baca file terus
let cache = null;

function load() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(config.paths.processed, 'utf8');
    cache = JSON.parse(raw);
    if (!Array.isArray(cache)) cache = [];
  } catch (_) {
    cache = [];
  }
  return cache;
}

function save(ids) {
  try {
    // Pastikan folder ada
    const dir = require('path').dirname(config.paths.processed);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(config.paths.processed, JSON.stringify(ids, null, 2));
  } catch (err) {
    logger.error('Gagal simpan processed.json:', err.message);
  }
}

/**
 * Cek apakah Message ID sudah pernah diproses.
 */
function isProcessed(msgId) {
  return load().includes(msgId);
}

/**
 * Tandai Message ID sebagai sudah diproses.
 */
function markProcessed(msgId) {
  const ids = load();
  if (ids.includes(msgId)) return;
  ids.push(msgId);

  // Trim jika terlalu panjang
  if (ids.length > config.maxProcessedIds) {
    ids.splice(0, ids.length - config.maxProcessedIds);
  }

  cache = ids;
  save(ids);
}

module.exports = { isProcessed, markProcessed };
