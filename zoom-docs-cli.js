#!/usr/bin/env node

import fs from "node:fs/promises";
import crypto from "node:crypto";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { URL } from "node:url";

const API_BASE = "https://api.zoom.us/v2";
const OAUTH_AUTHORIZE_URL = "https://zoom.us/oauth/authorize";
const OAUTH_TOKEN_URL = "https://zoom.us/oauth/token";
const DEFAULT_REDIRECT_URI = "http://localhost:8765/callback";
const DEFAULT_PUBLIC_CLIENT_ID = "sg8o0jnAR16nACej8DwrZQ";
const CONFIG_DIR = path.join(os.homedir(), ".zoom-docs-cli");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");
const REQUIRED_SCOPES = ["docs_export:read", "docs:read:export"];

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  if (process.env.DEBUG) console.error(error);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || args.help || args.h) {
    printHelp();
    return;
  }

  if (command === "config") {
    await handleConfig(args);
    return;
  }

  if (command === "auth") {
    await handleAuth(args);
    return;
  }

  if (command === "token") {
    await handleToken(args);
    return;
  }

  if (command === "get") {
    await handleGet(args);
    return;
  }

  if (command === "metadata") {
    await handleMetadata(args);
    return;
  }

  if (command === "root") {
    await handleRoot(args);
    return;
  }

  if (command === "children") {
    await handleChildren(args);
    return;
  }

  if (command === "collaborators") {
    await handleCollaborators(args);
    return;
  }

  if (command === "general-access") {
    await handleGeneralAccess(args);
    return;
  }

  if (command === "import-content") {
    await handleImportContent(args);
    return;
  }

  if (command === "create") {
    await handleCreate(args);
    return;
  }

  if (command === "delete") {
    await handleDelete(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function handleConfig(args) {
  const sub = args._[1];
  if (sub === "show") {
    const config = await readConfig();
    console.log(JSON.stringify(redactConfig(config), null, 2));
    return;
  }

  if (sub !== "set") {
    console.log("Usage: zoom-docs-cli config set [--public-client-id ID] [--redirect-uri URL]");
    console.log("       zoom-docs-cli config set --client-id ID --client-secret SECRET [--redirect-uri URL]");
    console.log("       zoom-docs-cli config show");
    return;
  }

  const existing = await readConfig();
  const next = {
    ...existing,
    public_client_id: args["public-client-id"] ?? existing.public_client_id ?? DEFAULT_PUBLIC_CLIENT_ID,
    client_id: args["client-id"] ?? existing.client_id,
    client_secret: args["client-secret"] ?? existing.client_secret,
    redirect_uri: args["redirect-uri"] ?? existing.redirect_uri ?? DEFAULT_REDIRECT_URI
  };

  if (args["clear-confidential"]) {
    delete next.client_id;
    delete next.client_secret;
  }

  if (!next.public_client_id && (!next.client_id || !next.client_secret)) {
    throw new Error("Set --public-client-id, or provide both --client-id and --client-secret.");
  }

  await writeJson(CONFIG_PATH, next);
  console.log(`Saved config to ${CONFIG_PATH}`);
}

async function handleAuth(args) {
  const sub = args._[1];
  if (sub === "logout") {
    await fs.rm(TOKEN_PATH, { force: true });
    console.log("Removed saved Zoom token.");
    return;
  }

  if (!sub || sub === "login") {
    const credentials = await loadCredentials(args);
    const token = await runOAuthLogin(credentials);
    await writeJson(TOKEN_PATH, token);
    console.log(`Authorization complete. Token saved to ${TOKEN_PATH}`);
    return;
  }

  throw new Error(`Unknown auth command: ${sub}`);
}

async function handleToken(args) {
  const sub = args._[1];
  if (sub !== "status") {
    console.log("Usage: zoom-docs-cli token status");
    return;
  }

  const token = await readToken();
  if (!token) {
    console.log("No token saved. Run: zoom-docs-cli auth login");
    return;
  }

  const expiresAt = new Date(token.expires_at);
  console.log(JSON.stringify({
    has_access_token: Boolean(token.access_token),
    has_refresh_token: Boolean(token.refresh_token),
    expires_at: expiresAt.toISOString(),
    expired: Date.now() >= expiresAt.getTime(),
    scope: token.scope ?? ""
  }, null, 2));
}

async function handleGet(args) {
  const input = args._[1];
  if (!input) {
    throw new Error("Usage: zoom-docs-cli get <docs.zoom.us/doc URL | fileId> [--out FILE] [--json]");
  }

  const fileId = extractFileId(input);
  const accessToken = await getValidAccessToken(args);

  let result;
  try {
    result = await getFileContent(accessToken, fileId);
  } catch (error) {
    if (error.zoomCode === 5150 || args["fallback-export"]) {
      result = await exportFileAsMarkdown(accessToken, fileId);
    } else {
      throw error;
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const outPath = args.out
    ? path.resolve(String(args.out))
    : path.resolve(`${sanitizeFileName(result.file_name || fileId)}.md`);

  await fs.writeFile(outPath, result.file_content, "utf8");
  console.log(`Saved ${outPath}`);
}

async function handleMetadata(args) {
  const input = args._[1];
  if (!input) {
    throw new Error("Usage: zoom-docs-cli metadata <docs.zoom.us/doc URL | fileId>");
  }

  const fileId = extractFileId(input);
  const accessToken = await getValidAccessToken(args);
  const metadata = await getFileMetadata(accessToken, fileId);
  console.log(JSON.stringify(metadata, null, 2));
}

async function handleRoot(args) {
  const userId = args._[1] || "me";
  const accessToken = await getValidAccessToken(args);
  const root = await getUserRoot(accessToken, userId);
  console.log(JSON.stringify(root, null, 2));
}

async function handleChildren(args) {
  const input = args._[1];
  if (!input) {
    throw new Error("Usage: zoom-docs-cli children <docs.zoom.us/doc URL | fileId>");
  }

  const fileId = extractFileId(input);
  const accessToken = await getValidAccessToken(args);
  const children = await listChildren(accessToken, fileId);
  console.log(JSON.stringify(children, null, 2));
}

async function handleCollaborators(args) {
  const input = args._[1];
  if (!input) {
    throw new Error("Usage: zoom-docs-cli collaborators <docs.zoom.us/doc URL | fileId>");
  }

  const fileId = extractFileId(input);
  const accessToken = await getValidAccessToken(args);
  const collaborators = await listCollaborators(accessToken, fileId);
  console.log(JSON.stringify(collaborators, null, 2));
}

async function handleGeneralAccess(args) {
  const input = args._[1];
  if (!input) {
    throw new Error("Usage: zoom-docs-cli general-access <docs.zoom.us/doc URL | fileId>");
  }

  const fileId = extractFileId(input);
  const accessToken = await getValidAccessToken(args);
  const setting = await getGeneralAccess(accessToken, fileId);
  console.log(JSON.stringify(setting, null, 2));
}

async function handleImportContent(args) {
  const fileName = args["file-name"] || args.name || "zoom-docs-cli import test";
  const parentId = args["parent-id"];
  const content = await readContentArg(args);

  const accessToken = await getValidAccessToken(args);
  const result = await createFileFromContent(accessToken, {
    file_name: fileName,
    parent_id: parentId,
    content
  });
  console.log(JSON.stringify(result, null, 2));
}

async function handleCreate(args) {
  const fileName = args["file-name"] || args.name || "Untitled";
  const fileType = args["file-type"] || args.type || "doc";
  const parentId = args["parent-id"];

  const accessToken = await getValidAccessToken(args);
  const result = await createFile(accessToken, {
    file_name: fileName,
    file_type: fileType,
    parent_id: parentId
  });
  console.log(JSON.stringify(result, null, 2));
}

async function handleDelete(args) {
  const input = args._[1];
  if (!input) {
    throw new Error("Usage: zoom-docs-cli delete <docs.zoom.us/doc URL | fileId> --yes");
  }
  if (!args.yes) {
    throw new Error("Deleting a Zoom Docs file is destructive. Re-run with --yes to confirm.");
  }

  const fileId = extractFileId(input);
  const accessToken = await getValidAccessToken(args);
  await deleteFile(accessToken, fileId);
  console.log(JSON.stringify({ deleted: true, file_id: fileId }, null, 2));
}

async function getFileContent(accessToken, fileId) {
  const response = await zoomFetch(`/docs/files/${encodeURIComponent(fileId)}/content`, {
    method: "GET",
    accessToken
  });
  const json = await response.json();
  return {
    file_name: json.file_name || fileId,
    file_content: json.file_content || ""
  };
}

async function getFileMetadata(accessToken, fileId) {
  const response = await zoomFetch(`/docs/files/${encodeURIComponent(fileId)}`, {
    method: "GET",
    accessToken
  });
  return response.json();
}

async function getUserRoot(accessToken, userId) {
  const response = await zoomFetch(`/docs/users/${encodeURIComponent(userId)}/root`, {
    method: "GET",
    accessToken
  });
  return response.json();
}

async function listChildren(accessToken, fileId) {
  const response = await zoomFetch(`/docs/files/${encodeURIComponent(fileId)}/children`, {
    method: "GET",
    accessToken
  });
  return response.json();
}

async function listCollaborators(accessToken, fileId) {
  const response = await zoomFetch(`/docs/files/${encodeURIComponent(fileId)}/collaborators`, {
    method: "GET",
    accessToken
  });
  return response.json();
}

async function getGeneralAccess(accessToken, fileId) {
  const response = await zoomFetch(`/docs/files/${encodeURIComponent(fileId)}/general_access_setting`, {
    method: "GET",
    accessToken
  });
  return response.json();
}

async function createFileFromContent(accessToken, { file_name, parent_id, content }) {
  const body = { file_name, content };
  if (parent_id) body.parent_id = parent_id;

  const response = await zoomFetch("/docs/import_content", {
    method: "POST",
    accessToken,
    body: JSON.stringify(body)
  });
  return response.json();
}

async function createFile(accessToken, { file_name, file_type, parent_id }) {
  const body = { file_name, file_type };
  if (parent_id) body.parent_id = parent_id;

  const response = await zoomFetch("/docs/files", {
    method: "POST",
    accessToken,
    body: JSON.stringify(body)
  });
  return response.json();
}

async function deleteFile(accessToken, fileId) {
  await zoomFetch(`/docs/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    accessToken
  });
}

async function exportFileAsMarkdown(accessToken, fileId) {
  const createResponse = await zoomFetch("/docs/exports", {
    method: "POST",
    accessToken,
    body: JSON.stringify({
      file_id: fileId,
      export_format: "markdown"
    })
  });
  const created = await createResponse.json();
  if (!created.export_id) throw new Error("Zoom did not return an export_id.");

  const started = Date.now();
  while (Date.now() - started < 120_000) {
    await sleep(1500);
    const statusResponse = await zoomFetch(`/docs/exports/${encodeURIComponent(created.export_id)}/status`, {
      method: "GET",
      accessToken
    });
    const status = await statusResponse.json();

    if (status.status === "failed") {
      throw new Error(`Zoom export failed for export_id ${created.export_id}.`);
    }

    if (status.status === "succeeded") {
      if (!status.download_link) throw new Error("Zoom export succeeded but no download_link was returned.");
      const download = await fetch(status.download_link);
      if (!download.ok) {
        throw new Error(`Failed to download export: HTTP ${download.status} ${download.statusText}`);
      }
      const fileContent = await download.text();
      return {
        file_name: fileId,
        file_content: fileContent,
        export_id: created.export_id,
        expires_at: status.expires_at,
        download_link: status.download_link
      };
    }
  }

  throw new Error("Timed out waiting for Zoom export to finish.");
}

async function getValidAccessToken(args) {
  const credentials = await loadCredentials(args);
  let token = await readToken();

  if (!token) {
    token = await runOAuthLogin(credentials);
    await writeJson(TOKEN_PATH, token);
  }

  if (Date.now() < Number(token.expires_at) - 60_000) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    token = await runOAuthLogin(credentials);
    await writeJson(TOKEN_PATH, token);
    return token.access_token;
  }

  try {
    const refreshed = await refreshToken(credentials, token.refresh_token);
    await writeJson(TOKEN_PATH, refreshed);
    return refreshed.access_token;
  } catch (error) {
    console.warn(`Token refresh failed: ${error.message}`);
    const fresh = await runOAuthLogin(credentials);
    await writeJson(TOKEN_PATH, fresh);
    return fresh.access_token;
  }
}

async function runOAuthLogin(credentials) {
  const redirect = new URL(credentials.redirect_uri);
  if (redirect.hostname !== "127.0.0.1" && redirect.hostname !== "localhost") {
    throw new Error("This CLI only supports localhost redirect URIs, for example http://127.0.0.1:8765/callback.");
  }

  const pkce = credentials.public_client_id ? createPkcePair() : null;
  const codePromise = waitForOAuthCode(redirect);
  const authUrl = new URL(OAUTH_AUTHORIZE_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", credentials.public_client_id || credentials.client_id);
  authUrl.searchParams.set("redirect_uri", credentials.redirect_uri);
  if (pkce) {
    authUrl.searchParams.set("code_challenge", pkce.codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
  }

  console.log("Opening Zoom authorization page...");
  console.log(authUrl.toString());
  openUrl(authUrl.toString());

  const code = await codePromise;
  return exchangeCodeForToken(credentials, code, pkce);
}

function waitForOAuthCode(redirect) {
  const port = Number(redirect.port || 80);
  const pathname = redirect.pathname;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for Zoom OAuth redirect."));
    }, 180_000);

    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url, `${redirect.protocol}//${redirect.host}`);
      if (requestUrl.pathname !== pathname) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const error = requestUrl.searchParams.get("error");
      if (error) {
        clearTimeout(timeout);
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Zoom authorization failed: ${error}`);
        server.close();
        reject(new Error(`Zoom authorization failed: ${error}`));
        return;
      }

      const code = requestUrl.searchParams.get("code");
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Missing authorization code.");
        return;
      }

      clearTimeout(timeout);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>Zoom authorization complete</h1><p>You can close this browser tab and return to the terminal.</p>");
      server.close();
      resolve(code);
    });

    server.on("error", reject);
    server.listen(port, redirect.hostname);
  });
}

async function exchangeCodeForToken(credentials, code, pkce) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: credentials.redirect_uri
  });
  if (pkce) body.set("code_verifier", pkce.codeVerifier);

  return requestToken(credentials, body);
}

async function refreshToken(credentials, refreshTokenValue) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshTokenValue
  });

  return requestToken(credentials, body);
}

async function requestToken(credentials, body) {
  const publicClientId = credentials.public_client_id;
  if (publicClientId) {
    body.set("client_id", publicClientId);
  }

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded"
  };

  if (!publicClientId) {
    const basic = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers,
    body
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }

  if (!response.ok) {
    throw new Error(`Zoom OAuth token request failed: HTTP ${response.status} ${JSON.stringify(json)}`);
  }

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    token_type: json.token_type,
    scope: json.scope,
    expires_in: json.expires_in,
    expires_at: Date.now() + Number(json.expires_in || 3599) * 1000
  };
}

async function zoomFetch(apiPath, { method, accessToken, body }) {
  const response = await fetch(`${API_BASE}${apiPath}`, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
    const error = new Error(`Zoom API failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
    error.status = response.status;
    error.zoomCode = payload.code;
    error.payload = payload;
    throw error;
  }

  return response;
}

async function loadCredentials(args) {
  const config = await readConfig();
  const credentials = {
    public_client_id: args["public-client-id"] || process.env.ZOOM_PUBLIC_CLIENT_ID || config.public_client_id || DEFAULT_PUBLIC_CLIENT_ID,
    client_id: args["client-id"] || process.env.ZOOM_CLIENT_ID || config.client_id,
    client_secret: args["client-secret"] || process.env.ZOOM_CLIENT_SECRET || config.client_secret,
    redirect_uri: args["redirect-uri"] || process.env.ZOOM_REDIRECT_URI || config.redirect_uri || DEFAULT_REDIRECT_URI
  };

  if (!credentials.public_client_id && (!credentials.client_id || !credentials.client_secret)) {
    throw new Error([
      "Missing Zoom OAuth app credentials.",
      "Set them with:",
      "  zoom-docs-cli config set --public-client-id <id>",
      "or provide ZOOM_PUBLIC_CLIENT_ID.",
      "",
      "For confidential OAuth, you can still use:",
      "  zoom-docs-cli config set --client-id <id> --client-secret <secret>"
    ].join("\n"));
  }

  return credentials;
}

async function readConfig() {
  return readJson(CONFIG_PATH, {});
}

async function readToken() {
  return readJson(TOKEN_PATH, null);
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function readContentArg(args) {
  if (args.content !== undefined && args.content !== true) {
    return String(args.content);
  }

  if (args.file) {
    return fs.readFile(path.resolve(String(args.file)), "utf8");
  }

  throw new Error("Provide Markdown content with --content TEXT or --file PATH.");
}

function extractFileId(input) {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/doc\/([^/?#]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Not a URL; treat as a raw file ID.
  }
  return input;
}

function sanitizeFileName(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.md$/i, "");
}

function openUrl(url) {
  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.unref();
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      result._.push(arg);
      continue;
    }
    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    const next = argv[i + 1];
    if (rawValue !== undefined) {
      result[rawKey] = rawValue;
    } else if (next && !next.startsWith("--")) {
      result[rawKey] = next;
      i++;
    } else {
      result[rawKey] = true;
    }
  }
  return result;
}

function redactConfig(config) {
  return {
    oauth_mode: config.public_client_id ? "public_client_pkce" : "confidential_client",
    ...config,
    client_secret: config.client_secret ? "********" : undefined
  };
}

function createPkcePair() {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHelp() {
  console.log(`zoom-docs-cli

Usage:
  zoom-docs-cli config set [--public-client-id ID] [--redirect-uri URL] [--clear-confidential]
  zoom-docs-cli config set --client-id ID --client-secret SECRET [--redirect-uri URL]
  zoom-docs-cli config show
  zoom-docs-cli auth login
  zoom-docs-cli auth logout
  zoom-docs-cli token status
  zoom-docs-cli get <docs.zoom.us/doc URL | fileId> [--out FILE] [--json]
  zoom-docs-cli metadata <docs.zoom.us/doc URL | fileId>
  zoom-docs-cli root [userId]
  zoom-docs-cli children <docs.zoom.us/doc URL | fileId>
  zoom-docs-cli collaborators <docs.zoom.us/doc URL | fileId>
  zoom-docs-cli general-access <docs.zoom.us/doc URL | fileId>
  zoom-docs-cli import-content --file FILE.md [--file-name NAME] [--parent-id FILE_ID]
  zoom-docs-cli create [--file-name NAME] [--file-type doc|folder|data_table] [--parent-id FILE_ID]
  zoom-docs-cli delete <docs.zoom.us/doc URL | fileId> --yes

Environment:
  ZOOM_PUBLIC_CLIENT_ID Defaults to ${DEFAULT_PUBLIC_CLIENT_ID}
  ZOOM_CLIENT_ID
  ZOOM_CLIENT_SECRET
  ZOOM_REDIRECT_URI     Defaults to ${DEFAULT_REDIRECT_URI}

Required Zoom app scopes:
  ${REQUIRED_SCOPES.join(" or ")}
`);
}
