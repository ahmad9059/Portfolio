#!/usr/bin/env node
// Local development server for the chat API
// Run: node dev-server.js
// This serves api/chat.js on http://localhost:3001/api/chat
// Use alongside `hugo server` (port 1313) for full local dev

const http = require("http");
const path = require("path");

// Load .env file
const fs = require("fs");
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    let value = rest.join("=").trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key.trim()] === undefined) process.env[key.trim()] = value;
  });
  console.log("Loaded .env file");
}

// Refresh the public knowledge snapshot before loading the API modules.
require("child_process").execFileSync(process.execPath, [path.join(__dirname, "scripts/build-chat-knowledge.js")], { stdio: "inherit" });
const chatHandler = require("./api/chat.js");
const healthHandler = require("./api/health.js");

const PORT = process.env.API_PORT || 3001;

const server = http.createServer(async (req, res) => {
  // Parse body for POST requests
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    await new Promise((resolve) => req.on("end", resolve));
    try {
      req.body = JSON.parse(body);
    } catch {
      req.body = {};
    }
  }

  // Create a response wrapper that mimics Vercel's res API
  const vercelRes = {
    _statusCode: 200,
    _headers: {},
    _headersSent: false,
    get headersSent() { return this._headersSent; },
    get writableEnded() { return res.writableEnded; },
    on(event, listener) { res.on(event, listener); },
    off(event, listener) { res.off(event, listener); },
    setHeader(key, value) { this._headers[key] = value; },
    status(code) { this._statusCode = code; return this; },
    json(data) {
      this._headersSent = true;
      this._headers["Content-Type"] = "application/json; charset=utf-8";
      Object.entries(this._headers).forEach(([k, v]) => res.setHeader(k, v));
      res.writeHead(this._statusCode);
      res.end(JSON.stringify(data));
    },
    write(data) {
      if (!this._headersSent) {
        this._headersSent = true;
        Object.entries(this._headers).forEach(([k, v]) => res.setHeader(k, v));
        res.writeHead(this._statusCode);
      }
      res.write(data);
    },
    end(data) {
      if (!this._headersSent) {
        this._headersSent = true;
        Object.entries(this._headers).forEach(([k, v]) => res.setHeader(k, v));
        res.writeHead(this._statusCode);
      }
      res.end(data);
    },
  };

  // Route requests
  const url = req.url.split("?")[0];

  if (url === "/api/health") {
    healthHandler(req, vercelRes);
  } else if (url === "/api/chat") {
    await chatHandler(req, vercelRes);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Available: /api/chat, /api/health" }));
  }
});

server.listen(PORT, () => {
  console.log(`API dev server running at http://localhost:${PORT}`);
  console.log(`  Chat:   POST http://localhost:${PORT}/api/chat`);
  console.log(`  Health: GET  http://localhost:${PORT}/api/health`);
  console.log(`\nRun "hugo server" in another terminal for the frontend.`);
});
