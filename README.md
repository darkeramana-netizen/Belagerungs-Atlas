# ⚔️ Belagerungs-Atlas

Interaktive Analyse von 35 historischen und Fantasy-Festungen.

## Features
- 🏰 35 Burgen mit individuellen SVG-Grundrissen
- ⚔️ Belagerungssimulator mit 14 Ressourcentypen
- 🎭 Rollenspiel-Belagerung (KI als Verteidiger)
- 🌍 Weltkarte & Zeitstrahl
- 📊 Radar-Charts, Wertungsvergleich
- 🌀 „Was wäre wenn?"-Kontrafaktor-Analyse
- 🗡️ Turniermodus
- 📚 Historisches Lexikon

---

## 🚀 Schnellstart (lokal)

```bash
npm install
npm run dev
```
→ Öffnet automatisch http://localhost:3000

---

## 🌐 Deployment auf Vercel (kostenlos, empfohlen)

### Option A — Vercel CLI (2 Minuten)
```bash
npm install -g vercel
vercel
```
→ Folge den Anweisungen, du bekommst eine URL wie `belagerungs-atlas.vercel.app`

### Option B — GitHub + Vercel Dashboard
1. Push diesen Ordner zu GitHub
2. Geh zu https://vercel.com/new
3. "Import" → wähle dein Repository
4. Deploy klicken
5. Fertig — automatische Deployments bei jedem `git push`

---

## 🌐 Deployment auf Netlify (Alternative)

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

Oder: Geh zu https://netlify.com → "Deploy from GitHub"

---

## ⚠️ WICHTIG: Anthropic API Key

Die KI-Features (Belagerungsberater, Simulator, Rollenspiel, Was-wäre-wenn)
nutzen die Anthropic Claude API.

**Für die Production-App brauchst du einen eigenen API Key:**

1. Erstelle einen Account auf https://console.anthropic.com
2. Erstelle einen API Key
3. Bei Vercel: Settings → Environment Variables → `VITE_ANTHROPIC_KEY=sk-ant-...`

Dann in `src/App.jsx` alle API-Calls ändern:
```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
  "anthropic-version": "2023-06-01",
}
```

**HINWEIS:** Ohne eigenen Key nutzt die App den Claude.ai-eigenen Key
(funktioniert nur innerhalb von Claude.ai Artifacts).

---

## 📱 Als PWA (installierbar auf Handy)

Füge in `index.html` hinzu:
```html
<link rel="manifest" href="/manifest.json">
```

Erstelle `public/manifest.json`:
```json
{
  "name": "Belagerungs-Atlas",
  "short_name": "Burgen",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#060504",
  "theme_color": "#060504",
  "icons": [{"src": "/icon.png", "sizes": "512x512", "type": "image/png"}]
}
```

---

## 🏗️ Projektstruktur

```
belagerungs-atlas/
├── src/
│   ├── App.jsx      ← Hauptkomponente (alle 35 Burgen + Logik)
│   └── main.jsx     ← React Entry Point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 📦 Build für Production

```bash
npm run build
```
Erstellt optimierten `dist/`-Ordner zum Hosten auf jedem Webserver.
