# ExpnsTracker

Personal PWA for debts, credits, expenses, savings goals, and investment ideas. The interface is Italian, amounts are in euro.

Accounts are local (register / login). All data lives in a SQLite file on the device (`expnstracker.sqlite`), kept in the browser and exportable. No cloud, no backend.

Stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, sql.js.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:4317](http://127.0.0.1:4317). Create an account on first open. Each account only sees its own movements.

`next dev` does not register the service worker (so hot reload stays intact). Use `npm run build` and `npm start` to try the installed/offline PWA.

Production (static export, same as GitHub Pages):

```bash
npm run build
npm start
```

Open the same URL. Clearing site data deletes the SQLite file. Use **Esporta file** to keep a copy of `expnstracker.sqlite`.

If you still have the old LocalStorage dump, the first account created on that browser imports it automatically.

## Pubblica su GitHub Pages

Stesso schema di [arteco-srl](https://github.com/adefendi14/arteco-srl): push su `main` → GitHub Actions builda il sito statico → `peaceiris/actions-gh-pages` pubblica il ramo `gh-pages`.

1. Crea il repository GitHub (account `adefendi14`, nome consigliato `expnstracker`) e carica questo progetto.
2. Il workflow `.github/workflows/deploy.yml` parte da solo sul push a `main`.
3. Nel repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch `gh-pages` / folder `/ (root)`**.
4. L’indirizzo sarà `https://adefendi14.github.io/expnstracker/` (o `https://adefendi14.github.io/<nome-repo>/` se il repo ha un altro nome).

Il `basePath` viene calcolato da solo dal nome del repository (`GITHUB_REPOSITORY`), come `/arteco-srl/` in Vite. Per forzarlo imposta `PAGES_BASE_PATH` nel job di build.

Account e database restano nel browser di chi apre il sito. GitHub Pages non vede password, debiti o salvadanai.

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

To **import a database** from the Home Screen app: tap **Importa database**, then in Files go to the folder where you saved `expnstracker.sqlite` (often **Browse → Chrome** or **Download**) and tap the file. It stays selectable even if iOS shows a generic document icon instead of SQLite.

On a Mac or Windows desktop, Chrome or Edge can also install it from the address bar (Install app / Installa app).

## Come aprire l’app offline (iPhone)

La prima visita serve internet. Poi Home / Aggiungi a Home apre Riepilogo anche in modalità Aereo.

1. Apri ExpnsTracker **con rete** (Safari o l’icona Home) e aspetta che compaia il riepilogo o l’accesso. Lascia la pagina aperta qualche secondo, così l’app si salva sul telefono.
2. Metti il telefono in **modalità Aereo**.
3. Chiudi Safari/l’app e riapri **ExpnsTracker dalla Home**. Deve aprirsi Riepilogo (o Accedi), non la pagina di errore di Safari.

`next dev` non registra il service worker. Per la stessa build di GitHub Pages: `GITHUB_PAGES=true GITHUB_REPOSITORY=adefendi14/expnstracker npm run build` poi `npm start`.

## What you can do

- **Account**: create users, log in, log out. Passwords are hashed with PBKDF2 on the device.
- **File SQLite**: export / import `expnstracker.sqlite` to move the whole database (all accounts) between browsers. On iPhone, Files used to grey out `.sqlite` because it is not a known type; import now accepts any file and checks the SQLite header.
- **Riepilogo**: estimated balance (open credits − open debts only). Piggy banks are separate goal trackers.
- **Aggiungi**: one form with tabs for Debito/Credito, Spesa, and Idea di investimento.
- **Salvadanai**: create euro targets, add or withdraw funds, see `450€ / 1000€ — 45%`.
- **Elenco**: browse, search, filter, edit, settle debts, complete ideas, delete items.

## Project layout

- `src/app` — routes, PWA manifest, metadata, error/loading states
- `src/components` — shell, dashboard, forms, lists, login
- `src/lib/sqlite.ts` — SQLite file (sql.js) persisted in IndexedDB
- `src/lib/store.tsx` — accounts and per-user queries
- `.github/workflows/deploy.yml` — static export to the `gh-pages` branch (same pattern as arteco-srl)
- `public/sql-wasm.wasm` — SQLite engine
- `public/logo.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — salvadanaio app mark (PWA / Home Screen)
- `scripts/generate-sw.mjs` — writes `out/sw.js` with a precache of the static export
- `public/offline.html` — Italian fallback if a page is not in the cache
