-- AdminCommands.server.lua
-- Place in ServerScriptService
--
-- 1. Set BACKEND_URL to your server address (e.g. https://yourapp.com)
-- 2. Set ADMIN_SECRET to the same value as ADMIN_SECRET in server.js
-- 3. Put your tools/weapons inside ServerStorage in a folder called "AdminTools"

local Players        = game:GetService("Players")
local HttpService    = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local ServerStorage  = game:GetService("ServerStorage")
local RunService     = game:GetService("RunService")

local BACKEND_URL  = "https://YOUR_BACKEND_URL"  -- ← change this
local ADMIN_SECRET = "change_me_in_production"   -- ← must match server.js
local POLL_INTERVAL = 2                           -- seconds between polls

local headers = { ["x-admin-secret"] = ADMIN_SECRET, ["Content-Type"] = "application/json" }

-- ── helpers ──────────────────────────────────────────────────────────────────

local function getHumanoid(player)
	local char = player.Character
	return char and char:FindFirstChildWhichIsA("Humanoid")
end

local function getHRP(player)
	local char = player.Character
	return char and char:FindFirstChild("HumanoidRootPart")
end

local function httpGet(path)
	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url     = BACKEND_URL .. path,
			Method  = "GET",
			Headers = headers,
		})
	end)
	if not ok or not res.Success then return nil end
	return HttpService:JSONDecode(res.Body)
end

local function httpPost(path, body)
	pcall(function()
		HttpService:RequestAsync({
			Url     = BACKEND_URL .. path,
			Method  = "POST",
			Headers = headers,
			Body    = HttpService:JSONEncode(body),
		})
	end)
end

-- ── ban check on join ─────────────────────────────────────────────────────────

Players.PlayerAdded:Connect(function(player)
	local data = httpGet("/api/banned/" .. player.UserId)
	if data and data.banned then
		player:Kick("You are banned from this game.")
	end
end)

-- ── push player list to backend ───────────────────────────────────────────────

local function pushPlayerList()
	local list = {}
	for _, p in ipairs(Players:GetPlayers()) do
		table.insert(list, {
			userId   = p.UserId,
			name     = p.Name,
			ping     = Players:GetNetworkPing(p) * 1000, -- ms (may not exist on all versions)
			joinTime = "in game",
		})
	end
	httpPost("/api/players", list)
end

-- ── command handlers ──────────────────────────────────────────────────────────

local handlers = {}

handlers.kick = function(player, _extra)
	player:Kick("You were kicked by an admin.")
end

handlers.teleport = function(player, extra)
	-- If destination is a player name, teleport to that player
	local dest = extra and extra.destination or ""
	local target = Players:FindFirstChild(dest)
	if target then
		local hrpTarget = getHRP(target)
		local hrp       = getHRP(player)
		if hrpTarget and hrp then
			hrp.CFrame = hrpTarget.CFrame * CFrame.new(3, 0, 0)
		end
	else
		-- Teleport to named spawn location if it exists
		local spawn = workspace:FindFirstChild(dest) or workspace:FindFirstChildWhichIsA("SpawnLocation")
		local hrp = getHRP(player)
		if spawn and hrp then
			hrp.CFrame = spawn.CFrame * CFrame.new(0, 5, 0)
		end
	end
end

handlers.speed = function(player, extra)
	local hum = getHumanoid(player)
	if hum then hum.WalkSpeed = tonumber(extra and extra.value) or 16 end
end

handlers.jump = function(player, extra)
	local hum = getHumanoid(player)
	if hum then hum.JumpPower = tonumber(extra and extra.value) or 50 end
end

handlers.give = function(player, extra)
	local toolName = extra and extra.tool
	if not toolName then return end
	local toolsFolder = ServerStorage:FindFirstChild("AdminTools")
	if not toolsFolder then
		warn("AdminTools folder not found in ServerStorage")
		return
	end
	local tool = toolsFolder:FindFirstChild(toolName)
	if tool and player.Character then
		tool:Clone().Parent = player.Character
	end
end

handlers.fling = function(player, _extra)
	local hrp = getHRP(player)
	if not hrp then return end
	local vel = Instance.new("BodyVelocity")
	vel.Velocity       = Vector3.new(math.random(-200, 200), 500, math.random(-200, 200))
	vel.MaxForce       = Vector3.new(1e9, 1e9, 1e9)
	vel.P              = 1e9
	vel.Parent         = hrp
	game:GetService("Debris"):AddItem(vel, 0.2)
end

-- ── main poll loop ────────────────────────────────────────────────────────────

local lastPush = 0

RunService.Heartbeat:Connect(function()
	local now = tick()
	if now - lastPush < POLL_INTERVAL then return end
	lastPush = now

	-- push current player list
	pushPlayerList()

	-- fetch and execute pending commands
	local cmds = httpGet("/api/commands/pending")
	if not cmds then return end

	for _, cmd in ipairs(cmds) do
		local player = Players:GetPlayerByUserId(cmd.userId)
		local handler = handlers[cmd.type]
		if handler and player then
			local ok, err = pcall(handler, player, cmd.extra)
			if not ok then warn("[AdminPanel] Command error:", cmd.type, err) end
		end
	end
end)

print("[AdminPanel] Admin command system loaded.")
