# ENS Entegrasyonu: Agent Kimligi ve Cross-Chain Kesif

## Agent Isimlendirme

Agentlar ENS alt-isimleri (subname) ile tanimlanir:
- `alpha.operator.eth` → `operator.eth`'in alt ismi
- Operatorler birden fazla agenti alt alan adi olarak yonetebilir (filo yonetimi)

## CCP Text Kayitlari

Her ENS ismine su text kayitlari eklenir:
- `ccp.certificate` — Sertifika hash'i
- `ccp.class` — C1, C2 veya C3
- `ccp.chain` — Zincir ID (orn. Hedera testnet icin 296)
- `ccp.registry` — Registry sozlesme adresi

## Cross-Chain Kesif Akisi

1. Agent bir islemde ENS ismini referans gosterir (`alpha.operator.eth`)
2. Karsi taraf ismi Sepolia'da (ENS registry) cozumler
3. CCP text kayitlarini alir (zincir ID, registry, sertifika hash)
4. Hedera'daki CCP registry'ye sertifika hash'iyle sorgu yapar
5. Sertifikayi on-chain dogrular — araciya guven gerektirmez

**Sonuc:** ENS uzerinden kimlik (Ethereum), settlement Hedera uzerinde — zincirlerer arasi kesif sorunsuz calisir.
