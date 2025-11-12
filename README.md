# AI Playground

Live app: https://ai-playground-web.onrender.com

A minimal full-stack chat demo using:
- Backend: Node.js + Express with OpenAI SDK
- Frontend: React (Vite)
- Deployment: Render (API as Web Service via Docker, Client as Static Site)

## Monorepo structure

- `/index.js` — Express API
- `/client` — React app (Vite)
- `/client-ng` — Alternative Angular client (not deployed)
- `/render.yaml` — Render blueprint that provisions both services
- `/Dockerfile` — API service container
- `/.dockerignore` — Docker build context excludes

## Environment variables

Server (API web service):
- `OPENAI_API_KEY` — required
- `ORIGIN_ALLOWLIST` — comma-separated origins allowed by CORS. Example:
  - `https://ai-playground-web.onrender.com`
- `SERVER_API_KEY` — optional shared secret. If set, requests must include header `Authorization: Bearer <SERVER_API_KEY>`

Client (Static Site):
- `VITE_API_BASE_URL` — API base URL used at build time. Example:
  - `https://ai-playground-api.onrender.com`
- `VITE_SERVER_API_KEY` — only if API enforces `SERVER_API_KEY` (see note above)

## Local development

1) Server
```
# from repo root
cp .env.example .env
# set OPENAI_API_KEY in .env
npm install
npm start
# server listens on PORT (default 3001)
```

2) React client
```
# in another terminal
cd client
npm install
npm run dev
# opens http://localhost:5173
```

By default, the client streams from `http://localhost:3001/api/chat/stream` via `window.location.origin` fallback, or you can set `VITE_API_BASE_URL` when building.

## Deployment (Render)

This repo ships with a Render blueprint.

- API (web service):
  - Uses `Dockerfile` at repo root
  - Set env vars in the Render dashboard: `OPENAI_API_KEY`, `ORIGIN_ALLOWLIST` (and optionally `SERVER_API_KEY`)

- Client (static site):
  - `buildCommand: cd client && npm ci && npm run build`
  - `staticPublishPath: client/dist`
  - Set `VITE_API_BASE_URL` to the API service URL (e.g., `https://ai-playground-api.onrender.com`)

Steps:
1. Push the repo to GitHub
2. Render → New → Blueprint → select the repo
3. During creation, add `OPENAI_API_KEY` to the API service
4. After both services are created:
   - Confirm the static site URL and add it to `ORIGIN_ALLOWLIST` on the API service
   - If you enforce `SERVER_API_KEY`, set the same value in the client as `VITE_SERVER_API_KEY` and rebuild the static site

## Troubleshooting

- 401 Unauthorized from `/api/chat/stream`:
  - Either remove `SERVER_API_KEY` from the API service, or add matching `VITE_SERVER_API_KEY` to the client and redeploy the static site
- CORS blocked:
  - Ensure the API `ORIGIN_ALLOWLIST` exactly contains your static site URL (including scheme and hostname)
- Requests blocked by rate limiter / IP detection warnings:
  - The server sets `app.set('trust proxy', 1)` to work behind Render’s proxy. Make sure you redeployed the API after changes
- Stale client env values:
  - On the Static Site, Clear build cache, then Manual Deploy

## Security notes

- Never commit real API keys. Use Render dashboard env vars
- If exposing the API publicly, consider keeping `SERVER_API_KEY` disabled for browser clients or implement a proper auth layer

## License

MIT
