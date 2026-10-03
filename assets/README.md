# Aset Logo & Ikon Aplikasi (Android APK Ready)

Folder ini berisi berkas aset vektor SVG resmi untuk aplikasi **Sistem Jadwal Shif & Pengingat Wali Asuh**.

## Berkas yang Tersedia

1. **`logo.svg`** (512x512 px)
   - Master Icon resolusi tinggi dalam format SVG.
   - Mengikuti kaidah *squircle* dengan sudut membulat modern.
   - Cocok untuk ikon aplikasi (App Icon), splash screen, web manifest, dan banner identitas aplikasi.

2. **`icon-background.svg`** (512x512 px)
   - Lapisan latar belakang (*background layer*) untuk **Android Adaptive Icon**.
   - Warna dasar *Emerald Night* (#07191E ke #0A332C) dengan ornamen geometris islami halus.

3. **`icon-foreground.svg`** (512x512 px)
   - Lapisan depan (*foreground layer*) untuk **Android Adaptive Icon**.
   - Telah disesuaikan dengan *Safe Zone* Android (radius 66% tengah) sehingga **tidak akan terpotong** oleh bentuk mask bawaan berbagai merek HP (lingkaran Samsung/Pixel, squircle Xiaomi/Oppo/Vivo, rounded square, dsb.).

## Cara Penggunaan saat Build APK

### Opsi A: Menggunakan Android Studio (Image Asset Studio)
1. Buka project Android di Android Studio.
2. Klik kanan folder `app/src/main/res` -> **New** -> **Image Asset**.
3. Pada **Icon Type**, pilih **Launcher Icons (Adaptive and Legacy)**.
4. Pada tab **Foreground Layer**:
   - Source Asset: Image / SVG -> Pilih berkas `assets/icon-foreground.svg` (atau `assets/logo.svg`).
5. Pada tab **Background Layer**:
   - Source Asset: Image / SVG -> Pilih berkas `assets/icon-background.svg` atau pilih Color `#07191E`.
6. Klik **Finish**. Android Studio otomatis membuat semua folder `mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`.

### Opsi B: Menggunakan Capacitor / Cordova
1. Salin `logo.svg` atau convert ke PNG 512x512 (`icon.png`).
2. Jalankan perintah generator ikon bawaan Capacitor:
   ```bash
   npx @capacitor/assets generate --android
   ```

### Opsi C: Website / PWA / Web APK Builder
- Berkas juga tersedia di `/public/logo.svg` sehingga dapat langsung dimuat di browser atau WebView pada path `/logo.svg`.
