# 12 Asamali Sertifika Yasam Dongusu

## 1. Build (Insa)
Operator kontrol mimarisini tasarlar ve deploy eder: harcama limitleri, zaman kilitleri, izin sinirlari, kill switch. Her kisitlamayi agent-bagimsiz/etkili olarak siniflandirir.

## 2. Fund (Fonlama)
Operator ReserveVault'a dis varlik (USDC/ETH/DAI) yatirir + ayri bond sozlesmesine %5-10 kesilebilir depozito.

## 3. Audit Request (Denetim Talebi)
C2/C3 sertifikalar icin operator bagimsiz denetci tutar, kapsam tanimlar, ucreti FeeEscrow'a yatirir.

## 4. Audit (Denetim)
Denetci 5 yuzeyi inceler: harcama limitleri, izin modeli, yedek, calisma ortami, kurtarma mekanizmalari. C3 icin ek olarak kompozisyon analizi yapar (tum para yollarini haritalandirir).

## 5. Attest & Stake (Onaylama + Stake)
Denetci rapor uretir, attestasyon imzalar, AuditorStaking'e sermaye kilitler. Denetim ucreti serbest birakilir.

## 6. Compose (Birlestirme)
Tam sertifika JSON'u olusturulur: kimlik, gecerlilik, kisitlamalar, yedek, turetilmis metrikler, attestasyonlar.

## 7. Publish (Yayinlama)
JSON → IPFS'e yuklenir, IPFS hash'i CCPRegistry'de on-chain kaydedilir. Operator Ledger ile imzalar.

## 8. Active (Aktif)
Sertifika canli! Registry `isValid = true` doner. Karsi taraflar sorgulayabilir.

## 9-10. Verify (Dogrulama)
Karsi taraf: registry'den sertifika bul → IPFS'ten al → imzalari dogrula → durumu kontrol et → kendi risk politikani uygula → kabul/red karar ver.

## 11. Terminate (Sonlandirma)
Uc sekilde: yenileme (yeni sertifika yayinlanir), iptal (operator/denetci cagirir), sure dolumu.

## 12. Settlement (Uzlasma)
Grace period sonrasi: itiraz yoksa → bond + stake + yedek iade. Basarili itiraz varsa → bond + stake kesilir, yedek talepler icin kullanilir.

## Tipik C2 Zaman Cizelgesi
- Gun 0-14: Insa + fonlama
- Gun 14-21: Denetim
- Gun 22: Sertifika yayinlandi
- Gun 22-82: Aktif (60 gun)
- Gun 82-96: Grace period
- Gun 96: Uzlasma
