// npm install express cors
// node server.js
//
// Set ADMIN_SECRET to the same value in your Roblox game (via HttpService headers)
// so only your game server can post player updates / acknowledge commands.

const express = require("express");
const cors    = require("cors");

const app    = express();
const PORT   = process.env.PORT || 3001;
const SECRET = process.env.ADMIN_SECRET || "change_me_in_production";

app.use(cors());
app.use(express.json());

// ── in-memory store (swap for a DB in production) ───────────────────────────

let players  = [];          // [{ userId, name, ping, joinTime }]
let banned   = [];          // [{ userId, name, bannedAt }]
let commands = [];          // pending commands for the Roblox server to execute
let cmdIdSeq = 1;

// ── auth middleware for Roblox-only routes ───────────────────────────────────

function robloxAuth(req, res, next) {
  if (req.headers["x-admin-secret"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── player list ──────────────────────────────────────────────────────────────

// Web panel reads this
app.get("/api/players", (_req, res) => res.json(players));

// Roblox game server pushes live player list every ~5s
app.post("/api/players", robloxAuth, (req, res) => {
  players = req.body; // expects array of player objects
  res.json({ ok: true });
});

// ── banned list ──────────────────────────────────────────────────────────────

app.get("/api/banned", (_req, res) => res.json(banned));

app.post("/api/banned", (req, res) => {
  const { userId, name } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  if (!banned.find(b => b.userId === userId)) {
    banned.push({ userId, name: name || "Unknown", bannedAt: new Date().toISOString() });
  }
  res.json({ ok: true });
});

app.delete("/api/banned/:userId", (req, res) => {
  const uid = Number(req.params.userId);
  banned = banned.filter(b => b.userId !== uid);
  res.json({ ok: true });
});

// Roblox checks this on PlayerAdded
app.get("/api/banned/:userId", (_req, res) => {
  const uid = Number(_req.params.userId);
  const entry = banned.find(b => b.userId === uid);
  res.json({ banned: !!entry });
});

// ── command queue ────────────────────────────────────────────────────────────
// Web panel enqueues commands; Roblox polls and acknowledges them.

// Web panel posts a command
app.post("/api/command", (req, res) => {
  const { type, userId, ...extra } = req.body;
  if (!type || !userId) return res.status(400).json({ error: "type and userId required" });

  const cmd = { id: cmdIdSeq++, type, userId, extra, createdAt: Date.now() };
  commands.push(cmd);
  res.json({ ok: true, cmdId: cmd.id });
});

// Roblox polls for pending commands (returns and clears queue atomically)
app.get("/api/commands/pending", robloxAuth, (_req, res) => {
  const pending = [...commands];
  commands = []; // clear after delivery (Roblox is responsible for execution)
  res.json(pending);
});

// Optional: Roblox can acknowledge individual commands (useful for logging)
app.patch("/api/commands/:id/done", robloxAuth, (req, res) => {
  // already cleared on GET; this endpoint exists for explicit ACK if needed
  res.json({ ok: true });
});

// ── health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ ok: true, players: players.length }));

app.listen(PORT, () =>
  console.log(`Admin backend running on http://localhost:${PORT}\nSecret: ${SECRET}`)
);
