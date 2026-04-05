# Oyun Teorisi: Neden Durust Davranis Nash Dengesi?

CCP, tum oyuncularin durust davranmasinin en iyi strateji oldugu bir cok-oyunculu tekrarli oyun olarak tasarlanmistir.

## Operator Perspektifi
- **Durust:** Gercek kontrol kur, yedegi fonla, duzgun denetim al → Erisim devam eder, bond iade edilir
- **Sahtekar:** Kose kes, yedegi eksik birak → Bond kesilir, yedek el konulur, kara listeye alinir

Bond (%5-10) su sekilde kalibre edilir: yakalanma maliyeti > kose kesme tasarruflari.

## Denetci Perspektifi
- **Durust:** Kapsamli denetim, muhafazakar attestasyon → ~%39 marj, 25 musteriyle $1.4M net
- **Sahtekar:** Lastik-damga attestasyon → -$5M+ beklenen kayip (slash + itibar kaybi)

Stake mekanizmasi sahtekarligi yapisal olarak karliligini ortadan kaldirir.

## Dogrulayici Perspektifi
- **Siki:** Anlamli esikler uygula → Kayiplardan kacinir, slash paylarimini alir
- **Gevser:** Herhangi bir sertifikayi kabul et → Kayiplara acik

## Koalisyon Direnci

| Koalisyon | Tehdit | Savunma |
|-----------|--------|---------|
| Operator + Denetci | Lastik-damga | Challenger odulleri + denetci yogunluk limitleri |
| Operator + Challenger | Kendi kendine challenge | %20 yakma (deger yok edilir) |
| Denetci karteli | Fiyat sabitleme | Izinsiz giris + cirak sistemi |

**%20 yakma mekanizmasi kritiktir:** Challenger ve operator ayni kisi bile olsa, deger yok edilir — danisikli dovus karli olmaz.

## 7 Denge Kosulu (E1-E7)

Hepsi ayni anda saglandiginda durust katilim tek Nash dengesidir:

1. Bond > hile tasarrufu → Operator durustlugu
2. Stake NPV > lastik-damga ucreti → Denetci durustlugu
3. Gevseklik kaybi > dogrulama maliyeti → Dogrulayici sikiligi
4. Odul x tespit olasiligi > izleme maliyeti → Challenger izlemesi
5. Dolandiricilik kaybi > entegrasyon maliyeti → Entegrator benimsemesi
6. Prim geliri > beklenen odemeler → Sigorta saglayicisi
7. Cirak sistemi → karlilga giden yol → Giris
