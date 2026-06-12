'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Pastikan folder data ada
const logDir = path.dirname(config.paths.log);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function write(level, ...args) {
  const msg = args
    .map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
    .join(' ');
  const line = `[${timestamp()}] [${level}] ${msg}`;

  // Console output
  console.log(line);

  // File output (non-blocking, ignore error)
  try {
    fs.appendFileSync(config.paths.log, line + '\n');
  } catch (_) {}
}

// Rotasi log: hapus jika > 5MB
function rotateIfNeeded() {
  try {
    const stat = fs.statSync(config.paths.log);
    if (stat.size > 5 * 1024 * 1024) {
      fs.writeFileSync(config.paths.log, '');
      write('INFO', 'Log file di-reset (>5MB)');
    }
  } catch (_) {}
}

// Cek rotasi setiap 10 menit
setInterval(rotateIfNeeded, 10 * 60 * 1000);

module.exports = {
  info: (...args) => write('INFO', ...args),
  warn: (...args) => write('WARN', ...args),
  error: (...args) => write('ERROR', ...args),
};
