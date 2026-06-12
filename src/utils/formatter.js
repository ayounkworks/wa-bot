'use strict';

/**
 * Generate teks list lengkap dengan nama baru ditambahkan.
 * @param {string} header - Header asli dari list (mis: "LIST KERJA MALAM")
 * @param {Array<{number: number, name: string}>} items - Item list yang sudah ada
 * @param {string} newName - Nama yang akan ditambahkan
 * @returns {string}
 */
function buildList(header, items, newName) {
  const nextNumber = items.length > 0
    ? Math.max(...items.map(i => i.number)) + 1
    : 1;

  const lines = [];

  // Tambah header jika ada
  if (header && header.trim()) {
    lines.push(header.trim());
    lines.push(''); // baris kosong setelah header
  }

  // Tulis ulang semua item lama
  for (const item of items) {
    lines.push(`${item.number}. ${item.name}`);
  }

  // Tambah nama baru
  lines.push(`${nextNumber}. ${newName}`);

  return lines.join('\n');
}

module.exports = { buildList };
