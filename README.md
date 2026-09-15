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

Production build:

```bash
npm run build
npm start
```

Open the same URL. Data never leaves the browser: clearing site data deletes movements, ideas, and piggy banks.

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
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — home screen icons
