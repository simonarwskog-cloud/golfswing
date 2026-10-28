# GolfSwing

Filma din golfsving och få tips direkt. Appen hittar kroppens leder i videon med AI (Google MediaPipe),
mäter svingen och säger vad du ska träna på – med enkla ord och en övning steg för steg.

## Starta appen på datorn

1. Högerklicka på `serve.ps1` och välj **Kör med PowerShell**.
2. Öppna http://localhost:5173 i webbläsaren.

## Vad appen kan (version 1)

- **Filma eller välj video** – analysen görs direkt i mobilen/datorn, inget laddas upp.
- **Svingens faser** – uppställning, toppen, träffen och avslut hittas automatiskt.
- **Skelett och svingbana** ritas ovanpå videon (gul = på väg upp, blå = på väg ner).
- **Perfekt sving bredvid din video** – en skissad gubbe i samma vinkel, storlek och plats som du. Han träffar
  bollen samtidigt som du, men med perfekt tempo (3 : 1). Spela, slowmotion eller hoppa till en del av svingen.
- **Det här ska du ändra** – steg för steg med enkla ord, viktigast först, med en knapp som visar skillnaden mot gubben.
- **Klubbhuvudets bana** – appen letar efter det som rör sig en klubblängd från händerna. Syns klubban inte tydligt visas händernas bana.
- **Gubben ovanpå din video** – genomskinlig och grön, i samma storlek och läge som du.
- **Hastighetsspak och loop** – bestäm själv hur fort svingen spelas.
- **Framifrån:** tempo, huvudets rörelse, höfter som glider, viktförflyttning.
- **Bakifrån:** tempo, hållning, att resa sig/höfter mot bollen, svingbana (utifrån/inifrån).
- **AI-tränare** som följer din utveckling, **träningsplan** med övningar och **jämförelse med proffsnivå**.
- Tre nivåer (ny, spelar ibland, erfaren) som styr hur mycket detaljer som visas.

## Filer

| Fil | Vad den gör |
| --- | --- |
| `index.html`, `css/style.css` | Skärmarna och utseendet |
| `js/app.js` | Kopplar ihop allt: navigering, analys, resultat |
| `js/pose.js` | Hittar kroppens leder i varje bildruta |
| `js/analysis.js` | Hittar svingens faser och mäter fel |
| `js/coach.js` | Alla texter: fel, beröm, övningar, tränarens meddelanden |
| `js/draw.js` | Ritar skelett och svingbana |
| `js/model.js` | Gubben med perfekt sving (3D-figur som ritas framifrån eller bakifrån) |
| `js/club.js` | Följer klubbhuvudet i videon |
| `js/store.js` | Sparar historik och träning i telefonen |
| `make-icons.ps1` | Ritar appikonen som PNG |
