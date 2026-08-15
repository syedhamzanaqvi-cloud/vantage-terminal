import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

function fmt(price, symbol) {
  if (price == null) return "—";
  const dp = symbol.includes("JPY") ? 3 : symbol.startsWith("BTC") || symbol.startsWith("ETH") || symbol.startsWith("SOL") ? 2 : 5;
  return price.toFixed(dp);
}

function pct(change) {
  if (change == null) return "—";
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return <div style={{ width: 72, height: 28 }} />;
  return (
    <div style={{ width: 72, height: 28 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="p" stroke={positive ? "#2FBF8F" : "#E05263"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(null);
  const [selected, setSelected] = useState("EUR/USD");
  const [volume, setVolume] = useState(0.1);

  const poll = useCallback(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
  }, []);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, [poll]);

  if (!state) {
    return <div style={{ background: "#0A0D12", color: "#7A8296", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Vantage Terminal…</div>;
  }

  const instruments = state.instruments;
  const active = instruments.find((i) => i.symbol === selected);
  const positive = active && active.openPrice ? active.price >= active.openPrice : true;
  const changePct = active && active.openPrice ? ((active.price - active.openPrice) / active.openPrice) * 100 : 0;

  function openPosition(side) {
    if (!active || volume <= 0) return;
    fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: active.symbol, side, volume }),
    }).then(poll);
  }

  function closePosition(id) {
    fetch(`/api/close/${id}`, { method: "POST" }).then(poll);
  }

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", background: "#0A0D12", color: "#E4E7EC",
      minHeight: "100vh",
    }}>
      <style>{`
        .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
        .display { font-family: 'Space Grotesk', sans-serif; }
        .row:hover { background: #171C27; }
        button { cursor: pointer; }
        button:focus-visible, input:focus-visible { outline: 2px solid #C9A64A; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid #1F2530", background: "#0D1119",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: "#C9A64A",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0A0D12",
          }}>V</div>
          <span className="display" style={{ fontSize: 17, fontWeight: 600, letterSpacing: 0.2 }}>Vantage Terminal</span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#0A0D12", background: "#C9A64A",
            padding: "2px 7px", borderRadius: 999, marginLeft: 6, letterSpacing: 0.4,
          }}>DEMO — NO REAL MONEY</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#7A8296" }}>Balance</div>
            <div className="mono" style={{ fontWeight: 600 }}>Rs {state.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#7A8296" }}>Equity</div>
            <div className="mono" style={{ fontWeight: 600, color: state.equity >= state.balance ? "#2FBF8F" : "#E05263" }}>
              Rs {state.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)", flexWrap: "wrap" }}>
        {/* Watchlist */}
        <div style={{ width: 220, borderRight: "1px solid #1F2530", padding: "10px 0" }}>
          <div style={{ fontSize: 11, color: "#7A8296", padding: "0 14px 8px", letterSpacing: 0.5 }}>WATCHLIST</div>
          {instruments.map((ins) => {
            const up = ins.openPrice ? ins.price >= ins.openPrice : true;
            const chg = ins.openPrice ? ((ins.price - ins.openPrice) / ins.openPrice) * 100 : 0;
            return (
              <div key={ins.symbol} className="row" onClick={() => setSelected(ins.symbol)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 14px", cursor: "pointer",
                  background: selected === ins.symbol ? "#171C27" : "transparent",
                  borderLeft: selected === ins.symbol ? "2px solid #C9A64A" : "2px solid transparent",
                }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ins.symbol}</div>
                  <div className="mono" style={{ fontSize: 11, color: up ? "#2FBF8F" : "#E05263" }}>{pct(chg)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkline data={ins.history} positive={up} />
                  <div className="mono" style={{ fontSize: 13, minWidth: 60, textAlign: "right" }}>{fmt(ins.price, ins.symbol)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart + order ticket */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 320 }}>
          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span className="display" style={{ fontSize: 20, fontWeight: 600 }}>{selected}</span>
              <span className="mono" style={{ fontSize: 20 }}>{active ? fmt(active.price, active.symbol) : "—"}</span>
              <span className="mono" style={{ fontSize: 13, color: positive ? "#2FBF8F" : "#E05263" }}>{pct(changePct)}</span>
            </div>
            <div style={{ fontSize: 11, color: "#7A8296", marginTop: 2 }}>{state.status} — crypto is live market data, FX is simulated around live reference rates</div>
          </div>

          <div style={{ flex: 1, padding: "8px 12px", minHeight: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={active ? active.history : []}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A64A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9A64A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="p" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip contentStyle={{ background: "#12161F", border: "1px solid #1F2530", fontSize: 12 }} labelFormatter={() => ""} />
                <Area type="monotone" dataKey="p" stroke="#C9A64A" strokeWidth={2} fill="url(#fill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Order ticket */}
          <div style={{ borderTop: "1px solid #1F2530", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#7A8296" }}>
              Volume (lots)
              <input type="number" min="0.01" step="0.01" value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
                className="mono"
                style={{
                  display: "block", marginTop: 4, width: 90, background: "#12161F", border: "1px solid #1F2530",
                  color: "#E4E7EC", borderRadius: 6, padding: "6px 8px", fontSize: 13,
                }} />
            </label>
            <button onClick={() => openPosition("sell")} style={{
              background: "#E05263", border: "none", color: "#fff", fontWeight: 600, fontSize: 13,
              padding: "10px 22px", borderRadius: 6,
            }}>Sell</button>
            <button onClick={() => openPosition("buy")} style={{
              background: "#2FBF8F", border: "none", color: "#08130F", fontWeight: 600, fontSize: 13,
              padding: "10px 22px", borderRadius: 6,
            }}>Buy</button>
          </div>
        </div>

        {/* Positions */}
        <div style={{ width: 300, borderLeft: "1px solid #1F2530", padding: "14px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: "#7A8296", marginBottom: 8, letterSpacing: 0.5 }}>OPEN POSITIONS</div>
          {state.positions.length === 0 && <div style={{ fontSize: 12, color: "#7A8296" }}>No open positions.</div>}
          {state.positions.map((pos) => (
            <div key={pos.id} style={{
              border: "1px solid #1F2530", borderRadius: 8, padding: "10px 12px", marginBottom: 8, background: "#12161F",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{pos.symbol}</span>
                <span style={{ color: pos.side === "buy" ? "#2FBF8F" : "#E05263", fontWeight: 600, fontSize: 11 }}>{pos.side.toUpperCase()}</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "#7A8296", marginTop: 3 }}>
                {pos.volume} lots @ {fmt(pos.entry, pos.symbol)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span className="mono" style={{ fontSize: 13, color: pos.pnl >= 0 ? "#2FBF8F" : "#E05263" }}>
                  {pos.pnl >= 0 ? "+" : ""}Rs {pos.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <button onClick={() => closePosition(pos.id)} style={{
                  background: "transparent", border: "1px solid #1F2530", color: "#E4E7EC",
                  borderRadius: 5, padding: "4px 10px", fontSize: 11,
                }}>Close</button>
              </div>
            </div>
          ))}

          {state.closedTrades.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: "#7A8296", margin: "16px 0 8px", letterSpacing: 0.5 }}>RECENT CLOSED</div>
              {state.closedTrades.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", color: "#7A8296" }}>
                  <span>{t.symbol} {t.side}</span>
                  <span className="mono" style={{ color: t.pnl >= 0 ? "#2FBF8F" : "#E05263" }}>
                    {t.pnl >= 0 ? "+" : ""}Rs {t.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1F2530", padding: "8px 20px", fontSize: 10, color: "#4B5262" }}>
        Simulated demo environment. No real orders are placed and no real funds move. Crypto quotes from CoinGecko, FX anchored to Frankfurter/ECB reference rates.
      </div>
    </div>
  );
}
