# Panduan Setup WA List Bot

---

## Persiapan (lakukan sekali)

### 1. Buat akun di layanan ini
- **GitHub** → https://github.com (untuk simpan kode)
- **Railway** → https://railway.app (untuk jalankan bot 24/7)

---

## Langkah A — Upload Kode ke GitHub

1. Buka https://github.com → klik **New repository**
2. Isi nama: `wa-list-bot` → klik **Create repository**
3. Di komputer kamu, buka terminal/cmd di folder `wa-list-bot/`
4. Jalankan perintah:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAMEKAMU/wa-list-bot.git
git push -u origin main
```

> Ganti `USERNAMEKAMU` dengan username GitHub kamu.

---

## Langkah B — Setting di Railway

### B1. Buat project baru
1. Buka https://railway.app → Login dengan GitHub
2. Klik **New Project** → pilih **Deploy from GitHub repo**
3. Pilih repo `wa-list-bot` → klik **Deploy Now**

### B2. Isi Variables (WAJIB)
1. Di dashboard Railway, klik project kamu
2. Klik tab **Variables**
3. Klik **+ New Variable**, isi satu per satu:

| Variable | Nilai | Contoh |
|---|---|---|
| `BOSS_NUMBER` | Nomor atasan (tanpa + atau spasi) | `6281234567890` |
| `MY_NAME` | Nama kamu persis seperti di list | `Ayounk` |
| `TARGET_GROUP` | Nama grup WhatsApp (persis sama!) | `Grup Kerja Malam` |
| `KEYWORDS` | Kata kunci pemicu, pisah koma | `list kerja,kerja malam,list malam,lembur` |
| `DELAY_MIN` | Delay minimum sebelum kirim (ms) | `2000` |
| `DELAY_MAX` | Delay maksimum sebelum kirim (ms) | `5000` |
| `FUZZY_THRESHOLD` | Sensitivitas deteksi duplikat | `0.75` |

### B3. Buat Volume (WAJIB agar session tidak hilang)
1. Masih di dashboard Railway
2. Klik **+ New** → pilih **Volume**
3. Isi:
   - **Volume Name**: `bot-data`
   - **Mount Path**: `/app/data`
4. Klik **Create Volume**

> ⚠️ Tanpa ini, setiap redeploy kamu harus scan QR ulang!

### B4. Redeploy
Setelah semua variable dan volume diisi:
1. Klik tab **Deployments**
2. Klik **Redeploy** pada deployment terbaru

---

## Langkah C — Scan QR Code (pertama kali saja)

1. Di Railway dashboard, klik **View Logs**
2. Tunggu sampai muncul QR code di log (berupa teks kotak-kotak)
3. Buka WhatsApp di HP → **Perangkat Tertaut** → **Tautkan Perangkat**
4. Scan QR code di layar
5. Tunggu log menampilkan: `✅ WhatsApp terhubung!`

> Setelah ini bot berjalan otomatis. QR hanya perlu di-scan sekali.

---

## Cara Cek Bot Berjalan Normal

Buka **Logs** di Railway, kamu akan lihat:

```
Bot starting...
Memulai Baileys v2.x.x
✅ WhatsApp terhubung!
```

Saat ada pesan list masuk dari atasan:
```
[PROSES] Pesan dari atasan di grup "Grup Kerja Malam"
[PARSE] Header: "LIST KERJA MALAM" | 2 item ditemukan
[DELAY] Menunggu 3241ms sebelum kirim...
[OK] List berhasil dikirim ke grup "Grup Kerja Malam"
```

Jika nama sudah ada:
```
[SKIP] Nama "Ayounk" sudah ada (cocok dengan "Ayounk", skor: 1.00)
```

---

## Mengubah Setting Tanpa Redeploy Kode

Cukup edit **Variables** di Railway → Railway otomatis restart bot.

Contoh: mau ganti nama dari `Ayounk` ke `Ayunk`:
1. Buka Railway → Variables
2. Ubah nilai `MY_NAME` → `Ayunk`
3. Klik **Save** → bot restart otomatis dengan nama baru

---

## Troubleshooting

### QR tidak muncul di log
→ Klik **Redeploy** di Railway

### Bot sudah connect tapi tidak bereaksi
Cek 3 hal di Variables:
1. `BOSS_NUMBER` → harus tanpa `+`, contoh: `628xxx` bukan `+628xxx`
2. `TARGET_GROUP` → harus **persis sama** dengan nama grup (termasuk spasi dan huruf besar)
3. `KEYWORDS` → harus mengandung kata yang ada di pesan atasan

### Bot kirim dua kali
Itu berarti pesan diproses dua kali. Cek apakah **Volume** sudah terpasang di `/app/data`. Tanpa volume, `processed.json` hilang saat restart.

### Tiba-tiba disconnect terus
Biasanya karena WhatsApp mendeteksi bot. Pastikan:
- `DELAY_MIN` minimal `2000` (jangan 0)
- Jangan jalankan bot di lebih dari 1 tempat dengan nomor yang sama

### Session invalid / harus scan ulang
1. Di Railway, buka **Volume** → hapus semua isi folder `session/`
2. Redeploy → scan QR ulang

---

## Struktur File

```
wa-list-bot/
├── src/
│   ├── main.js                  ← Entry point
│   ├── config/config.js         ← Semua setting dari env
│   ├── whatsapp/client.js       ← Koneksi WhatsApp + reconnect
│   ├── handlers/
│   │   ├── messageHandler.js    ← Router pesan masuk
│   │   └── listHandler.js       ← Core logic bot
│   └── utils/
│       ├── parser.js            ← Parse teks list
│       ├── formatter.js         ← Generate list baru
│       ├── fuzzy.js             ← Deteksi duplikat nama
│       ├── store.js             ← Simpan Message IDs
│       └── logger.js            ← Log ke console + file
├── data/                        ← Di-mount ke Railway Volume
│   ├── session/                 ← Session WhatsApp (otomatis)
│   ├── processed.json           ← Message IDs (otomatis)
│   └── bot.log                  ← Log bot (otomatis)
├── .env.example                 ← Contoh variables
├── railway.toml                 ← Config Railway
└── package.json
```
