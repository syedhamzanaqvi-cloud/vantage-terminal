# Vantage Terminal — Demo Trading Platform

A fake-money trading terminal. Live crypto prices (CoinGecko), FX pairs anchored
to real reference rates (Frankfurter/ECB) with a simulated live tick layer,
a chart, buy/sell, and a persistent account (balance, positions, trade history
saved server-side in `server/data.json`).

No real money moves. No broker license or liquidity provider needed, because
nothing here touches real funds.

## Structure

- `server/` — Express API. Holds the price feed, the order engine, and the
  account state. Also serves the built frontend in production.
- `client/` — React app (Vite). The trading UI.

## Run it locally

Requires Node.js 18 or newer.

```
npm run install:all
cd server && npm start
```

In a second terminal, for live-reloading frontend development:

```
cd client && npm run dev
```

Visit `http://localhost:5173` in dev, or `http://localhost:4000` once you've
run `npm run build` and started the server alone (it serves the built client).

## Deploy it for free — step by step

The simplest path for a first deployment is **Render** (render.com). It hosts
Node apps for free, builds from GitHub automatically, and needs no credit card
for this tier.

1. **Put the code on GitHub.**
   - Create a free GitHub account if you don't have one.
   - Create a new repository, e.g. `vantage-terminal`.
   - Upload this whole `trading-app` folder to it (GitHub's web uploader
     works fine for this, or `git push` if you're comfortable with git).

2. **Create a Render account** at render.com and sign in with GitHub.

3. **New Web Service** → connect your `vantage-terminal` repository.

4. Fill in these settings:
   - **Root Directory:** leave blank (repo root)
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

5. Click **Create Web Service**. Render will install dependencies, build the
   React app, and start the server. First deploy takes 3–5 minutes.

6. You'll get a live URL like `https://vantage-terminal.onrender.com`. That's
   your site, publicly reachable, no domain needed yet.

## Adding your own domain later

Once you buy a domain (Namecheap, GoDaddy, whichever), Render's dashboard has
a "Custom Domain" tab under your service. It gives you a DNS record to add
at your domain registrar. Propagation usually takes under an hour.

## Notes on the free tier

Render's free instances sleep after periods of inactivity and wake up on the
next visit (a few seconds' delay). Fine for a demo or portfolio piece, not for
something you're expecting steady traffic on. If you outgrow it, the paid
tier removes the sleep behavior.

The account data lives in `server/data.json` on Render's disk. On the free
tier this resets on redeploys — acceptable for a demo, but if you want it to
persist permanently you'd move it to a small hosted database later.
