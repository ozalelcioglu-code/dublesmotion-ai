import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { ControlEvent, TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";

const port = Number(process.env.PORT || 8080);
const platformUrl = (process.env.PLATFORM_URL || "").replace(/\/$/, "");
const workerSecret = process.env.RAP_DANCE_LIVE_WORKER_SECRET || "";
const eventSecret = process.env.RAP_DANCE_LIVE_EVENT_SECRET || "";
const signApiKey = process.env.SIGN_API_KEY || undefined;
const rooms = new Map();

function cleanUsername(value) {
  const username = String(value || "").trim().replace(/^@/, "");
  return /^[A-Za-z0-9._-]{2,80}$/.test(username) ? username : "";
}

function authorized(request) {
  const supplied = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!workerSecret || !supplied) return false;
  const expected = Buffer.from(workerSecret);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error("Payload is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function eventId(type, event) {
  const candidate = event?.msgId || event?.messageId || event?.common?.msgId || event?.groupId;
  return type + ":" + (candidate ? String(candidate) : randomUUID());
}

async function forward(roomKey, payload) {
  const response = await fetch(platformUrl + "/api/live-games/rap-dance/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-rap-dance-live-secret": eventSecret,
    },
    body: JSON.stringify({ roomKey, ...payload }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error("Platform event request failed (" + response.status + "): " + text.slice(0, 240));
  }
}

function attachListeners(roomKey, connection) {
  connection.on(ControlEvent.ERROR, ({ info, exception }) => {
    console.error("TikTok LIVE connection error", { roomKey, info, error: exception?.message || String(exception || "") });
  });

  connection.on(WebcastEvent.CHAT, (event) => {
    const providerUserId = event.user?.id ? String(event.user.id) : "";
    if (!providerUserId || !event.content) return;
    void forward(roomKey, {
      type: "comment",
      eventKey: eventId("chat", event),
      providerUserId,
      displayName: event.user?.displayId || "TikTok izleyicisi",
      comment: event.content,
    }).catch((error) => console.error("Could not forward TikTok comment", { roomKey, error: error.message }));
  });

  connection.on(WebcastEvent.GIFT, (event) => {
    if (!event.gift || (event.gift.type === 1 && event.repeatEnd !== 1)) return;
    const providerUserId = event.user?.id ? String(event.user.id) : "";
    if (!providerUserId) return;
    const count = Math.max(1, Number(event.repeatCount || 1));
    void forward(roomKey, {
      type: "gift",
      eventKey: eventId("gift", event),
      providerUserId,
      displayName: event.user?.displayId || "TikTok izleyicisi",
      giftName: event.gift.name || "TikTok hediyesi",
      giftCount: Number.isFinite(count) ? Math.min(Math.round(count), 100_000) : 1,
    }).catch((error) => console.error("Could not forward TikTok gift", { roomKey, error: error.message }));
  });

  connection.on(WebcastEvent.ROOM_USER, (event) => {
    const viewerCount = Number(event.totalUserCount || event.userCount || 0);
    if (!Number.isFinite(viewerCount) || viewerCount < 0) return;
    void forward(roomKey, {
      type: "viewer",
      eventKey: eventId("viewer", event),
      viewerCount: Math.min(Math.round(viewerCount), 10_000_000),
    }).catch((error) => console.error("Could not forward viewer count", { roomKey, error: error.message }));
  });
}

async function startRoom(roomKey, requestedUsername) {
  const tiktokUsername = cleanUsername(requestedUsername);
  if (!roomKey || !tiktokUsername) throw new Error("A room key and valid TikTok username are required.");
  const existing = rooms.get(roomKey);
  if (existing?.username === tiktokUsername) return { roomKey, tiktokUsername, alreadyRunning: true };
  if (existing) await stopRoom(roomKey);

  const connection = new TikTokLiveConnection(tiktokUsername, signApiKey ? { signApiKey } : {});
  attachListeners(roomKey, connection);
  rooms.set(roomKey, { connection, username: tiktokUsername, startedAt: new Date().toISOString() });
  try {
    const state = await connection.connect();
    console.info("TikTok LIVE room connected", { roomKey, tiktokUsername, sourceRoomId: state.roomId });
    return { roomKey, tiktokUsername, sourceRoomId: state.roomId, alreadyRunning: false };
  } catch (error) {
    rooms.delete(roomKey);
    await connection.disconnect().catch(() => undefined);
    throw error;
  }
}

async function stopRoom(roomKey) {
  const existing = rooms.get(roomKey);
  if (!existing) return false;
  rooms.delete(roomKey);
  await existing.connection.disconnect().catch(() => undefined);
  return true;
}

async function syncFromPlatform() {
  if (!platformUrl || !workerSecret) return;
  const response = await fetch(platformUrl + "/api/live-games/rap-dance/worker-sessions", {
    headers: { authorization: "Bearer " + workerSecret },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Could not sync active rooms (" + response.status + ").");
  const payload = await response.json();
  const active = new Map((payload.sessions || []).map((session) => [session.roomKey, session.tiktokUsername]));
  for (const [roomKey, username] of active) {
    if (!rooms.has(roomKey)) await startRoom(roomKey, username);
  }
  for (const roomKey of rooms.keys()) {
    if (!active.has(roomKey)) await stopRoom(roomKey);
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://" + (request.headers.host || "localhost"));
  if (request.method === "GET" && url.pathname === "/health") {
    return send(response, 200, { ok: true, rooms: rooms.size });
  }
  if (!authorized(request)) return send(response, 401, { ok: false, error: "Unauthorized" });
  try {
    if (request.method === "POST" && url.pathname === "/sessions") {
      const input = await readJson(request);
      const session = await startRoom(String(input.roomKey || ""), input.tiktokUsername);
      return send(response, 201, { ok: true, session });
    }
    const roomMatch = url.pathname.match(/^\/sessions\/([A-Za-z0-9_-]+)$/);
    if (request.method === "DELETE" && roomMatch) {
      const stopped = await stopRoom(roomMatch[1]);
      return send(response, 200, { ok: true, stopped });
    }
    return send(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    console.error("Worker request failed", error);
    return send(response, 400, { ok: false, error: error instanceof Error ? error.message : "Invalid request" });
  }
});

if (!platformUrl || !workerSecret || !eventSecret) {
  console.error("PLATFORM_URL, RAP_DANCE_LIVE_WORKER_SECRET and RAP_DANCE_LIVE_EVENT_SECRET are required.");
  process.exit(1);
}

server.listen(port, () => console.info("Duble-S TikTok LIVE worker listening on " + port));
setInterval(() => {
  void syncFromPlatform().catch((error) => console.error("Could not reconcile TikTok LIVE rooms", error));
}, 60_000).unref();
void syncFromPlatform().catch((error) => console.error("Initial TikTok LIVE sync failed", error));

async function shutdown() {
  server.close();
  await Promise.allSettled([...rooms.keys()].map((roomKey) => stopRoom(roomKey)));
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
