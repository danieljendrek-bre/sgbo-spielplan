# SGBO Handball – automatischer Spielplan

Holt stündlich den kompletten Spielplan samt Ergebnissen von nuLiga (HVNB) und stellt ihn als `spiele.json` bereit.
Die Handball-Seiten lesen diese Datei; ist sie nicht erreichbar, zeigen sie automatisch die eingebauten Daten.

## Einrichtung (einmalig, ca. 10 Minuten, kostenlos)
1. Auf github.com ein Konto anlegen (falls noch keins vorhanden) und ein **neues Repository** erstellen, z. B. `sgbo-spielplan`, Sichtbarkeit **Public**.
2. Den **gesamten Inhalt dieses Ordners** hochladen (Add file → Upload files): `sync.js`, `README.md`, Ordner `docs`, Ordner `.github`.
   Wichtig: der Ordner `.github/workflows` mit `sync.yml` muss dabei sein. Er ist unter Windows versteckt. Falls er sich nicht hochladen lässt: im Repository **Add file → Create new file**, als Dateiname `.github/workflows/sync.yml` eintippen und den Inhalt der Datei `sync.yml` hineinkopieren.
3. Im Repository: **Settings → Pages** → „Deploy from a branch“ → Branch `main`, Ordner **/docs** → Save.
4. Im Repository: **Actions** → „Spielplan von nuLiga holen“ → **Run workflow** (einmal von Hand starten, danach läuft es stündlich allein).
5. Nach 1–2 Minuten ist die Datei erreichbar unter
   `https://DEIN-GITHUB-NAME.github.io/sgbo-spielplan/spiele.json`
   → diese Adresse schicke an mich (oder trage sie in den Seiten ein), dann zeigen die Handball-Seiten die Live-Daten.

## Wartung
- **Neue Saison:** in `sync.js` oben die Liste `TEAMS` anpassen (Meisterschaft und Gruppen-ID stehen in den nuLiga-Links der Mannschaftsseiten).
- GitHub schaltet geplante Läufe nach etwa 60 Tagen ohne Aktivität im Repository ab (z. B. in der Sommerpause). Dann unter Actions einmal „Enable workflow“ klicken.
- Schlägt nuLiga-Abruf teilweise fehl, bleiben für die betroffene Mannschaft die zuletzt gespeicherten Spiele erhalten.
- Es wird nur 1× pro Stunde mit kurzen Pausen abgerufen (10 Seiten) – bewusst schonend gegenüber nuLiga.
