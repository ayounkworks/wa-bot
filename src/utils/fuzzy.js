'use strict';

/**
 * Hitung jarak Levenshtein antara dua string.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Hitung similarity (0–1) antara dua string.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function similarity(a, b) {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

/**
 * Cek apakah target nama ada di list (dengan toleransi typo).
 * @param {string} targetName - Nama yang dicari (mis: "Ayounk")
 * @param {string[]} names - Daftar nama di list
 * @param {number} threshold - Batas similarity (default 0.75)
 * @returns {{ found: boolean, matchedName?: string, score?: number }}
 */
function isDuplicate(targetName, names, threshold = 0.75) {
  for (const name of names) {
    const score = similarity(targetName, name);
    if (score >= threshold) {
      return { found: true, matchedName: name, score };
    }
  }
  return { found: false };
}

module.exports = { isDuplicate, similarity };
