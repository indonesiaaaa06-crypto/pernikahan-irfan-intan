# Undangan Pernikahan Intan & Irfan

Undangan digital responsif berbahasa Indonesia dengan sampul pembuka, profil mempelai, cerita, hitung mundur, jadwal dan peta, galeri, RSVP, buku ucapan, hadiah digital, serta musik latar.

## Menjalankan dengan Node.js

1. Pastikan Node.js versi 18 atau lebih baru tersedia.
2. Dari folder proyek, jalankan `node server.js`.
3. Buka `http://localhost:3000/`.

Alternatif: jalankan `npm start` (atau `npm.cmd start` di PowerShell). Server hanya menggunakan modul bawaan Node.js, tanpa instalasi dependensi.

RSVP dan ucapan memakai Firebase Realtime Database dan tersinkron langsung pada semua undangan yang terbuka. Node.js hanya menyajikan situs; tidak menyimpan kiriman RSVP/ucapan.

## Mengaktifkan Firebase Realtime Database

1. Buat proyek Firebase dan aplikasi Web di Firebase Console.
2. Di proyek `undagan-irfan-intan`, buka **Authentication > Get started**, lalu aktifkan **Sign-in method > Anonymous**. Keduanya diperlukan; hanya membuat aplikasi Web belum mengaktifkan layanan Authentication.
3. Salin konfigurasi aplikasi Web ke `firebase-config.js`, termasuk `databaseURL`.
4. Publikasikan aturan dari `database.rules.json` di bagian Realtime Database > Rules. Cara cepat dengan Firebase CLI:

   ```sh
   npx firebase-tools login
   npx firebase-tools deploy --only database
   ```

   `firebase.json` menghubungkan aturan tersebut ke database proyek `undagan-irfan-intan`. Perintah deploy perlu dijalankan oleh pemilik/kolaborator proyek yang sudah masuk ke Firebase CLI.
5. Muat ulang undangan. Status buku ucapan akan menjadi **Langsung** bila konfigurasi dan izin sudah benar.

Untuk melihat RSVP dan mengelola buku ucapan:

1. Di Firebase Console > **Authentication > Sign-in method**, aktifkan **Email/Password**.
2. Di **Authentication > Users**, buat pengguna admin `indonesiaaaa05@gmail.com` dengan password pilihan Anda. Jangan gunakan PIN undangan atau menaruh password admin di kode.
3. Terbitkan aturan terbaru `database.rules.json`. Hanya akun dengan email admin itu dapat membaca daftar RSVP, membalas ucapan, dan menghapus ucapan; tamu tetap dapat mengirim konfirmasi serta membaca balasan admin.
4. Buka tombol **Admin** di baris kedua footer, masuk dengan password akun Firebase tersebut, lalu pilih tab **Konfirmasi** atau **Ucapan**. Data diperbarui langsung; balasan admin tampil di buku ucapan publik dengan tanda centang biru.

Saat mencoba dari alamat lokal `127.0.0.1`, tambahkan alamat tersebut ke **Authentication > Settings > Authorized domains** bila Firebase meminta domain yang diizinkan.

Jika muncul `auth/configuration-not-found`, Firebase Authentication belum diinisialisasi pada proyek atau konfigurasi aplikasi Web memakai proyek yang berbeda. Jika muncul `Permission denied` setelah login berhasil, aturan belum dipublikasikan ke Realtime Database yang URL-nya tercantum di `firebase-config.js`; jalankan deploy CLI di atas atau tempel isi `database.rules.json` di tab **Rules** lalu tekan **Publish**. Setelah mengubah aturan baca RSVP, pastikan aturan yang sama sudah dipublikasikan ke database live.

Konfigurasi Firebase Web berisi identifier publik proyek, bukan kredensial admin. Jangan memasukkan service-account key atau rahasia server ke file ini. Kiriman lama yang masih ada di `data/wishes.json` / `data/rsvps.json` tidak otomatis dipindahkan ke Firebase.

## Menyesuaikan undangan

- Ubah nama, keluarga, kisah, jadwal, lokasi, tautan, dan nomor rekening di `index.html`.
- Ubah tanggal hitung mundur, detail acara kalender, dan teks tanggal terkait di `script.js`.
- Sesuaikan warna, tipografi, foto, dan tata letak di `style.css`.
- Ganti tautan dan username Instagram, serta hashtag, di bagian `#social` pada `index.html` dengan akun resmi pasangan.
- Tautan berbagi WhatsApp memakai nomor `60142867211` (format internasional tanpa tanda `+` di URL); ubah di `script.js` bila nomornya berubah.
- Foto profil, foto latar pembuka/hero, foto perjalanan, dan galeri memakai gambar lokal di `assets/`.
- Firebase, Google Fonts, dan peta memerlukan koneksi internet.
