# Deploy ExpnsTracker su Hostinger VPS

PWA statica servita da **Caddy** in Docker, con **HTTPS**. Account e dati restano SQLite nel browser.

Stesso schema Docker della VPS (come arteco/Gumbi), ma su **porte dedicate** così non collide con il sito su 80/443.

## Porte di default

| Ruolo | Host | Container |
|-------|------|-----------|
| HTTP (redirect / ACME) | **8088** | 80 |
| HTTPS | **3443** | 443 |

URL tipica: `https://<IP-VPS>:3443/`

Se ExpnsTracker è già su **HTTP :3003** (nginx), attiva solo il front TLS:

```bash
./deploy/enable-https-proxy.sh
# → https://<IP>:3443/  (proxy verso :3003)
```

## Requisiti VPS

- Docker Engine + Compose plugin
- Firewall Hostinger: apri **8088** e **8443** (TCP)
- Opzionale: record DNS A → IP VPS + `SITE_ADDRESS`/`ACME_EMAIL` per un certificato Let's Encrypt “verde”

## Avvio sulla VPS

```bash
cd /path/to/expnstracker
cp .env.example .env   # opzionale; i default bastano
# Con dominio:
#   SITE_ADDRESS=expnstracker.tuodominio.it
#   ACME_EMAIL=a.defendi@ddocuments.it
./deploy/deploy-hostinger.sh
```

Equivalente manuale:

```bash
HTTP_PORT=8088 HTTPS_PORT=8443 SITE_ADDRESS=:443 docker compose up -d --build
```

Senza dominio, Caddy espone comunque HTTPS (certificato locale: il browser può avvisare). Con dominio + porte 80/443 pubbliche tipicamente LE è più semplice; su sola 8443 usa DNS challenge o resta sul cert interno.

## Coesistenza con arteco

Arteco/Gumbi restano su 80/443. ExpnsTracker ascolta **8088/8443**. Cambia le porte in `.env` se 8088/8443 sono già occupate.
