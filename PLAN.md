# Rybki — plan wdrożenia

Prosta gra 2D dla 4-latka: płyniesz łódką po jeziorze, zarzucasz wędkę, łowisz kolorowe rybki, a klatką łapiesz kraby.
Widok z boku: widać jednocześnie niebo, łódkę na falach i wszystko, co dzieje się pod wodą.

Szata graficzna pochodzi z projektu **„Rybki — szata graficzna”** (kanwa w Claude). To płaska ilustracja o złotej godzinie:
- stonowana paleta (niebo #A3C4D3, jezioro #2F6E7F, akcent koral #E8775A),
- czcionka Outfit,
- przyciski z półprzezroczystego „szkła” na tle sceny.

## 1. Założenia dla małego dziecka

- **Brak porażki.** Nie ma żyć, czasu ani kar. Każde zarzucenie wędki ma dużą szansę na sukces.
- **Ryby same podpływają do haczyka** (efekt „magnesu”, widoczny jako jasna poświata wokół haczyka). Na pierwszych poziomach magnes jest silny, a ryby wolne.
- **Licznik bez cyfr.** U góry ekranu są puste sylwetki ryb, a po kresce sylwetki krabów. Wypełniają się złowionymi zwierzakami, więc dziecko widzi, ile jeszcze zostało.
- **Dużo nagród:** dźwięki, błyski, rybka lecąca łukiem do licznika, podskakujący rybak, konfetti i fanfary na koniec poziomu.
- **Duże przyciski** (min. 64 px), żadnego czytania wymaganego do gry.

## 2. Sterowanie

| Akcja | Klawiatura | Dotyk / mysz |
|---|---|---|
| Płyń w lewo / w prawo | ← → (lub A / D) | szklane przyciski strzałek w lewym dolnym rogu |
| Zarzuć wędkę | ↓, spacja lub Enter | duży koralowy przycisk z haczykiem |
| Zwiń wędkę wcześniej | ↑ | – (haczyk wraca sam po dotknięciu dna) |
| Opuść klatkę na kraby | C | musztardowy przycisk z klatką obok wędki |
| Dotyk sceny | – | **wyłączony** (`TAP_TO_MOVE = false` w `game.js`): łódką steruje się tylko strzałkami. Po włączeniu: dotknięcie wody podpływa i zarzuca wędkę, a dotknięcie dna opuszcza klatkę |
| Użyj bonusu | 1 zanęta, 2 robak, 3 turbo | okrągłe szklane przyciski (w poziomie w rzędzie obok klatki, w pionie nad klatką) |
| Dźwięk wł./wył. | M | szklany przycisk z głośnikiem w prawym górnym rogu |

## 3. Technologia

- **HTML5 Canvas + czysty JavaScript**, bez bibliotek i bez budowania. Gra działa po otwarciu `index.html`.
- **Grafika z projektu, rysowana kodem.** Kształty ryb, krabów, klatki, rybaka, łódki i ikon to te same ścieżki SVG co w projekcie, rysowane przez `Path2D`. Dzięki temu są ostre na każdym ekranie i nie trzeba wczytywać obrazków.
- **Dźwięk generowany przez Web Audio API**: plusk, „bulp”, melodyjka złowienia, fanfary i spokojna muzyczka. Nie ma plików audio.
- **Responsywność:** świat gry skaluje się do ekranu. W poziomie ma wysokość 720 jednostek. W pionie (telefon) ma szerokość 640 jednostek, a wody robi się więcej. Interfejs skaluje się osobno (0,8–1,3×). Ekrany o wysokim DPI są obsługiwane (`devicePixelRatio`).
- **Dotyk:** Pointer Events (jeden kod obsługuje mysz, palec i rysik), multitouch (strzałka i zarzucanie jednocześnie), `touch-action: none`, blokada zoomu, pełny ekran na urządzeniach dotykowych.
- **PWA-lite:** `manifest.webmanifest` i meta tagi pozwalają dodać grę do ekranu głównego tabletu lub telefonu i otwierać ją na pełnym ekranie.
- W `localStorage` zapisują się: poziom każdego trybu (`rybki-level`, `rybki-level-normal`), ostatni tryb, plecak z bonusami i ustawienie dźwięku.
- Dekoracje dna są danymi rysowanymi co klatkę tylko w widocznym fragmencie świata (nie ma już bufora o rozmiarze ekranu), więc działa to także przy przewijaniu.
- Do testów w konsoli: `__rybki.step(sek)` przewija czas gry, `__rybki.startGame('normal')`, `__rybki.loadLevel(n)`.

## 4. Struktura plików

```
rybki/
├── PLAN.md               – ten plan
├── index.html            – strona, canvas, meta tagi mobilne, czcionka Outfit
├── game.js               – cała gra
├── manifest.webmanifest  – instalacja na ekranie głównym
└── icon.svg              – ikona z projektu (zachód nad jeziorem, haczyk, koralowa ryba)
```

## 5. Elementy gry

### Scena (od tyłu do przodu)
1. Niebo z gradientem, słońce z poświatą (albo księżyc-rogal i migające gwiazdy nocą), tęcza na ostatnim poziomie, płaskie smugi chmur, ptaki.
2. Ostre pasma gór, las z trójkątnych świerków, domek (nocą ze świecącym okienkiem) albo latarnia morska.
3. Woda: fale, gradient głębokości, smugi światła, odbicie słońca, jasna linia tafli.
4. Dno: ciemne pasma, trzciny kołyszące się w wodzie, piasek, koralowce, rozgwiazdy, muszelki, skrzynia skarbów.
5. Ryby, kraby, klatka z boją, żyłka ze spławikiem, haczyk z robaczkiem.
6. Drewniana łódka z rybakiem z brodą, w musztardowym płaszczu i czapce, z koralową flagą. Zanurzona część kadłuba jest przyciemniona wodą.
7. Interfejs: numer poziomu, licznik ryb i krabów, przyciski.

### Mechanika
- **Łódka:** płynne przyspieszanie i hamowanie, ogranicznik na brzegach ekranu, kilwater.
- **Haczyk:** stany `idle` → `down` (opada) → `up` (wraca). Opadając, z opóźnieniem podąża za łódką, więc da się nim „łowić w ruchu”. Wraca sam po dotknięciu dna.
- **Ryby:** pływają w swojej strefie głębokości, czasem zawracają. Gdy haczyk jest blisko (promień magnesu), podpływają i biorą. Rybka-kulka nadyma się przy haczyku. Złowiona ryba wisi na haczyku, a nad wodą leci do licznika.
- **Kraby:** chodzą bokiem po dnie, przystają i kłapią szczypcami. Łowi się je **klatką, nie wędką**:
  1. Klatka opada na dno, a na powierzchni zostaje boja na linie.
  2. Najbliższy krab idzie do przynęty i wchodzi do środka. Boja podskakuje, a klatka sama wyjeżdża na powierzchnię.
  3. Jeśli żaden krab nie wejdzie przez ok. 7 s, klatka wraca pusta.
  4. Klatka jest bez limitu, ale w wodzie może być naraz tylko jedna.
- Złowione ryby i kraby po chwili zastępują nowe, więc nigdy ich nie brakuje.
- Poziom kończy się, gdy dziecko złowi wszystkie ryby i kraby z licznika. Gdy ryby są już złowione, przycisk klatki pulsuje jako podpowiedź.

### Poziomy

| # | Nazwa | Ryby | Kraby | Klimat | Nowość |
|---|---|---|---|---|---|
| 1 | Słoneczne jezioro | 3 | 1 | złota godzina, góry, las, domek | koralowe i ochrowe ryby, mocny magnes |
| 2 | Wesoła zatoka | 4 | 1 | turkusowe morze, latarnia, piasek | koralowce, błękitne i różane ryby |
| 3 | Różowy zachód | 5 | 2 | zachodzące słońce nad górami | fioletowe ryby, rybka-kulka |
| 4 | Nocne łowy | 6 | 2 | księżyc, gwiazdy, świecące okienko | świecące ryby, meduzy, niebieskie kraby |
| 5 | Tęczowa rafa | 7 | 3 | tęcza, rafa, skrzynia skarbów | złota rybka |

To pierwsze 5 z 20 poziomów trybu **łatwego**. Poziomy 6–20 przechodzą przez motywy: poranna mgiełka, jesień, laguna, wietrzny dzień, głębokie morze (i dalej znów od jeziora).
Każdy kolejny poziom ma szybsze ryby (prędkość 0,6 → 1,77) i słabszy magnes (185 → 98). Cel rośnie do 10 ryb i 4 krabów.

Po 20. poziomie jest ekran „Mistrz wędkarstwa!” (puchar i 5 medali), a gra zaczyna się od nowa.

### Tryby trudności
Na ekranie startowym są dwa przyciski: **Łatwy** (zielony, jedna gwiazdka) i **Normalny** (koralowy, dwie gwiazdki). Pod każdym widać numer bieżącego poziomu. Każdy tryb ma osobny zapis postępu. Klawiatura: 1 / 2 albo ← → i Enter. Przycisk z domkiem (lub Esc) wraca do wyboru trybu.

**Normalny** – 20 poziomów, na każdym trudniej. W tym trybie:
- **Świat jest szerszy niż ekran** (2400 → 6000 jednostek). Gdy łódka zbliża się do krawędzi, kamera jedzie razem z nią, a góry przesuwają się wolniej (paralaksa). Pod licznikiem jest pasek-minimapa: widoczny fragment, łódka, ryby, kraby, skały i prezenty.
- **Skały na dnie** o różnej wysokości (3 → 14 skał, coraz wyższe). Haczyk, który dotknie skały, zrywa się i zostaje na niej, a złowiona ryba ucieka. Rybak wiąże nowy haczyk przez 2–3 s (pierścień na przycisku wędki). Klatka postawiona na skale nie zwabi kraba.
- **Pływające skały** (1 → 7) blokują łódkę. Rozbija się je taranem: uderzenie z rozpędu kruszy skałę i odbija łódkę do tyłu, a przytrzymanie strzałki daje kolejne uderzenia. Turbo kruszy 3× mocniej. Wytrzymałość rośnie z 2 do 5 uderzeń. Z rozbitej skały czasem wypada prezent.
- Szybsze ryby (0,85 → 1,9), słabszy magnes (150 → 93), cel do 11 ryb i 4 krabów.

### Dodatki trybu normalnego
- **Punkty:** zwykła ryba 10, rybka-kulka i świecące 15, złota 50, **tęczowa** 100 (rzadka: 8% nowych ryb, szybka, bierze tylko z bliska), krab 25, **ryba-szef** 200. Punkty widać w odznace poziomu, a przy złowieniu wyskakuje „+50”.
- **Ryba-szef** (od poziomu 5): duża, z koroną, pływa przy dnie. Po braniu zaczyna się holowanie: trzymanie przycisku wędki (albo spacji, ↓ lub ↑) przyciąga rybę, ale napina żyłkę. Gdy ryba szarpie („Popuść!”), trzeba puścić. Zewnętrzny pierścień pokazuje napięcie, wewnętrzny postęp. Pełne napięcie zrywa żyłkę.
- **Armatka:** przycisk obok strzałek (klawisz F). Kula leci prosto od dzioba, kruszy pływającą skałę o 1 i płoszy rekiny tam, gdzie wpadnie do wody. Przerwa między strzałami to 1,1 s. Na lodzie armatki nie ma.
- **Gwiazdki 1–3:** pierwsza za ukończenie, druga za maks. 2 zerwane haczyki, trzecia za zmieszczenie się w limicie czasu. Ekran „Brawo!” pokazuje punkty, czas i haczyki, a niespełniony warunek jest przygaszony. Najlepszy wynik dla każdego poziomu zapisuje się w `rybki-stars-normal`, a suma jest widoczna na ekranie startowym.
- **Pogoda:** *sztorm* (poziomy 9 i 19): wysokie fale, łódkę znosi, deszcz i błyskawice z grzmotem. *Mgła* (poziomy 8 i 14): widać tylko okolicę łódki i haczyka.

### Nowe światy (tryb normalny)
- **Zima** (poziomy 6 i 16): jezioro pod lodem, łódka stoi na płozach. Zarzucić można tylko nad przeręblem. Gdzie go nie ma, wędka (albo klatka) rąbie lód, a 3 uderzenia dają nowy przerębel. Gdy haczyk jest w wodzie, łódka stoi. Nie ma pływających skał ani rekinów.
- **Rzeka** (poziomy 7 i 17): nurt znosi łódkę, haczyk (tym mocniej, im głębiej), ryby, liście i pływające skały. Na poziomie 17 nurt jest mocniejszy i płynie w przeciwną stronę.
- **Głębiny po ciemku** (poziomy 10 i 20): pod wodą jest ciemno. Światło dają latarnia łódki, lampka na haczyku, świecące ryby, meduzy i klatka.

### Rekiny
Motyw **„Zatoka rekinów”** (morski błękit, wysepki na horyzoncie, korale). Rekin jest przyjazny z wyglądu, uśmiecha się i patroluje wodę. Za krawędzią świata czeka kilka sekund, więc zdarzają się spokojne chwile.
- **Łatwy** (poziomy 14 i 19, 1–2 rekiny): rekin tylko płoszy ryby. Ryby blisko niego uciekają i nie biorą, więc trzeba chwilę poczekać. Niczego się nie traci.
- **Normalny** (od 9. poziomu 1–2 rekiny wszędzie, a w zatoce rekinów na poziomach 12 i 18 o dwa więcej): rekin, który zobaczy haczyk w wodzie, płynie do niego z otwartą paszczą (dźwięk „dun-dun”). Gdy go dopadnie, przegryza żyłkę: ryba ucieka, a rybak wiąże nowy haczyk, tak jak po skale. Przed rekinem można uciec, zwijając wędkę (↑). Po ugryzieniu rekin odpływa na 5 s. Na minimapie rekiny są szarymi trójkątami.

### Ekrany
- **Start:** napis „Rybki” z pochylonymi, falującymi literami, zielony przycisk „graj” (gra startuje po dotknięciu w dowolnym miejscu) i szklany pasek z podpowiedzią sterowania.
- **Gra:** szklany baner z numerem i nazwą poziomu przez ok. 2 s. Po ok. 8 s bez ruchu przycisk wędki pulsuje.
- **Koniec poziomu:** przyciemnienie, „Brawo!”, trzy wyskakujące gwiazdki (zawsze trzy), szklany panel ze złowionymi rybami i krabami, konfetti i zielony przycisk „dalej”. Rybak podskakuje w łódce.
- **Mistrz wędkarstwa:** po 5. poziomie: puchar ze złotą rybką, 5 medali i przycisk „zagraj od nowa”.

### Bonusy (plecak)
Bonusy to okrągłe szklane przyciski z koralowym licznikiem sztuk. Aktywny bonus ma jasny pierścień, który pokazuje, ile działania zostało.

| Bonus | Działanie |
|---|---|
| Zanęta | Rybak rzuca kulę zanęty. W wodzie powstaje chmurka okruszków, a ryby zbierają się wokół niej na 12 s. Haczyk w chmurce ma silniejszy magnes. |
| Magiczny robak | Przez 3 zarzucenia robak mieni się kolorami i przyciąga ryby z ponad 2× większej odległości. |
| Turbo motorek | Przez 10 s łódka płynie prawie 2× szybciej, z silniczkiem i pianą za rufą. |

Skąd się biorą bonusy:
- Na start każdego poziomu dziecko dostaje 1 zanętę.
- Co 16–26 s z nieba spada **prezent na spadochronie**. Trzeba do niego podpłynąć łódką.
- Przy zmianie poziomu nic nie przepada.

## 6. Etapy wdrożenia

1. Szkielet: `index.html`, pętla gry, skalowanie ekranu.
2. Scena: niebo, fale, dno, dekoracje, motywy dla 5 poziomów.
3. Łódka, rybak, wędka i sterowanie klawiaturą.
4. Haczyk i żyłka, ryby z AI pływania i brania.
5. Złowienie: animacja do licznika, nagrody, koniec poziomu i przejście dalej.
6. Sterowanie dotykiem: przyciski, dotknięcie wody i dna, multitouch, pełny ekran.
7. Dźwięki i muzyka, wyciszanie.
8. Bonusy, kraby i klatka.
9. Nowa szata graficzna z projektu.
10. Test: komputer, tablet i telefon w pionie i w poziomie (emulacja w przeglądarce).

## 7. Jak uruchomić

**Wersja online i offline:** https://jacekmoss.github.io/rybki/ (GitHub Pages z gałęzi `main`, repo `jacekmoss/rybki`).
- `sw.js` (service worker) zapisuje pliki gry w pamięci telefonu. Z internetem zawsze pobiera najnowszą wersję, bez internetu gra startuje z pamięci. Czcionka Outfit zapisuje się przy pierwszym uruchomieniu online.
- Każdy commit w tym folderze jest automatycznie wypychany na GitHuba (hook `.git/hooks/post-commit`), a Pages publikuje go po 1–2 min.
- Kopie zapasowe (`backup-*/`) nie trafiają do repozytorium.

- **Komputer:** dwuklik na `index.html`.
- **Tablet lub telefon:**
  - Najprościej wrzucić folder na dowolny hosting statyczny (np. GitHub Pages, Netlify Drop) i otworzyć link.
  - W domowej sieci: w folderze gry uruchom `python -m http.server 8000`, a na tablecie otwórz `http://<IP-komputera>:8000`.
  - Potem w przeglądarce wybierz „Dodaj do ekranu głównego”, a gra otworzy się jak aplikacja, na pełnym ekranie.

## 8. Pomysły na później
- Album złowionych ryb i krabów (kolekcja).
- Imię dziecka na łódce.
- Głos lektora („Brawo!”, „Złowiłeś rybkę!”).
- Więcej poziomów: zima z przeręblem, deszcz z tęczą.
