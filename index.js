import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getState, setState } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/* ---------------- Price engine ---------------- */

const FX_SEED = [
  { symbol: "EUR/USD", kind: "fx", from: "EUR", invert: true },
  { symbol: "GBP/USD", kind: "fx", from: "GBP", invert: true },
  { symbol: "USD/JPY", kind: "fx", from: "JPY", invert: false },
  { symbol: "AUD/USD", kind: "fx", from: "AUD", invert: true },
  { symbol: "USD/CHF", kind: "fx", from: "CHF", invert: false },
  { symbol: "USD/CAD", kind: "fx", from: "CAD", invert: false },
];

const CRYPTO_SEED = [
  { symbol: "BTC/USD", kind: "crypto", id: "bitcoin" },
  { symbol: "ETH/USD", kind: "crypto", id: "ethereum" },
  { symbol: "SOL/USD", kind: "crypto", id: "solana" },
];

const FALLBACK_PRICE = {
  "EUR/USD": 1.0850, "GBP/USD": 1.2700, "USD/JPY": 151.20,
  "AUD/USD": 0.6600, "USD/CHF": 0.8800, "USD/CAD": 1.3600,
  "BTC/USD": 60000, "ETH/USD": 3000, "SOL/USD": 140,
};

let instruments = [...FX_SEED, ...CRYPTO_SEED].map((i) => ({
  ...i,
  price: FALLBACK_PRICE[i.symbol],
  openPrice: FALLBACK_PRICE[i.symbol],
  history: [],
}));

let feedStatus = "Connecting to live data…";

async function refreshFxAnchors() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD");
    const data = await res.json();
    const rates = data.rates || {};
    instruments = instruments.map((ins) => {
      if (ins.kind !== "fx") return ins;
      let raw = ins.price;
      const r = rates[ins.from];
      if (r) raw = ins.invert ? 1 / r : r;
      return { ...ins, price: raw, openPrice: raw };
    });
    feedStatus = "Live";
  } catch (e) {
    feedStatus = "Live data unavailable — using seed rates";
  }
}

async function refreshCrypto() {
  try {
    const ids = CRYPTO_SEED.map((c) => c.id).join(",");
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const data = await res.json();
    instruments = instruments.map((ins) => {
      if (ins.kind !== "crypto") return ins;
      const p = data[ins.id]?.usd;
      return p ? { ...ins, price: p, openPrice: ins.openPrice || p } : ins;
    });
  } catch (e) {
    // keep last known prices on failure
  }
}

function tick() {
  instruments = instruments.map((ins) => {
    if (ins.price == null) return ins;
    const drift = (Math.random() - 0.5) * ins.price * 0.0006;
    const next = +(ins.price + drift).toFixed(8);
    const history = [...ins.history, { p: next }].slice(-40);
    return { ...ins, price: next, history };
  });
}

refreshFxAnchors();
refreshCrypto();
setInterval(refreshCrypto, 20000);
setInterval(tick, 1500);

/* ---------------- Trading engine ---------------- */

function livePnl(pos) {
  const ins = instruments.find((i) => i.symbol === pos.symbol);
  if (!ins || ins.price == null) return 0;
  const dir = pos.side === "buy" ? 1 : -1;
  return (ins.price - pos.entry) * dir * pos.volume * 100000;
}

app.get("/api/state", (req, res) => {
  const state = getState();
  const positionsWithPnl = state.positions.map((p) => ({ ...p, pnl: livePnl(p) }));
  const unrealized = positionsWithPnl.reduce((sum, p) => sum + p.pnl, 0);
  res.json({
    status: feedStatus,
    instruments: instruments.map(({ symbol, kind, price, openPrice, history }) => ({ symbol, kind, price, openPrice, history })),
    balance: state.balance,
    equity: state.balance + unrealized,
    positions: positionsWithPnl,
    closedTrades: state.closedTrades,
  });
});

app.post("/api/order", (req, res) => {
  const { symbol, side, volume } = req.body;
  const ins = instruments.find((i) => i.symbol === symbol);
  if (!ins || !["buy", "sell"].includes(side) || !(volume > 0)) {
    return res.status(400).json({ error: "Invalid order" });
  }
  const state = getState();
  const position = { id: Date.now(), symbol, side, volume, entry: ins.price, opened: new Date().toISOString() };
  state.positions.push(position);
  setState(state);
  res.json({ ok: true, position });
});

app.post("/api/close/:id", (req, res) => {
  const id = Number(req.params.id);
  const state = getState();
  const pos = state.positions.find((p) => p.id === id);
  if (!pos) return res.status(404).json({ error: "Position not found" });
  const pnl = livePnl(pos);
  state.balance += pnl;
  state.positions = state.positions.filter((p) => p.id !== id);
  state.closedTrades = [{ ...pos, exit: instruments.find((i) => i.symbol === pos.symbol)?.price, pnl }, ...state.closedTrades].slice(0, 20);
  setState(state);
  res.json({ ok: true, pnl });
});

/* ---------------- Static frontend ---------------- */

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => console.log(`Vantage Terminal server running on port ${PORT}`));
