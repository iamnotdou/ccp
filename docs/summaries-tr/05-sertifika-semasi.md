# Sertifika Semasi ve Kisitlama Sistemi

## Sertifika Yapisi

Bir CCP sertifikasi su bolumlerden olusur:
- **Kimlik:** sertifika ID, agent ID, operator ID, zincir ID
- **Gecerlilik:** verilme tarihi, bitis tarihi, durum
- **Kisitlamalar:** her biri tip, deger, uygulama mekanizmasi, agent-bagimsizlik bayragi
- **Yedek:** miktar, birim, sozlesme adresi, disindan mi (exogenous)
- **Turetilmis metrikler:** containment bound, katman sayilari
- **Attestasyonlar:** denetci imzalari ve kapsam

## Kisitlama Tipleri

| Tip | Aciklama | Ornek |
|-----|----------|-------|
| `SPENDING_LIMIT` | Donem basina maks transfer | $50k/gun |
| `PERMISSION_BOUNDARY` | Yasakli islemler | Cekim fonksiyonlarina erisim yok |
| `EXECUTION_ENVIRONMENT` | TEE/HSM/MPC | SGX enclave |
| `TIME_LOCK` | Islem gecikmesi | >$10k icin 24 saat bekleme |
| `MULTI_SIG` | Coklu imza | Operator + Ledger esli-imza |
| `KILL_SWITCH` | Durdurma mekanizmasi | Pause fonksiyonu |
| `REVERSIBILITY_WINDOW` | Geri alma suresi | 30 dk geri alma penceresi |

## Sertifika Siniflari

| Sinif | Kendi Beyanli? | Denetci | Min Stake | Maks Sure | Kullanim |
|-------|----------------|---------|-----------|-----------|----------|
| **C1** | Evet | Hayir | Yok | 90 gun | Dusuk riskli (orn. salt-okunur sorgular) |
| **C2** | Hayir | Evet | Sinirin %3'u | 60 gun | Orta riskli (odeme agentlari) |
| **C3** | Hayir | Evet (kapsamli) | Sinirin %5'i | 30 gun | Yuksek riskli (karmasik, izin-kritik) |

## Containment Bound (Sinirlandirma Siniri)

Sadece agent-bagimsiz katmanlar tutuyorken ve tum agent-etkili katmanlar cokerken olusabilecek **en kotu durum ekonomik kaybi**. Bu deger sertifikanin "kac dolarlik riskiniz var?" sorusunun cevabi.
