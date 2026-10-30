# FileCodeBox frontend

The local Vue 3 / TypeScript frontend builds the **Fengchao** (丰巢) theme at
`themes/fengchao`. The official `2023` and `2024` themes remain available.
Docker builds this directory using its lockfile, without fetching or executing
an upstream frontend repository.

## Development

Requires Node.js 24 LTS and npm. Start the FastAPI backend on port
12345, then run:

```sh
cd frontend
npm ci --ignore-scripts
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies API requests to
http://127.0.0.1:12345. Configure the backend with its normal `/setup` flow before
using uploads. Production requests use the same origin as the application.

## Validation and build

```sh
npm test
npm run build
```

The build checks architecture boundaries and TypeScript, then writes assets to
`../themes/fengchao/`, which FastAPI serves. Build output and node_modules are ignored.

## Deployment

Docker is the only deployment prerequisite. From the repository root:

```sh
docker compose up -d --build
```

Open `http://SERVER_IP:12345`. The image uses the fixed official FileCodeBox
backend, builds Fengchao locally, and applies the dependency security fixes.
GitHub Actions, Docker Hub accounts and registry credentials are not required.

The existing data volume is retained. For an existing installation, select
**Fengchao** once in system settings. New installations select it by default.
The official 2023 and 2024 themes remain available for switching back.

After changing the UI, run the same command again to rebuild and restart.
No backend source is replaced. The small `fengchao.py` adapter only registers
the separately named theme in the official backend's predefined theme list.

Docker excludes `.env*` files. For a separate public API origin, pass
`--build-arg VITE_API_BASE_URL_PROD=https://files.example.com` to `docker build`.

## Public routes

- `/#/`: equal Send and Receive actions.
- `/#/send`: text and files start side by side; entering text or selecting files
  expands that area. Emptying the payload restores both areas. Multiple files
  are packed as a ZIP, with duplicate filenames preserved using suffixes.
- `/#/retrieve`: a shared code field with an on-page numeric keypad, native
  typing and paste. Retrieval requires explicit submission; errors retain the
  entered code for retry.
- Existing `/#/?code=...` links redirect to the new retrieval route.

Leaving a transfer page clears its draft, errors, open dialogs, and pending
requests. Completed transfer history remains available in the history drawer.
The original admin routes remain available at `/#/admin`.

See [UPSTREAM.md](UPSTREAM.md) for the source revision.
