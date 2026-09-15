# ExpnsTracker

Personal PWA for debts, credits, expenses, savings goals, and investment ideas. The interface is Italian, amounts are in euro, and everything is stored in LocalStorage on the device. No account, no backend.

Stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:4317](http://127.0.0.1:4317).

Production (static export, same as GitHub Pages):

```bash
npm run build
npm start
```

Open the same URL. Data never leaves the browser: clearing site data deletes movements, ideas, and piggy banks.

## Pubblica su GitHub Pages

L’app è un sito statico. Un workflow GitHub Actions la pubblica su Pages a ogni push.

1. Crea un repository GitHub e carica questo progetto.
2. Nel repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Fai push (o lancia a mano **Actions → Deploy to GitHub Pages → Run workflow**).
4. L’indirizzo sarà:
   - sito progetto: `https://<utente>.github.io/<nome-repo>/`
   - sito utente (`<utente>.github.io`): `https://<utente>.github.io/`

Il `basePath` viene calcolato da solo dal nome del repository. Per forzarlo imposta `PAGES_BASE_PATH` nel job di build (lascialo vuoto per un sito in root, oppure usa ad esempio `/docs`).

La prima pubblicazione può chiedere di approvare l’ambiente **github-pages** nella scheda Actions.

I dati restano nel LocalStorage del browser. GitHub Pages non vede debiti, spese o salvadanai. Ogni dispositivo (e ogni origine) ha i propri dati.

Per provare in locale la stessa build di Pages:

```bash
GITHUB_PAGES=true GITHUB_REPOSITORY=tuoutente/tuorepo npm run build
npm start
```

Poi apri `http://127.0.0.1:4317/tuorepo/`.

## Install on iPhone (Safari → Aggiungi a Home)

Use Safari (Chrome on iOS cannot install a standalone PWA).

1. Open the ExpnsTracker URL in Safari.
2. Tap **Condividi** (the square with the arrow, bottom center).
3. Scroll and tap **Aggiungi a Home**.
4. Confirm the name **ExpnsTracker** and tap **Aggiungi**.
5. Open the new Home Screen icon. The app runs standalone, without Safari chrome.

On a Mac or Windows desktop, Chrome or Edge can also install it from the address bar (Install app / Installa app).

## What you can do

- **Riepilogo**: estimated balance (piggy banks + open credits − open debts), open debt/credit totals, combined savings progress.
- **Aggiungi**: one form with tabs for Debito/Credito, Spesa, and Idea di investimento.
- **Salvadanai**: create euro targets, add or withdraw funds, see `450€ / 1000€ — 45%`.
- **Elenco**: browse, search, filter, edit, settle debts, complete ideas, delete items.

## Project layout

- `src/app` — routes, PWA manifest, metadata, error/loading states
- `src/components` — shell, dashboard, forms, lists
- `src/lib/store.tsx` — LocalStorage persistence
- `.github/workflows/pages.yml` — static export and deploy to GitHub Pages
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — home screen icons
