# 6 Akilli Sozlesme

CCP'nin on-chain altyapisi 6 sozlesmeden olusur. Hepsi Hedera testnet'te deploy edilmis durumda.

## 1. CCPRegistry — Sertifika Kayit Defteri

Sertifikalarin depolandigi, sorgulandigi ve dogrulandigi ana sozlesme.

- `publish()` — Yeni sertifika kaydet (operator + denetci imzasiyla)
- `revoke()` — Sertifikayi iptal et
- `verify(agent, minClass, maxLoss)` — Karsi tarafin sorgulama fonksiyonu
- Durumlar: ACTIVE → REVOKED / EXPIRED / CHALLENGED → SETTLED

## 2. SpendingLimit — Harcama Limiti + Ledger Esli-Imza

Agent islemlerine yapisal sinir koyan sozlesme. Ledger donanimla esli-imza mekanizmasi:

- **Esik alti (orn. <$5k):** Agent tek basina imzalar
- **Esik ustu:** Ledger donanimi da imzalamak zorunda
- **Parametre degisikligi:** Sadece Ledger yapabilir (agent-bagimsiz!)

Kisitlamalar: tek-islem limiti, periyodik limit (orn. gunluk), esli-imza esigi.

## 3. ReserveVault — Yedek Varlik Kasasi

Sertifika suresince kilitli tutulan dis varliklar (USDC, ETH, DAI).

- `deposit()` / `lock()` / `release()` — Yatirma, kilitleme, serbest birakma
- `isAdequate()` — Yedegin yeterli olup olmadigini kontrol et
- **Kural:** Operatorun basabilecegi tokenlar (governance token vb.) gecersiz!

## 4. AuditorStaking — Denetci Stake Mekanizmasi

Denetciler her attestasyon icin sermaye kilitler. Yanlis attestasyon kanitlanirsa kesilir.

- C1: 0 stake | C2: sinirin %3'u (max $100k) | C3: sinirin %5'i (max $250k)
- Slash dagitimi: %30 meydan okuyana, %50 altyapiya, %20 yakilir
- %20'lik yakma, operator-meydan okuyan danisikli dovusunu engeller

## 5. FeeEscrow — Denetim Ucreti Emaneti

Denetim ucretini sertifika suresi dolana kadar tutar.

- Sorun yoksa → ucret denetciye serbest birakilir
- Challenge basarili olursa → ucret operatore iade edilir

## 6. ChallengeManager — Itiraz/Uyusmazlik Yonetimi

Herkes en az 200 USDC teminatla sertifikaya itiraz edebilir.

- Itiraz turleri: yedek eksikligi, kisitlama ihlali, sahte bagimsizlik, denetim ihmali, kompozisyon acigi
- On-chain dogrulanabilir iddialar otomatik cozulur
- Karmasik davalar uzman paneli tarafindan cozulur
- Itiraz kabul → teminat iade + denetci kesilir + sertifika iptal
- Itiraz red → teminat yakilir + sertifika ACTIVE'e doner
