const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT || 4174);
const ROOT = __dirname;
const OUTPUTS = path.join(ROOT, "outputs");
const DATA_DIR = path.join(ROOT, "work");
const STATE_FILE = path.join(DATA_DIR, "packlet-state.json");
const clients = new Set();

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  broadcast(state);
}

function broadcast(state) {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const client of clients) client.write(payload);
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(value));
}

function collectJson(req, callback) {
  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 10_000_000) req.destroy();
  });
  req.on("end", () => {
    try {
      callback(null, JSON.parse(body || "null"));
    } catch (error) {
      callback(error);
    }
  });
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/packlet.html" : url.pathname;
  const file = path.normalize(path.join(OUTPUTS, pathname));
  if (!file.startsWith(OUTPUTS)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(file);
    const type = ext === ".html" ? "text/html; charset=utf-8" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (req.url === "/api/state" && req.method === "GET") {
    sendJson(res, 200, readState());
    return;
  }

  if (req.url === "/api/state" && req.method === "POST") {
    collectJson(req, (error, state) => {
      if (error || !state || !Array.isArray(state.users)) {
        sendJson(res, 400, { error: "Invalid Packlet state." });
        return;
      }
      writeState(state);
      sendJson(res, 200, { ok: true });
    });
    return;
  }

  if (req.url === "/api/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    clients.add(res);
    const state = readState();
    if (state) res.write(`data: ${JSON.stringify(state)}\n\n`);
    req.on("close", () => clients.delete(res));
    return;
  }

  serveFile(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter(info => info && info.family === "IPv4" && !info.internal)
    .map(info => `http://${info.address}:${PORT}/`);
  console.log(`Packlet is running at http://localhost:${PORT}/`);
  if (addresses.length) console.log(`Friends on the same Wi-Fi can try: ${addresses.join(" or ")}`);
});
