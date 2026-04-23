# Sourceframe (learn-chat)

RAG-style document Q&A: connect a Google account, index Google Docs / Word files into **Pinecone**, and ask questions with context retrieved from your workspace. Includes a small **React (Vite)** UI in `client/` and an **Express** API in `server/`.

---

## Repository layout

| Path | Role |
|------|------|
| `server/` | REST API, Google OAuth callback, embeddings, Pinecone upserts |
| `client/` | React SPA: Google connect, doc list, workspace-aware indexing, RAG ask, file upload |

---

## Prerequisites

- **Node.js** (18+ recommended; Vite dev server may warn on older versions)
- **Redis** (OAuth tokens are stored under `google:token:20` by default)
- **Pinecone** index (name must match `PINECONE_DB`; vectors must match your embedding model dimension)
- **Google Cloud** project: OAuth client (web) + optional service account JSON for Drive/Docs features that use `GoogleAuth`
- **Ollama**
  - **Embeddings** (`server/src/services/embedding.service.js`): currently calls **local** `http://localhost:11434/api/embeddings` with model `nomic-embed-text` — run Ollama locally and `ollama pull nomic-embed-text` (or change the code to use cloud embeds).
  - **Chat** (`ask.controller.js`): uses `OLLAME_BASE_URL` and `OLLAME_API_KEY` (e.g. Ollama Cloud).

---

## Run the backend

From the repository root:

```bash
cd server
yarn install
```

Create **`server/.env`** (see [Environment variables](#environment-variables)). Place the Google service account JSON file where `GOOGLE__SECRET_JSON` points (path is relative to `server/` cwd when the process runs).

Start the API:

```bash
yarn dev
# or: yarn start
```

The server listens on **port 5001** (fixed in `server/server.js`).

---

## Run the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The dev server runs on **http://localhost:5173** and proxies **`/api`** to **http://localhost:5001** (`client/vite.config.js`).

**Production build** (no dev proxy): set the API origin when building:

```bash
cd client
VITE_API_BASE=http://localhost:5001 npm run build
```

Serve the `client/dist` output from your static host. Set **`FRONTEND_URL`** on the server to that exact origin so Google OAuth redirects back to your app after sign-in.

---

## Google OAuth

1. In Google Cloud Console, create an OAuth **Web** client.
2. Add an authorized **redirect URI**:  
   `http://localhost:5001/api/auth/google/callback`  
   (must match `server/src/config/google.auth.js` and the auth controller.)
3. Put **Client ID** and **Client secret** in `.env` as `GOOGLE_DOCS_CLIEND_ID` / `GOOGLE_DOCS_CLIENT_SECRET` (names match the current codebase).

After login, the server redirects the browser to **`FRONTEND_URL`** (default `http://localhost:5173`) with `?google=connected` or `?google=error`.

**Check link status:** `GET /api/auth/google-status` returns `{ "connected": true | false }` based on Redis token presence (no tokens in the response).

---

## Environment variables

Create **`server/.env`** with at least:

| Variable | Purpose |
|----------|---------|
| `REDIS_HOST` | Redis connection string, e.g. `localhost:6379` |
| `PINACONE_DB_LINK` | Pinecone API key (variable name as used in code) |
| `PINECONE_DB` | Pinecone index name |
| `GOOGLE_DOCS_CLIEND_ID` | Google OAuth web client ID |
| `GOOGLE_DOCS_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE__SECRET_JSON` | Filename/path to service account JSON (for service-account–backed Google APIs) |
| `OLLAME_BASE_URL` | Ollama host for **chat** (e.g. `https://ollama.com`) |
| `OLLAME_API_KEY` | Bearer token for Ollama Cloud chat |
| `FRONTEND_URL` | Optional. Post-OAuth redirect target (default `http://localhost:5173`) |

Optional / model tuning (if you add or wire them in code):

- Embedding model for local Ollama is currently hardcoded in `embedding.service.js`; adjust there if you use another model or host.

---

## HTTP API (overview)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/auth/google-status` | Whether Google tokens exist in Redis |
| GET | `/api/auth/google-redirect` | JSON `{ url }` to start OAuth |
| GET | `/api/auth/google/callback` | OAuth redirect (browser only) |
| GET | `/api/documents/user-docs` | Lists user’s Docs/DOCX via OAuth |
| POST | `/api/documents/embed-google-doc` | Body: `id`, `mimeType`, `name`, **`workspaceId`** (required) |
| POST | `/api/documents/upload` | Multipart field `file` |
| GET | `/api/documents/google-docs` | Service-account–based listing (separate from user OAuth) |
| POST | `/api/cloud/ask` | Body: `question`, `workspaceId` (must match indexed workspace) |
| POST | `/api/webhook/google-webhook` | Drive push notifications (configure channel address in code) |

---

## Workspace IDs

Indexing sends **`workspaceId`** to `/api/documents/embed-google-doc`; chunks are stored in Pinecone metadata with that value. **Ask** must use the **same** `workspaceId` so filters match. The UI prompts for workspace when indexing and syncs the Ask form after success.

---

## Troubleshooting

- **OAuth loop / wrong app after login:** `FRONTEND_URL` must match the URL where you open the React app.
- **401 / permission errors on Drive or Docs:** User flows use OAuth tokens in Redis; service-account flows use the JSON key. Do not mix them for the same operation unless the code path explicitly uses OAuth (see `external.source.doc.js` for embed-by-id).
- **Embedding connection refused:** Start local Ollama on **11434** or change `embedding.service.js` to your embedding endpoint.
- **Pinecone dimension errors:** Index dimension must match the embedding model output.

---

## Features (summary)

- Google OAuth 2.0 and optional connection status
- Google Docs / DOCX listing and per-document indexing with workspace scoping
- Chunking, embeddings, Pinecone upsert, RAG-style ask via Ollama
- File upload ingestion endpoint
- React UI: **Sourceframe** branding, indexing modal, Google status pill
