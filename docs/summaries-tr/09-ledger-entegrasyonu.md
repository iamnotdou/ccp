# Ledger Donanim Entegrasyonu

## Cift-Imza Mimarisi

SpendingLimit sozlesmesi Ledger donanim cihazini agent-bagimsiz bir kontrol katmani olarak kullanir:

- **Esik alti (orn. <$5k):** Agent tek basina imzalar → hizli yol
- **Esik ustu:** Ledger donanim cihazi da imzalamak zorunda → guvenlik kapisi
- **Parametre degisikligi:** Sadece Ledger-turkevli adres degistirebilir

## Neden Agent-Bagimsiz?

Agent, operatorun yaziliminin tum kontrolunu ele gecirse bile Ledger parametrelerini degistiremez. Cunku:
- Ledger fiziksel olarak ayri bir cihazdada
- Imza anahtari donanim icinde, yazilimla erisilemez
- Parametre degisikligi fonksiyonlari sadece Ledger adresine yetkili

## Donanim-Attestasyonlu Sertifika Imzalama

- Operator sertifikayi Ledger ile imzalar (donanim kimligine attestasyon)
- Denetci Ledger imzasiyla onaylar
- On-chain'de degistirilemez donanim katilim kaydi

## Ozet

Ledger, "agent ne yaparsa yapsin bu parametreleri degistiremez" garantisini veren fiziksel bir guvenlik katmanidir. Bu da harcama limitlerini gercek anlamda agent-bagimsiz yapar.
