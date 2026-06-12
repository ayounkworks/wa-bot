'use strict';

/**
 * Generate teks list lengkap dengan nama baru ditambahkan.
 * @param {string} header - Header asli dari list (mis: "LIST KERJA MALAM")
 * @param {Array<{number: number, name: string}>} items - Item list yang sudah ada
 * @param {string} newName - Nama yang akan ditambahkan
 * @returns {string}
 */
function buildList(header, items, newName) {
  const maxNumber = items.length > 0 ? Math.max(...items.map(i => i.number)) : 0;

  // Cari slot kosong pertama (item yang tidak ada namanya)
  const emptySlot = items.find(i => !i.name);
  const targetNumber = emptySlot ? emptySlot.number : maxNumber + 1;
  const totalSlots = Math.max(maxNumber, targetNumber);

  const lines = [];

  // Tambah header jika ada
  if (header && header.trim()) {
    lines.push(header.trim());
    lines.push(''); // baris kosong setelah header
  }

  for (let n = 1; n <= totalSlots; n++) {
    if (n === targetNumber) {
      lines.push(`${n}. ${newName}`);
    } else {
      const existing = items.find(i => i.number === n);
      lines.push(existing && existing.name ? `${n}. ${existing.name}` : `${n}.`);
    }
  }

  return lines.join('\n');
}

module.exports = { buildList };
