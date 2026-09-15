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

Stesso schema di [arteco-srl](https://github.com/adefendi14/arteco-srl): push su `main` → GitHub Actions builda il sito statico → `peaceiris/actions-gh-pages` pubblica il ramo `gh-pages`.

1. Crea il repository GitHub (account `adefendi14`, nome consigliato `expnstracker`) e carica questo progetto.
2. Il workflow `.github/workflows/deploy.yml` parte da solo sul push a `main`.
3. Nel repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch `gh-pages` / folder `/ (root)`**.
4. L’indirizzo sarà `https://adefendi14.github.io/expnstracker/` (o `https://adefendi14.github.io/<nome-repo>/` se il repo ha un altro nome).

Il `basePath` viene calcolato da solo dal nome del repository (`GITHUB_REPOSITORY`), come `/arteco-srl/` in Vite. Per forzarlo imposta `PAGES_BASE_PATH` nel job di build.

I dati restano nel LocalStorage del browser. GitHub Pages non vede debiti, spese o salvadanai.

Per provare in locale la stessa build di Pages:

```bash
GITHUB_PAGES=true GITHUB_REPOSITORY=adefendi14/expnstracker npm run build
npm start
```

Poi apri `http://127.0.0.1:4317/expnstracker/`.

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
- `.github/workflows/deploy.yml` — static export to the `gh-pages` branch (same pattern as arteco-srl)
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — home screen icons
