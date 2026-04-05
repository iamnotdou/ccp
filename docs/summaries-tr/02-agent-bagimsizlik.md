# Agent-Bagimsiz vs Agent-Etkili Kontrol

CCP'nin en kritik ayrimi: bir kisitlamayi agent bozabilir mi, bozamaz mi?

## Agent-Bagimsiz Kontroller

Agentin hicbir sekilde etkileyemedigi mekanizmalar:

- **Dogrulanmis akilli sozlesmeler** — Agent kodu degistiremez
- **TEE donanim attestasyonu** — Agentin erisim alani disinda
- **HSM imza politikalari** — Fiziksel olarak ayri
- **MPC coklu-taraf onayi** — Bagimsiz taraflar gerektirir

## Agent-Etkili Kontroller

Insan yargisinsa veya agentin etkilesebildigi sistemlere bagli mekanizmalar:

- **Insan gozetimi** — Agent insanlari ikna edebilir
- **Itibar skorlari** — Agent skorlamayi manipule edebilir
- **Degistirilebilir API limitleri** — Konfigurasyonlar degisebilir

## Tasarim Kurali

> Tum agent-etkili katmanlar cokse bile, kalan agent-bagimsiz katmanlar kaybi, dis yedeklerin karsilayabilecegi seviyede sinirlamalidir.

Sertifikadaki `agent_independent: true/false` alani her kisitlama icin bu durumu belirtir. **Sadece `true` olarak isaretlenen kisitlamalar containment bound hesabina girer.**
