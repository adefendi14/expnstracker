# Static ExpnsTracker PWA for VPS (root basePath — no GitHub Pages prefix).
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Omit GITHUB_PAGES so assets are served from /
RUN npm run build

FROM caddy:2.9-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/out /srv

EXPOSE 80 443
