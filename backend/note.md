Done! PM2 sudah terkonfigurasi penuh.
┌────┬─────────────────────┬──────────┬──────────┬──────────────┐
│ id │ name │ status │ cron │ restart │
├────┼─────────────────────┼──────────┼──────────┼──────────────┤
│ 0 │ stockbit-server │ online │ - │ auto │
│ 1 │ stockbit-fetcher │ online │ 0 17 \* \* │ manual only │
│ │ │ (running)│ 1-5 │ (lewat cron) │
└────┴─────────────────────┴──────────┴──────────┴──────────────┘
Yang Sudah Berjalan
| Service | Status | Detail |
|---------|--------|--------|
| stockbit-server | ✅ online | Port 3001 |
| stockbit-fetcher | 🔄 running now | 137/957 emiten selesai, BBCA ✅ |
| Cron | 📅 scheduled | Senin-Jumat jam 17:00 WIB |
Command untuk Kamu
Agar PM2 auto-start setelah reboot:
sudo env PATH=$PATH:/home/bima/.config/nvm/versions/node/v22.12.0/bin pm2 startup systemd -u bima --hp /home/bima
Command berguna PM2:
pm2 list # lihat status semua service
pm2 logs # lihat semua log real-time
pm2 logs fetcher # lihat log fetcher aja
pm2 stop fetcher # stop fetcher (kalau mau hentikan)
pm2 restart server # restart server setelah update .env
Server tetap jalan selama fetcher bekerja. Data akan tersedia untuk frontend secara bertahap begitu emiten selesai diproses.
