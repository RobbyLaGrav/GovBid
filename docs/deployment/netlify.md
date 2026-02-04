# Netlify Deployment (Frontend)

This guide covers deploying the **GovBid frontend** on Netlify. The backend API should be deployed separately (Render, Fly.io, AWS, etc.) and exposed via a public URL that the frontend can call.

Netlify is a great fit for the frontend because it serves static assets built by Vite. The backend is an Express API that requires a long-running server, which Netlify does **not** provide unless you re-architect the backend into Netlify Functions.

## Prerequisites

- A Netlify account
- Access to the GitHub repo
- A deployed backend API with a public base URL (e.g., `https://api.govbid.ai`)

## Quick Start (Netlify UI)

1. **Import the GitHub repo** in Netlify.
2. In **Site settings → Build & deploy → Continuous Deployment**:
   - **Base directory:** `frontend`
   - **Build command:** `pnpm build`
   - **Publish directory:** `dist`
3. In **Site settings → Build & deploy → Environment** add the required variables (see below).

## Environment Variables (Frontend)

Add the following in **Site settings → Environment**:

| Variable | Example | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://api.govbid.ai` | Base URL for the backend API |
| `VITE_WS_BASE_URL` | `wss://api.govbid.ai` | Optional: websocket base URL |

> If you haven’t deployed the API yet, you can temporarily set `VITE_API_BASE_URL` to your staging endpoint and update it later.

## SPA Routing

To support client-side routing in Vite, add a Netlify `_redirects` file under `frontend/public/_redirects`:

```
/* /index.html 200
```

This ensures that refreshing routes like `/contracts/123` works in production.

## Deploy

Click **Deploy site**. Once it finishes, Netlify will provide a URL like:

```
https://your-site.netlify.app
```

## Notes

- Netlify hosts the frontend only; the backend must run elsewhere.
- If you later add a custom domain, update DNS in Netlify and keep `VITE_API_BASE_URL` pointed at your API domain.
