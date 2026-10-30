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

- `/#/` offers equal Send and Receive actions with distinct icons.
- `/#/send` starts with side-by-side text and file panels. Entering a payload
  expands its panel and collapses the other. Multiple files are packed as a ZIP.
  The original result layout includes a selectable download command code block.
- `/#/retrieve` uses a single input and an always-visible numeric keypad. ABC
  switches to uppercase letters with a number row, and 123 switches back.
  Share links prefill the field and retrieval requires explicit submission.
  Older `/#/?code=...` links redirect here.
- The public footer opens the transfer history side drawer. It shows both types
  of transfer newest first, with records stored in the current tab until refresh.

The original admin routes remain available at `/#/admin`.

See [蜂巢 UI 产品说明](FENGCHAO_PRODUCT.md) for the experience walkthrough and redesign discussion.

See [UPSTREAM.md](UPSTREAM.md) for the source revision.
