# Vercel Deployment (Frontend)

This guide covers deploying the **GovBid frontend** on Vercel. The backend API should be deployed separately (Render, Fly.io, AWS, etc.) and exposed via a public URL that the frontend can call.

## Prerequisites

- A Vercel account
- Access to the GitHub repo
- A deployed backend API with a public base URL (e.g., `https://api.govbid.ai`)

## Quick Start (Vercel UI)

1. **Import the GitHub repo** in Vercel.
2. In **Project Settings → General → Root Directory**, set it to:
   ```
   frontend
   ```
3. In **Project Settings → Build & Output Settings**:
   - **Framework Preset:** Vite
   - **Install Command:** `pnpm install`
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`

## Environment Variables (Frontend)

Add the following in **Project Settings → Environment Variables**:

| Variable | Example | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://api.govbid.ai` | Base URL for the backend API |
| `VITE_WS_BASE_URL` | `wss://api.govbid.ai` | Optional: websocket base URL |

> If you haven’t deployed the API yet, you can temporarily set `VITE_API_BASE_URL` to your staging endpoint and update it later.

## Deploy

Click **Deploy**. Once it finishes, Vercel will provide a URL like:

```
https://your-project.vercel.app
```

## Notes

- Vercel is ideal for hosting the frontend. The backend Express API should run on a separate service.
- If you later add a custom domain, update DNS in Vercel and keep `VITE_API_BASE_URL` pointed at your API domain.
