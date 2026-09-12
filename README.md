# PropelX

Rocket stage builder by Salus-U research labs. Browser-based interactive sandbox that lets a user assemble a multi-stage launch vehicle, specify a payload and destination, and see whether the design can physically reach orbit.

See [Product Specification](Product%20Specification%20—%20Rocket%20Stage%20B.md) and [PLAN.md](PLAN.md).

## Quickstart

```bash
pnpm install
pnpm -r build
pnpm -r test
```

Requires Node 20+ and pnpm 9+.

## Repo layout

```
packages/engine       @propelx/engine   — pure TS physics engine (M1)
packages/web          @propelx/web      — React SPA (M2+)
packages/proxy        @propelx/proxy    — Together.ai proxy (M11)
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `TOGETHER_AI_API_KEY` — server-side only. Never expose via `VITE_*`.
- `TOGETHER_MODEL` — optional model override.
- `WHITELABEL` — white-label owner name (default: `BlueDrop, LLC`).
- `WL_PRODUCT` — product name + wordmark color scheme.
- `PRODUCT_VERSION` — version banner text.

## License

© 2026 BlueDrop, LLC. All rights reserved.
