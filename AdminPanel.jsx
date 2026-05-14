import { useState, useEffect, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:3001";
const TOOLS = ["Sword", "Rocket Launcher", "Shield", "Speed Potion", "Coin Bag"];

// ── tiny helpers ────────────────────────────────────────────────────────────

function Badge({ color, children }) {
  const cls = {
    green:  "bg-green-500/20  text-green-400  border-green-500/30",
    red:    "bg-red-500/20    text-red-400    border-red-600/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    blue:   "bg-blue-500/20   text-blue-400   border-blue-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cls[color]}`}>
      {children}
    </span>
  );
}

function LogEntry({ entry }) {
  const col = { kick:"text-red-400", ban:"text-orange-400", teleport:"text-blue-400",
                 speed:"text-yellow-400", jump:"text-yellow-400", give:"text-green-400",
                 fling:"text-purple-400" };
  return (
    <div className="flex gap-3 text-xs py-1.5 border-b border-white/5 last:border-0">
      <span className="text-gray-600 shrink-0">{entry.time}</span>
      <span className={col[entry.type] || "text-gray-400"}>[{entry.type.toUpperCase()}]</span>
      <span className="text-gray-300">{entry.msg}</span>
    </div>
  );
}

function Toast({ msg, color }) {
  const bg = { red:"bg-red-600", yellow:"bg-yellow-500 text-black", green:"bg-green-600" };
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-xl
                     text-sm font-semibold text-white ${bg[color] || bg.green} md:left-auto
                     md:translate-x-0 md:right-4`}>
      {msg}
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [players,     setPlayers]     = useState([]);
  const [bannedIds,   setBannedIds]   = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [page,        setPage]        = useState("players");
  const [logs,        setLogs]        = useState([]);
  const [speedVal,    setSpeedVal]    = useState(16);
  const [jumpVal,     setJumpVal]     = useState(50);
  const [tool,        setTool]        = useState(TOOLS[0]);
  const [tpDest,      setTpDest]      = useState("");
  const [toast,       setToast]       = useState(null);
  const [sheetOpen,   setSheetOpen]   = useState(false); // mobile action sheet
  const [loading,     setLoading]     = useState(true);

  // ── fetch helpers ──────────────────────────────────────────────────────────

  const get  = (path)       => fetch(`${API}${path}`).then(r => r.json());
  const post = (path, body) => fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(r => r.json());
  const del  = (path)       => fetch(`${API}${path}`, { method: "DELETE" });

  const notify = useCallback((msg, color = "green") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ type, msg, time }, ...prev].slice(0, 50));
  }, []);

  // ── load players + banned from backend ─────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [pl, bn] = await Promise.all([get("/api/players"), get("/api/banned")]);
        setPlayers(pl);
        setBannedIds(bn.map(b => b.userId));
      } catch {
        notify("Could not reach backend – showing offline mode", "yellow");
        // fallback mock data so the UI is usable offline
        setPlayers([
          { userId: 111111, name: "CoolGamer99",   ping: 42,  joinTime: "2 min ago" },
          { userId: 222222, name: "xX_Blaze_Xx",   ping: 108, joinTime: "5 min ago" },
          { userId: 333333, name: "ProBuilder123", ping: 65,  joinTime: "12 min ago" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(() => load(), 5000); // poll every 5s
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── player actions ─────────────────────────────────────────────────────────

  async function sendCmd(type, extra = {}) {
    try {
      await post("/api/command", { type, userId: selected.userId, ...extra });
    } catch {
      notify("Backend unreachable", "red");
    }
  }

  async function kickPlayer() {
    await sendCmd("kick");
    setPlayers(p => p.filter(x => x.userId !== selected.userId));
    addLog("kick", `Kicked ${selected.name}`);
    notify(`${selected.name} kicked`, "red");
    closeSheet();
  }

  async function banPlayer() {
    await post("/api/banned", { userId: selected.userId, name: selected.name });
    await sendCmd("kick"); // also kick from current session
    setBannedIds(p => [...p, selected.userId]);
    setPlayers(p => p.filter(x => x.userId !== selected.userId));
    addLog("ban", `Banned ${selected.name} (${selected.userId})`);
    notify(`${selected.name} banned`, "red");
    closeSheet();
  }

  async function unban(uid) {
    await del(`/api/banned/${uid}`);
    setBannedIds(p => p.filter(x => x !== uid));
    addLog("ban", `Unbanned UserId ${uid}`);
    notify(`UserId ${uid} unbanned`);
  }

  async function teleport() {
    const dest = tpDest.trim() || "Spawn";
    await sendCmd("teleport", { destination: dest });
    addLog("teleport", `Teleported ${selected.name} → ${dest}`);
    notify(`${selected.name} teleported`);
  }

  async function applySpeed() {
    await sendCmd("speed", { value: speedVal });
    addLog("speed", `${selected.name} speed → ${speedVal}`);
    notify(`Speed set to ${speedVal}`);
  }

  async function applyJump() {
    await sendCmd("jump", { value: jumpVal });
    addLog("jump", `${selected.name} jump → ${jumpVal}`);
    notify(`Jump set to ${jumpVal}`);
  }

  async function giveItem() {
    await sendCmd("give", { tool });
    addLog("give", `Gave ${tool} to ${selected.name}`);
    notify(`Gave ${tool} to ${selected.name}`);
  }

  async function flingPlayer() {
    await sendCmd("fling");
    addLog("fling", `Flung ${selected.name}`);
    notify(`${selected.name} has been FLUNG`, "yellow");
  }

  // ── mobile sheet helpers ───────────────────────────────────────────────────

  function selectPlayer(p) {
    setSelected(p);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSelected(null);
  }

  // ── nav ────────────────────────────────────────────────────────────────────

  const NAV = [
    { id: "players", label: "Players", icon: "👥" },
    { id: "logs",    label: "Log",     icon: "📋" },
    { id: "banned",  label: "Banned",  icon: "🚫" },
  ];

  // ── action panel content (shared between desktop right panel + mobile sheet)

  function ActionContent() {
    if (!selected) return null;
    return (
      <div className="flex flex-col gap-5 p-5 overflow-y-auto">
        {/* Player header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-indigo-600/40 flex items-center justify-center
                          text-xl font-bold shrink-0">
            {selected.name[0]}
          </div>
          <div>
            <p className="font-semibold">{selected.name}</p>
            <p className="text-xs text-gray-500">UserId: {selected.userId}</p>
          </div>
        </div>

        {/* Moderation */}
        <Section label="Moderation">
          <div className="grid grid-cols-2 gap-2">
            <Btn color="yellow" onClick={kickPlayer}>Kick</Btn>
            <Btn color="red"    onClick={banPlayer}>Ban</Btn>
          </div>
        </Section>

        {/* Teleport */}
        <Section label="Teleport">
          <input value={tpDest} onChange={e => setTpDest(e.target.value)}
            placeholder="Destination or player name"
            className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-sm
                       text-white placeholder-gray-600 mb-2 focus:outline-none focus:border-indigo-500" />
          <Btn color="blue" onClick={teleport}>Teleport</Btn>
        </Section>

        {/* Speed */}
        <Section label={`Walk Speed — ${speedVal}`}>
          <input type="range" min={1} max={100} value={speedVal}
            onChange={e => setSpeedVal(Number(e.target.value))}
            className="w-full accent-indigo-500 mb-2 h-2" />
          <Btn color="indigo" onClick={applySpeed}>Set Speed</Btn>
        </Section>

        {/* Jump */}
        <Section label={`Jump Power — ${jumpVal}`}>
          <input type="range" min={1} max={200} value={jumpVal}
            onChange={e => setJumpVal(Number(e.target.value))}
            className="w-full accent-indigo-500 mb-2 h-2" />
          <Btn color="indigo" onClick={applyJump}>Set Jump</Btn>
        </Section>

        {/* Give item */}
        <Section label="Give Item">
          <select value={tool} onChange={e => setTool(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-sm
                       text-white mb-2 focus:outline-none focus:border-indigo-500">
            {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Btn color="green" onClick={giveItem}>Give</Btn>
        </Section>

        {/* Fun */}
        <Section label="Fun">
          <Btn color="purple" onClick={flingPlayer}>Fling Player 💨</Btn>
        </Section>
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#0d0d0f] text-white font-sans">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-[#111115] border-r border-white/10 flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Admin Panel</p>
          <h1 className="text-lg font-bold">My Roblox Game</h1>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(n => (
            <button key={n.id}
              onClick={() => { setPage(n.id); setSelected(null); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                page === n.id
                  ? "bg-indigo-600/30 text-indigo-300 font-medium"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}>
              {n.icon} {n.label}
              {n.id === "banned" && bannedIds.length > 0 && (
                <span className="ml-auto bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {bannedIds.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <p className="p-4 text-xs text-gray-600 border-t border-white/10">
          {players.length} online
        </p>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 border-b border-white/10 px-4 md:px-6 flex items-center
                           justify-between bg-[#111115]/60 sticky top-0 z-20">
          {/* Mobile: show current page title */}
          <h2 className="font-semibold text-gray-200 capitalize">{page}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full inline-block ${loading ? "bg-yellow-400 animate-pulse" : "bg-green-500"}`} />
            {loading ? "Connecting…" : "Server Online"}
          </div>
        </header>

        {/* Content + desktop action panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {toast && <Toast {...toast} />}

            {/* Players */}
            {page === "players" && (
              <>
                <p className="text-gray-400 text-sm mb-4">{players.length} player(s) online</p>
                <div className="grid gap-3">
                  {players.length === 0 && !loading && (
                    <div className="text-center text-gray-500 py-16">No players online</div>
                  )}
                  {players.map(p => (
                    <button key={p.userId}
                      onClick={() => selectPlayer(p)}
                      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border
                                  transition-all active:scale-[0.98] ${
                        selected?.userId === p.userId
                          ? "bg-indigo-600/20 border-indigo-500/50"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}>
                      <div className="w-10 h-10 rounded-full bg-indigo-600/40 flex items-center
                                      justify-center text-lg font-bold shrink-0">
                        {p.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">ID: {p.userId} · {p.joinTime}</p>
                      </div>
                      <Badge color={p.ping < 80 ? "green" : p.ping < 150 ? "yellow" : "red"}>
                        {p.ping}ms
                      </Badge>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Logs */}
            {page === "logs" && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-gray-400 text-sm">{logs.length} action(s)</p>
                  {logs.length > 0 && (
                    <button onClick={() => setLogs([])}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                      Clear
                    </button>
                  )}
                </div>
                <div className="bg-[#111115] rounded-xl border border-white/10 p-4 font-mono">
                  {logs.length === 0
                    ? <p className="text-gray-500 text-xs">No actions yet.</p>
                    : logs.map((e, i) => <LogEntry key={i} entry={e} />)
                  }
                </div>
              </>
            )}

            {/* Banned */}
            {page === "banned" && (
              <>
                <p className="text-gray-400 text-sm mb-4">{bannedIds.length} banned user(s)</p>
                <div className="grid gap-3">
                  {bannedIds.length === 0 && (
                    <div className="text-center text-gray-500 py-16">No banned players</div>
                  )}
                  {bannedIds.map(uid => (
                    <div key={uid}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-sm">UserId: {uid}</p>
                        <Badge color="red">Banned</Badge>
                      </div>
                      <button onClick={() => unban(uid)}
                        className="text-xs px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20
                                   text-gray-300 transition-colors active:scale-95">
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop action panel (right side) */}
          {selected && (
            <aside className="hidden md:flex w-72 shrink-0 border-l border-white/10 bg-[#111115]
                              flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Actions</p>
                <button onClick={closeSheet} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
              </div>
              <ActionContent />
            </aside>
          )}
        </div>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#111115] border-t
                      border-white/10 flex">
        {NAV.map(n => (
          <button key={n.id}
            onClick={() => { setPage(n.id); closeSheet(); }}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs
                         transition-colors relative ${
              page === n.id ? "text-indigo-400" : "text-gray-500"
            }`}>
            <span className="text-xl leading-none">{n.icon}</span>
            {n.label}
            {n.id === "banned" && bannedIds.length > 0 && (
              <span className="absolute top-2 right-[calc(50%-14px)] bg-red-600 text-white
                               text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {bannedIds.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Mobile action bottom sheet ── */}
      {sheetOpen && selected && (
        <>
          {/* Backdrop */}
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
               onClick={closeSheet} />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#18181c] rounded-t-2xl
                          border-t border-white/10 max-h-[80vh] flex flex-col overflow-hidden
                          animate-slide-up">
            {/* Handle + header */}
            <div className="flex flex-col items-center pt-3 pb-2 border-b border-white/10 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20 mb-3" />
              <div className="flex items-center justify-between w-full px-5">
                <p className="text-sm font-semibold text-gray-200">
                  Actions — {selected.name}
                </p>
                <button onClick={closeSheet} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <ActionContent />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── tiny sub-components ──────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  );
}

function Btn({ color, onClick, children }) {
  const cls = {
    red:    "bg-red-600/20    hover:bg-red-600/40    text-red-300    border-red-600/30",
    yellow: "bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border-yellow-600/30",
    blue:   "bg-blue-600/20   hover:bg-blue-600/40   text-blue-300   border-blue-600/30",
    green:  "bg-green-600/20  hover:bg-green-600/40  text-green-300  border-green-600/30",
    indigo: "bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border-indigo-600/30",
    purple: "bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border-purple-600/30",
  };
  return (
    <button onClick={onClick}
      className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors
                  active:scale-95 ${cls[color]}`}>
      {children}
    </button>
  );
}
