# CCP Nedir? - Genel Bakis

CCP (Containment Certificate Protocol), AI agentlarin ekonomik etkisinin sinirli oldugunu kanitlayan on-chain sertifikalar ureten bir protokoldur.

## Temel Problem

AI agentlar artik cuzdan tutuyor, islem imzaliyor, odeme yapiyor. Ama klasik "guven" modelleri bunlar icin calismaz cunku:

- **Olasiliksal davranirlar** — Gecmis davranislari gelecegi zayif tahmin eder (LLM ciktilari stokastik)
- **Duragan degiller** — Sessiz model guncellemeleri her seyi degistirir
- **Geciciler** — Yeni kimlik olusturmak neredeyse bedava, ceza mekanizmalari ise yaramaz
- **Kontrol katmanlari da olasiliksal** — Agent, operatorleri ikna edebilir, bosluklar bulabilir

## Cozum: Sinirli-Kayip Mimarisi

"Bu agent iyi davranir mi?" sorusu yerine: **"En kotu durumda kayip ne kadar ve kim karsilar?"**

CCP, agentin davranisina guven yerine, agentin **etki alanini sinirlandiran** yapisal mekanizmalara dayanir. Tum agent-etkili katmanlar cokse bile, agent-bagimsiz katmanlar kaybi sinirlar ve bu kaybi karsilayacak kadar yedek varlik kilitlenmis olur.

## Kullanilan Zincirler

| Zincir | Rol |
|--------|-----|
| **Hedera** | Sozlesme calistirma, HCS olay loglari, 3sn finalite |
| **Ledger** | Donanim esli-imza, agent-bagimsiz kisitlama |
| **ENS** | Agent isimlendirme, sertifika kesfetme (cross-chain) |
