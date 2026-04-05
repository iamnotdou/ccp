# Islem Entegrasyonu: Gercek Dunya Akislari

## Senaryo 1: x402 Odeme Protokolu (Agent → Servis)

```
Agent → Servis (HTTP GET /api/data)
Servis ← 402 Payment Required (header'da CCP min gereksinimler)
Agent → Odeme + CCP sertifika hash'i
Servis → On-chain CCP registry'yi sorgular
Servis → Sertifikayi kendi politikasina gore degerlendirir
Servis → 200 OK + veri
```

On-chain dogrulama ek gecikmesi: ~50ms (API cagrilari icin ihmal edilebilir).

## Senaryo 2: Agent-to-Agent (DeFi)

```
Agent A → Borcverme Havuzu (50k USDC yatir + sertifika hash)
Havuz → CCP registry sorgula (miktar >$10k esiginde)
Havuz → CCP sinifi, containment bound, bitis tarihini degerlendir
Havuz → Depozitoyu kabul et, LP token bas
```

Sozlesme durumu sorgulariyla on-chain dogrulama (harici cagri gerekmez).

## Risk Fonksiyonu (Tek Skor Degil!)

CCP tek bir "guven skoru" vermez. Bunun yerine bir **risk fonksiyonu** saglar:

```
R(t) = P_agent(t) x P_ortak_cokus(t) x L(t)
```

- **P_agent** = Agent davranisi riski (olasiliksal, duragan degil)
- **P_ortak_cokus** = Tum kontrol katmanlarinin ayni anda cokmesi olasiligi
- **L** = Potansiyel kayip buyuklugu

**Sertifika giris saglar** (kisitlamalar, yedekler, attestasyonlar). **Karsi taraf kendi fonksiyonunu uygular** (risk politikasi). Farkli risk toleranslari, farkli islem buyuklukleri → farkli kararlar.
