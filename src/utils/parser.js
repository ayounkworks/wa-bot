'use strict';

/**
 * Parse teks list WhatsApp menjadi array item.
 * Toleran terhadap variasi format: "1. Nama", "1) Nama", "1 - Nama", "1 Nama"
 *
 * @param {string} text - Teks mentah dari pesan
 * @returns {{ header: string, items: Array<{number: number, name: string}> }}
 */
function parseList(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const items = [];
  const headerLines = [];
  let foundFirstItem = false;

  // Regex: nomor di awal baris, diikuti pemisah opsional, lalu nama
  // Menangani: "1. Nama", "1) Nama", "1 - Nama", "1. NAMA", "10. Nama Panjang"
  const itemRegex = /^(\d+)\s*[.\-)\s]\s*(.+)$/;

  for (const line of lines) {
    const match = line.match(itemRegex);
    if (match) {
      foundFirstItem = true;
      const num = parseInt(match[1], 10);
      const name = match[2].trim();
      if (name.length > 0) {
        items.push({ number: num, name });
      }
    } else if (!foundFirstItem) {
      // Baris sebelum item pertama = header
      headerLines.push(line);
    }
    // Baris setelah item pertama yang bukan item = abaikan
  }

  return {
    header: headerLines.join('\n'),
    items,
  };
}

/**
 * Ambil nomor terakhir dari list item.
 * @param {Array<{number: number}>} items
 * @returns {number}
 */
function getLastNumber(items) {
  if (items.length === 0) return 0;
  return Math.max(...items.map(i => i.number));
}

module.exports = { parseList, getLastNumber };
