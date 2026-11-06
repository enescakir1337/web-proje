# 66 Vizite

Araçlarınız için QR "vizit kartı" servisi. Aracınıza yapıştırdığınız QR kodunu tarayan kişi, telefon numaranızı görmeden sizi arayabilir, WhatsApp/SMS gönderebilir. Saf **PHP 8** backend + vanilla HTML/CSS/JS frontend. Composer/npm yok, build adımı yok, veritabanı SQLite.

## Ekran Görüntüleri

Tüm ekran görüntüleri `docs/` klasöründedir.

| Ekran | Açıklama |
|---|---|
| [Ana Sayfa](docs/landing.png) | Tanıtım sayfası; giriş / kayıt modalını buradan açar |
| [Kayıt Sayfası](docs/register.png) | Ücretsiz hesap oluşturma |
| [QR Tarama Sayfası](docs/qr-tarama.png) | QR okutan kişinin gördüğü herkese açık kart: Ara, WhatsApp, SMS |
| [Panel — Profil & Üyelik](docs/dashboard-profil.png) | Profil bilgileri, profil/şifre güncelleme, araç yönetimi |
| [Panel — Araçlarım](docs/dashboard-araclar.png) | Araç ekleme; kart üzerinden düzenleme ve silme |
| [Panel — QR Oluşturma](docs/dashboard-qr-olusturma.png) | Araç seçip iletişim numarası ve otomatik mesajla kart üretme |
| [Panel — QR Oluşturma Sonucu](docs/dashboard-qr-basari.png) | Kart oluştuğunda anında önizleme, indirme ve yazdırma |
| [Panel — QR Kartlarım](docs/dashboard-qr-kartlarim.png) | Tüm kartlar; etkinleştir/devre dışı, bağlantı yenileme, silme |
| [Panel — Mobil Görünüm](docs/dashboard-mobil.png) | Dar ekranlarda menü ve kart yerleşimi |
| [Admin Paneli](docs/admin-panel.png) | İstatistikler, rol/plan güncelleme, kullanıcı silme |

## Çalıştırma

### Linux / macOS (Docker ile, önerilen)
```bash
./baslat.sh          # sunucuyu başlatır (açık varsa kapatıp yeniden başlatır)
./baslat.sh dur      # durdurur
./baslat.sh durum    # çalışıyor mu?
./baslat.sh log      # canlı log
```
Sunucu `http://localhost:8000` üzerinde açılır; aynı ağdaki telefonlar için LAN adresi de gösterilir. Port: `PORT=9000 ./baslat.sh`.
Docker **yalnızca yerel test amaçlıdır**; projeye Dockerfile/compose eklemez, tüm tanım `baslat.sh` içindedir.

### Windows (yerel PHP ile)
`baslat.bat` (Laragon/XAMPP PHP yollarını dener) → `http://localhost:8000`.

### Yerel PHP (Docker'sız)
```bash
php -S 0.0.0.0:8000 -t frontend backend/router.php
```

## Yayına Alma (Shared Hosting)

Hedef ortam **paylaşımlı hosting** (Apache + PHP 8.1+ / 8.3 önerilir, mod_rewrite ve `.htaccess` desteği açık olmalı, `pdo_sqlite` eklentisi yüklü olmalı):

1. Tüm dosyaları (`frontend/`, `backend/`, `.htaccess`, `.gitignore` hariç her şey) hosting hesabınızın **document root**'una (örn. `public_html/`) yükleyin.
2. `backend/database/` klasörünün ve içindeki `66Vizite.db` dosyasının PHP tarafından **yazılabilir** olduğundan emin olun (cPanel/FTP'ten klasör 755, dosya 644; gerekirse dosya sahibi PHP kullanıcısıyla aynı değilse 666/777 deneyin).
3. İlk istek ile şema otomatik oluşturulur — kurulum adımı yoktur.
4. Hazır bir yönetici için: kayıt olduktan sonra **ilk yöneticiyi SQL ile atayın** (phpLiteAdmin / hosting paneli):
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'sizin@email.com';
   ```
   Kayıt formundan `admin` rolü alınamaz; rol atama yalnızca yönetici panelinden veya SQL ile yapılır.

Yönlendirme: `/api/*` istekleri `.htaccess` → `backend/api/index.php` (tek route tablosu); diğer dosyalar `frontend/` altından servis edilir. Veritabanı dosyalarına (`.db`, `.sql`) web erişimi `.htaccess` ile engellidir.

## Mimari Özet

- **Kimlik doğrulama**: PHP session tabanlı. Tüm korumalı uçlar `backend/auth.php` üzerinden oturum ister (`require_user` / `require_admin`); istemciden gelen `user_id`'ye güvenilmez. Çıkış: `POST /api/auth/logout`. Kayıtta rol/plan sunucuda sabitlenir (`user` / `free`).
- **Şifre**: bcrypt (`password_hash`); eski PBKDF2 hesapları için otomatik geri dönüş korunur. Şifre sıfırlama: `POST /api/auth/forgot` → e-postaya 1 saatlik token linki → `/sifre_sifirla.html` (hostingte PHP `mail()` kullanılır).
- **Rate limit**: Giriş 10 deneme/15 dk IP başına; kayıt 10/60 dk (SQLite tabanlı sayaç).
- **QR kartları**: `is_active` (devre dışı bırakma), token yenileme (`action=rotate`), silme ve `scan_count` takibi. QR **görselleri tarayıcıda offline üretilir** (`frontend/vendor/qrcode.min.js`, MIT) — dış QR servisine hiçbir veri gitmez.
- **Yönetim paneli**: yalnızca `admin` rolü; kullanıcı istatistikleri, rol/plan güncelleme, kullanıcı silme (.CASCADE).
- **Veri**: `backend/database/db.php` tek veri katmanı; şema her ilk bağlantıda idempotent uygulanır.

## API Uçları

| Uç | Yetki |
|---|---|
| `POST /api/auth/register`, `login`, `logout`, `forgot`, `reset` | herkese açık |
| `GET /api/dashboard` | oturum |
| `GET/POST /api/vehicles`, `PUT/DELETE` (aynı uç) | oturum (sahiplik) |
| `GET/POST /api/qr-codes`, `PATCH` (`action: toggle/rotate`), `DELETE` | oturum (sahiplik) |
| `GET /api/qr?token=...` | herkese açık (yalnız aktif kartlar; tarama sayar) |
| `GET/POST /api/purchases` | oturum |
| `POST /api/profile` (bilgi + şifre değiştirme) | oturum |
| `POST /api/user/update-plan` | oturum (admin başkası için de) |
| `GET /api/users` | admin |
| `GET/POST /api/admin/users` (stats, rol/plan, silme) | admin |

## Geliştirme Notları

- SQLite `.db` dosyası git'e commitlenir (geliştirme verisi); gerçek kullanıcı verisi yüklemeyin.
- Yeni bir API ucu eklerken **tek yer**: `backend/api/index.php` içindeki `$routes` tablosu (built-in sunucu ve Apache aynı tabloyu kullanır).
- Smoke test: sunucu açıkken tarayıcıdan admin girişi yapıp `/admin.html`'deki istatistikleri ya da herkese açık bir `/api/qr?token=...` linkini kontrol edin.
