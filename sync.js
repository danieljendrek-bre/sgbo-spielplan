// SGBO Handball – Spielplan-Sync
// Liest die öffentlichen nuLiga-Gruppenseiten (komplette Saison inkl. Ergebnisse) und schreibt docs/spiele.json.
// Läuft ohne Abhängigkeiten mit Node 18+ (lokal: `node sync.js`, automatisch: GitHub Actions).
const fs = require('fs'), path = require('path');
const BASE = 'https://hvnb-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/';
const UA = 'SGBO-Spielplan-Sync/1.0 (Vereinswebseite sgbo.de; Kontakt: handball-leitung@sgbo.de)';
const OUT = path.join(__dirname, 'docs', 'spiele.json');

// Mannschaft -> nuLiga-Gruppe (Saison 2026/27). Neue Saison: hier Gruppen-IDs und Meisterschaft ergänzen.
const TEAMS = [
  { team: '1. Herren', champ: 'HVNB 26/27', group: 489136, league: 'Oberliga Männer Nord' },
  { team: '2. Herren', champ: 'HRBN 26/27', group: 489647, league: 'Regionsoberliga Männer Süd' },
  { team: '3. Herren', champ: 'HRBN 26/27', group: 489939, league: 'Regionsliga Männer Süd' },
  { team: '1. Damen', champ: 'HRBN 26/27', group: 489358, league: 'Regionsoberliga Frauen Süd' },
  { team: '2. Damen', champ: 'HRBN 26/27', group: 489628, league: 'Regionsliga Frauen Süd' },
  { team: 'Weibliche C-Jugend', champ: 'HRBN 26/27', group: 489796, league: 'Regionsoberliga wJC' },
  { team: 'Weibliche D-Jugend', champ: 'HRBN 26/27', group: 489570, league: 'Regionsliga wJD' },
  { team: 'Weibliche E-Jugend', champ: 'HRBN 26/27', group: 506401, league: 'Regionsklasse wJE' },
  { team: 'Männliche D-Jugend', champ: 'HRBN 26/27', group: 489353, league: 'Regionsklasse mJD' },
  { team: 'Männliche E-Jugend', champ: 'HRBN 26/27', group: 506381, league: 'Regionsklasse mJE' },
];

const dec = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü').replace(/&szlig;/g, 'ß').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();
const txt = h => dec(h.replace(/<[^>]+>/g, ' '));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function parse(html) {
  const out = []; let date = '';
  for (const t of html.split(/<table/i).slice(1)) {
    if (!/Heimmannschaft/.test(t)) continue;
    const rows = t.split(/<tr/i).slice(1).map(tr => [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => txt(m[1])));
    const hi = rows.findIndex(r => r.some(c => /Heimmannschaft/.test(c))); if (hi < 0) continue;
    const H = rows[hi]; const idx = n => H.findIndex(c => new RegExp(n, 'i').test(c));
    const col = { t: idx('^Zeit'), home: idx('Heimmannschaft'), away: idx('Gastmannschaft'), nr: idx('^Nr'), ort: idx('^(Ort|Halle)') };
    for (const c of rows.slice(hi + 1)) {
      if (c.length < 6) continue; const off = H.length - c.length; const g = i => (i >= 0 && i - off >= 0) ? c[i - off] : '';
      const di = c.findIndex(x => /^\d{2}\.\d{2}\.\d{4}$/.test(x)); if (di >= 0) date = c[di];
      const time = g(col.t), home = g(col.home), away = g(col.away), res = g(col.away + 1);
      if (!/^\d{1,2}:\d{2}$/.test(time) || !home || !away || /spielfrei/i.test(home + away) || !date) continue;
      const [dd, mm, yy] = date.split('.');
      out.push({ d: `${yy}-${mm}-${dd}`, t: time.padStart(5, '0'), h: home, a: away, v: g(col.ort), nr: g(col.nr), res: /^\d+:\d+$/.test(res) ? res : '' });
    }
  }
  return out;
}

async function main() {
  const games = []; const errors = [];
  for (const T of TEAMS) {
    const url = BASE + 'groupPage?championship=' + encodeURIComponent(T.champ).replace(/%20/g, '+') + '&displayDetail=meetings&displayTyp=gesamt&group=' + T.group;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const mine = parse(await r.text()).filter(x => /^SG Bremen-Ost/.test(x.h) || /^SG Bremen-Ost/.test(x.a));
      if (!mine.length) throw new Error('keine Spiele gefunden (Seitenaufbau geändert oder Saison noch leer?)');
      mine.forEach(x => games.push(Object.assign({}, x, { team: T.team, league: T.league })));
      console.log(T.team.padEnd(20), mine.length, 'Spiele,', mine.filter(x => x.res).length, 'mit Ergebnis');
    } catch (e) { errors.push(T.team + ': ' + e.message); console.error('FEHLER', T.team, e.message) }
    await sleep(700); // schonend gegenüber nuLiga
  }
  // Schutz: bei Teilausfall alte Daten dieser Mannschaften behalten
  let old = []; try { old = JSON.parse(fs.readFileSync(OUT, 'utf8')).games || [] } catch (e) { }
  const failed = new Set(errors.map(e => e.split(':')[0]));
  old.filter(g => failed.has(g.team)).forEach(g => games.push(g));
  if (games.length < 20) { console.error('Zu wenige Spiele (' + games.length + ') – Datei bleibt unverändert.'); process.exit(1) }
  games.sort((a, b) => (a.d + a.t + a.team).localeCompare(b.d + b.t + b.team));
  const prev = (() => { try { return fs.readFileSync(OUT, 'utf8') } catch (e) { return '' } })();
  const body = { updated: new Date().toISOString(), source: 'nuLiga / HVNB', games };
  const strip = s => s.replace(/"updated":"[^"]*",?/, '');
  if (prev && strip(prev) === strip(JSON.stringify(body))) { console.log('Keine Änderungen.'); return }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(body));
  console.log('Geschrieben:', games.length, 'Spiele ->', OUT); if (errors.length) console.log('Teilfehler:', errors.join(' | '));
}
main().catch(e => { console.error(e); process.exit(1) });
