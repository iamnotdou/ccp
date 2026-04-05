# HCS (Hedera Consensus Service) Denetim Izi

## Ne Yapar?

Tum sertifika yasam dongusu olaylari Hedera HCS topic'ine yayinlanir. Bu, degistirilemez, zaman damgali bir olay akisi olusturur.

## Kaydedilen Olaylar

- `CertificatePublished` — Yeni sertifika yayinlandi
- `CertificateRevoked` — Sertifika iptal edildi
- `TransactionExecuted` — Agent odemesi islendi
- `TransactionBlocked` — Agent odemesi reddedildi
- `ChallengeSubmitted` — Itiraz basladi
- `ChallengeResolved` — Karar verildi
- `Slashed` — Denetci stake'i kesildi

## Neden Onemli?

Mirror Node sorgulariyla herkes su bilgilere erisebilir:
- Agent aktivitesinin tam zaman cizelgesi
- Denetci attestasyonlari gecmisi
- Challenge ve sonuclari
- Slash olaylari

**Kullanim alanlari:** Regulatorler, sigortacilar ve karsi taraflar icin mukemmel denetim izi.
