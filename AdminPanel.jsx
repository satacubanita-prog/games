import { useState } from "react";

const ADMIN_IDS = [123456789]; // Replace with your Roblox UserId(s)

const mockPlayers = [
  { id: 1, name: "CoolGamer99", userId: 111111, ping: 42, joinTime: "2 min ago" },
  { id: 2, name: "xX_Blaze_Xx", userId: 222222, ping: 108, joinTime: "5 min ago" },
  { id: 3, name: "ProBuilder123", userId: 333333, ping: 65, joinTime: "12 min ago" },
  { id: 4, name: "ShadowNinja7", userId: 444444, ping: 200, joinTime: "18 min ago" },
];

const TOOLS = ["Sword", "Rocket Launcher", "Shield", "Speed Potion", "Coin Bag"];

function Badge({ color, children }) {
  const colors = {
    green: "bg-green-500/20 text-green-400 border border-green-500/30",
    red: "bg-red-500/20 text-red-400 border border-red-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    blue: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function LogEntry({ entry }) {
  const colors = { kick: "text-red-400", ban: "text-orange-400", teleport: "text-blue-400", speed: "text-yellow-400", jump: "text-yellow-400", give: "text-green-400", fling: "text-purple-400" };
  return (
    <div className="flex gap-3 text-sm py-1 border-b border-white/5">
      <span className="text-gray-500 shrink-0">{entry.time}</span>
      <span className={colors[entry.type] || "text-gray-300"}>[{entry.type.toUpperCase()}]</span>
      <span className="text-gray-300">{entry.msg}</span>
    </div>
  );
}

export default function AdminPanel() {
  const [players, setPlayers] = useState(mockPlayers);
  const [bannedIds, setBannedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState("players");
  const [logs, setLogs] = useState([]);
  const [speedVal, setSpeedVal] = useState(16);
  const [jumpVal, setJumpVal] = useState(50);
  const [selectedTool, setSelectedTool] = useState(TOOLS[0]);
  const [teleportTarget, setTeleportTarget] = useState("");
  const [notification, setNotification] = useState(null);

  function addLog(type, msg) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ type, msg, time }, ...prev].slice(0, 50));
  }

  function notify(msg, color = "green") {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 2500);
  }

  // --- Actions (wire these to your Roblox HttpService / Open Cloud backend) ---

  function kickPlayer(p) {
    setPlayers((prev) => prev.filter((x) => x.id !== p.id));
    setSelected(null);
    addLog("kick", `Kicked ${p.name} (${p.userId})`);
    notify(`${p.name} was kicked`, "red");
    // POST /api/kick { userId: p.userId }
  }

  function banPlayer(p) {
    setBannedIds((prev) => [...prev, p.userId]);
    setPlayers((prev) => prev.filter((x) => x.id !== p.id));
    setSelected(null);
    addLog("ban", `Banned ${p.name} (${p.userId})`);
    notify(`${p.name} was banned`, "red");
    // POST /api/ban { userId: p.userId }
  }

  function teleportPlayer(p) {
    const dest = teleportTarget.trim() || "Spawn";
    addLog("teleport", `Teleported ${p.name} → ${dest}`);
    notify(`${p.name} teleported to ${dest}`);
    // POST /api/teleport { userId: p.userId, destination: dest }
  }

  function applySpeed(p) {
    addLog("speed", `Set ${p.name} speed → ${speedVal}`);
    notify(`${p.name} speed set to ${speedVal}`);
    // POST /api/speed { userId: p.userId, value: speedVal }
  }

  function applyJump(p) {
    addLog("jump", `Set ${p.name} jump power → ${jumpVal}`);
    notify(`${p.name} jump set to ${jumpVal}`);
    // POST /api/jump { userId: p.userId, value: jumpVal }
  }

  function giveItem(p) {
    addLog("give", `Gave ${selectedTool} to ${p.name}`);
    notify(`Gave ${selectedTool} to ${p.name}`);
    // POST /api/give { userId: p.userId, tool: selectedTool }
  }

  function flingPlayer(p) {
    addLog("fling", `Flung ${p.name} into the void`);
    notify(`${p.name} has been FLUNG`, "yellow");
    // POST /api/fling { userId: p.userId }
  }

  // -------------------------------------------------------------------------

  const navItems = [
    { id: "players", label: "Players", icon: "👥" },
    { id: "logs", label: "Action Log", icon: "📋" },
    { id: "banned", label: "Banned", icon: "🚫" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0d0d0f] text-white font-sans">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#111115] border-r border-white/10 flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Admin Panel</p>
          <h1 className="text-lg font-bold text-white">My Roblox Game</h1>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => { setPage(n.id); setSelected(null); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                page === n.id
                  ? "bg-indigo-600/30 text-indigo-300 font-medium"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
              {n.id === "banned" && bannedIds.length > 0 && (
                <span className="ml-auto bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {bannedIds.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 text-xs text-gray-600">
          {players.length} online
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-[#111115]/50">
          <h2 className="font-semibold text-gray-200 capitalize">{page}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Server Online
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Notification toast */}
            {notification && (
              <div
                className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all ${
                  notification.color === "red"
                    ? "bg-red-600 text-white"
                    : notification.color === "yellow"
                    ? "bg-yellow-500 text-black"
                    : "bg-green-600 text-white"
                }`}
              >
                {notification.msg}
              </div>
            )}

            {/* Players page */}
            {page === "players" && (
              <div>
                <p className="text-gray-400 text-sm mb-4">{players.length} player(s) in server</p>
                <div className="grid gap-3">
                  {players.length === 0 && (
                    <div className="text-center text-gray-500 py-12">No players online</div>
                  )}
                  {players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(selected?.id === p.id ? null : p)}
                      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        selected?.id === p.id
                          ? "bg-indigo-600/20 border-indigo-500/50"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-600/40 flex items-center justify-center text-lg font-bold">
                        {p.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-500">ID: {p.userId} · Joined {p.joinTime}</p>
                      </div>
                      <Badge color={p.ping < 80 ? "green" : p.ping < 150 ? "yellow" : "red"}>
                        {p.ping}ms
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Logs page */}
            {page === "logs" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400 text-sm">{logs.length} action(s) recorded</p>
                  {logs.length > 0 && (
                    <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                      Clear
                    </button>
                  )}
                </div>
                <div className="bg-[#111115] rounded-xl border border-white/10 p-4 font-mono text-xs">
                  {logs.length === 0 && <p className="text-gray-500">No actions yet.</p>}
                  {logs.map((e, i) => <LogEntry key={i} entry={e} />)}
                </div>
              </div>
            )}

            {/* Banned page */}
            {page === "banned" && (
              <div>
                <p className="text-gray-400 text-sm mb-4">{bannedIds.length} banned user(s)</p>
                <div className="grid gap-3">
                  {bannedIds.length === 0 && (
                    <div className="text-center text-gray-500 py-12">No banned players</div>
                  )}
                  {bannedIds.map((uid) => (
                    <div key={uid} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="font-medium">UserId: {uid}</p>
                        <Badge color="red">Banned</Badge>
                      </div>
                      <button
                        onClick={() => {
                          setBannedIds((prev) => prev.filter((x) => x !== uid));
                          addLog("ban", `Unbanned UserId ${uid}`);
                          notify(`UserId ${uid} unbanned`);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                      >
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Panel (shown when a player is selected) */}
          {selected && page === "players" && (
            <aside className="w-72 shrink-0 border-l border-white/10 bg-[#111115] overflow-y-auto p-5 flex flex-col gap-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Selected Player</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/40 flex items-center justify-center text-lg font-bold">
                    {selected.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{selected.name}</p>
                    <p className="text-xs text-gray-500">ID {selected.userId}</p>
                  </div>
                </div>
              </div>

              {/* Kick & Ban */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Moderation</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => kickPlayer(selected)}
                    className="py-2 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 text-sm font-medium transition-colors border border-yellow-600/30"
                  >
                    Kick
                  </button>
                  <button
                    onClick={() => banPlayer(selected)}
                    className="py-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 text-sm font-medium transition-colors border border-red-600/30"
                  >
                    Ban
                  </button>
                </div>
              </div>

              {/* Teleport */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Teleport</p>
                <input
                  value={teleportTarget}
                  onChange={(e) => setTeleportTarget(e.target.value)}
                  placeholder="Destination or player name"
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 mb-2 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => teleportPlayer(selected)}
                  className="w-full py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-sm font-medium transition-colors border border-blue-600/30"
                >
                  Teleport
                </button>
              </div>

              {/* Speed */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Walk Speed <span className="text-white normal-case">{speedVal}</span>
                </p>
                <input
                  type="range" min={1} max={100} value={speedVal}
                  onChange={(e) => setSpeedVal(Number(e.target.value))}
                  className="w-full accent-indigo-500 mb-2"
                />
                <button
                  onClick={() => applySpeed(selected)}
                  className="w-full py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-sm font-medium transition-colors border border-indigo-600/30"
                >
                  Set Speed
                </button>
              </div>

              {/* Jump Power */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Jump Power <span className="text-white normal-case">{jumpVal}</span>
                </p>
                <input
                  type="range" min={1} max={200} value={jumpVal}
                  onChange={(e) => setJumpVal(Number(e.target.value))}
                  className="w-full accent-indigo-500 mb-2"
                />
                <button
                  onClick={() => applyJump(selected)}
                  className="w-full py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-sm font-medium transition-colors border border-indigo-600/30"
                >
                  Set Jump
                </button>
              </div>

              {/* Give Item */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Give Item</p>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white mb-2 focus:outline-none focus:border-indigo-500"
                >
                  {TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  onClick={() => giveItem(selected)}
                  className="w-full py-2 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-300 text-sm font-medium transition-colors border border-green-600/30"
                >
                  Give
                </button>
              </div>

              {/* Fling */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Fun</p>
                <button
                  onClick={() => flingPlayer(selected)}
                  className="w-full py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-sm font-medium transition-colors border border-purple-600/30"
                >
                  Fling Player
                </button>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
