#!/usr/bin/env node
// tts 用例查看器 —— 一个零依赖的本地 HTTP 服务，给 typescript/cases/tts 提供浏览 + 逐字回放。
//
// 用法:
//   node typescript/tools/cases-viewer/server.mjs [--port 7799] [--host 127.0.0.1]
//   npm run tts:view
//
// 数据来源:
//   typescript/cases/tts/<success|todo>/<类别>/<名字>.ts   用例源码
//   .../<名字>.ast   ts-ast-line 快照；不存在时按需实时计算（不写盘）
//   .../<名字>.md    逐字符 token 树快照；不存在时按需从 build/ts 实时生成（不写盘）
//
// 所有读取接口都不改仓库；只有 POST /api/write-docs 会把 .md/.ast 写回用例目录。
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseToAstLine } from "../ts-ast-line.mjs";
import { traceSteps, renderMarkdown } from "../gen-case-docs.mjs";
import { parserAvailable, traceActual } from "../shape-actual.mjs";
import { parseStepsFromMarkdown } from "./md-steps.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const CASES = path.join(ROOT, "typescript", "cases", "tts");
const GATE = path.join(CASES, "run.mjs");
const PUBLIC = path.join(HERE, "public");
const BUILD = path.join(ROOT, "build", "ts");
const BUILD_ENTRY = path.join(BUILD, "typescript", "shapes", "files", "source-file-shape.js");
const LOG_PREFIX = "[tts-view]";

// ---------------------------------------------------------------------------
// 命令行参数
// ---------------------------------------------------------------------------

function parseArgv(argv) {
  const options = { port: 7799, host: "127.0.0.1" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(`用法: node typescript/tools/cases-viewer/server.mjs [选项]

  --port <n>   监听端口（默认 7799，被占用时自动向后找）
  --host <h>   监听地址（默认 127.0.0.1，只允许本机访问）
  --help       显示本帮助
`);
      process.exit(0);
    }
    if (arg === "--port" || arg === "-p") {
      options.port = Number(argv[++i]);
      continue;
    }
    if (arg === "--host") {
      options.host = argv[++i];
      continue;
    }
    if (/^\d+$/.test(arg)) {
      options.port = Number(arg);
    }
  }
  if (!Number.isInteger(options.port) || options.port <= 0 || options.port > 65535) {
    throw new Error(`端口不合法: ${options.port}`);
  }
  return options;
}

// ---------------------------------------------------------------------------
// 用例扫描
// ---------------------------------------------------------------------------

const toPosix = (value) => value.split(path.sep).join("/");
const relToCases = (absolute) => toPosix(path.relative(CASES, absolute));

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

function buildTree(cases) {
  const root = { children: new Map() };
  for (const item of cases) {
    const parts = item.group === "" ? [] : item.group.split("/");
    let node = root;
    let trail = "";
    for (const part of parts) {
      trail = trail === "" ? part : `${trail}/${part}`;
      if (!node.children.has(part)) {
        node.children.set(part, { path: trail, name: part, children: new Map(), total: 0, direct: 0, withMd: 0, withAst: 0, withInfer: 0 });
      }
      node = node.children.get(part);
      node.total++;
      node.withMd += item.hasMd ? 1 : 0;
      node.withAst += item.hasAst ? 1 : 0;
      node.withInfer += item.hasInfer ? 1 : 0;
    }
    if (node !== root) {
      node.direct++;
    }
  }
  const toArray = (node) => [...node.children.values()]
    .map((child) => ({
      path: child.path,
      name: child.name,
      depth: child.path.split("/").length - 1,
      total: child.total,
      direct: child.direct,
      withMd: child.withMd,
      withAst: child.withAst,
      withInfer: child.withInfer,
      children: toArray(child),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return toArray(root);
}

function scanCases() {
  const files = walk(CASES, []);
  const cases = [];
  for (const full of files) {
    const rel = relToCases(full);
    const parts = rel.split("/");
    const id = rel.replace(/\.ts$/, "");
    const name = parts[parts.length - 1].replace(/\.ts$/, "");
    const group = parts.slice(0, -1).join("/");
    const status = parts[0] === "todo" ? "todo" : "success";
    const base = full.replace(/\.ts$/, "");
    let stat = null;
    try {
      stat = fs.statSync(full);
    } catch {
      /* 文件刚好被删掉：跳过 */
    }
    if (stat === null) {
      continue;
    }
    const source = fs.readFileSync(full, "utf8");
    cases.push({
      id,
      rel,
      name,
      group,
      status,
      category: parts[parts.length - 2] ?? "",
      hasMd: fs.existsSync(`${base}.md`),
      hasAst: fs.existsSync(`${base}.ast`),
      hasInfer: fs.existsSync(`${base}.infer`),
      bytes: stat.size,
      mtime: stat.mtimeMs,
      source,
    });
  }
  cases.sort((a, b) => (a.group === b.group ? a.name.localeCompare(b.name) : a.group.localeCompare(b.group)));
  return cases;
}

function buildInfo() {
  const available = fs.existsSync(BUILD_ENTRY);
  let mtime = null;
  if (available) {
    try {
      mtime = fs.statSync(BUILD_ENTRY).mtimeMs;
    } catch {
      mtime = null;
    }
  }
  return { available, mtime, path: toPosix(path.relative(ROOT, BUILD)) };
}

function readDocs() {
  const docs = [];
  for (const name of ["tts.md", "index.md"]) {
    const full = path.join(CASES, name);
    try {
      docs.push({ name, rel: toPosix(path.relative(ROOT, full)), text: fs.readFileSync(full, "utf8") });
    } catch {
      /* 不存在就算了 */
    }
  }
  return docs;
}

// ---------------------------------------------------------------------------
// 单个用例：源码 / AST / 逐字步骤
// ---------------------------------------------------------------------------

function errorMessage(error) {
  if (error === null || error === undefined) {
    return "未知错误";
  }
  const message = error.Message ?? error.message ?? error;
  const text = typeof message === "string" ? message : JSON.stringify(message);
  return String(text ?? error).trim().split(/\r?\n/).slice(0, 4).join("\n");
}

function loadCase(cases, id) {
  const found = cases.find((item) => item.id === id);
  if (found === undefined) {
    return null;
  }
  return found;
}

function makeStepsFromSource(source, fileName) {
  const steps = traceSteps(source, fileName);
  return steps.map((step) => {
    // traceSteps 的 quoted 是 JSON.stringify 过的（`"a"`）；case.md 解析路径给出的是裸字符，
    // 统一成裸字符，前端好统一显示。
    let quoted = step.quoted ?? null;
    if (typeof quoted === "string") {
      try {
        quoted = JSON.parse(quoted);
      } catch {
        /* 保持原样 */
      }
    }
    return {
      label: step.label,
      index: step.label === "EOF" ? null : Number(step.label.replace(/^char\s+/, "")),
      quoted,
      tree: step.tree,
    };
  });
}

function casePayload(item, build) {
  const absolute = path.join(CASES, item.rel);
  const base = absolute.replace(/\.ts$/, "");
  const payload = {
    id: item.id,
    rel: item.rel,
    name: item.name,
    group: item.group,
    status: item.status,
    category: item.category,
    ts: fs.readFileSync(absolute, "utf8"),
    ast: null,
    infer: null,
    md: null,
    steps: null,
    build,
  };

  // AST：优先用 .ast 夹具，同时算一遍当前 ts-ast-line，好判断夹具是否过期。
  let fixtureAst = null;
  let fixtureError = null;
  if (item.hasAst) {
    try {
      fixtureAst = fs.readFileSync(`${base}.ast`, "utf8");
    } catch (error) {
      fixtureError = errorMessage(error);
    }
  }
  let generatedAst = null;
  let generatedAstError = null;
  try {
    generatedAst = parseToAstLine(payload.ts, item.name) + "\n";
  } catch (error) {
    generatedAstError = errorMessage(error);
  }
  payload.ast = {
    text: fixtureAst ?? generatedAst,
    origin: fixtureAst !== null ? "fixture" : generatedAst !== null ? "generated" : "error",
    generated: generatedAst,
    generatedError: generatedAstError,
    fixtureError,
    stale: fixtureAst !== null && generatedAst !== null ? fixtureAst !== generatedAst : null,
  };

  // case.infer：LLM 判定的「每个形状最早在哪一格确定」，只读，缺失就是没有。
  let inferText = null;
  let inferError = null;
  if (item.hasInfer) {
    try {
      inferText = fs.readFileSync(`${base}.infer`, "utf8");
    } catch (error) {
      inferError = errorMessage(error);
    }
  }
  // 有 .infer 时顺便算一遍 shape token 的 created at（build/ts），供 case.ast 页逐行对拍。
  let creation = null;
  let creationError = null;
  if (inferText !== null && parserAvailable()) {
    try {
      const actual = traceActual(payload.ts, item.name);
      creation = {};
      for (const [key, char] of actual.created) {
        creation[key] = char;
      }
    } catch (error) {
      creationError = errorMessage(error);
    }
  }
  payload.infer = inferText === null
    ? null
    : { text: inferText, origin: "fixture", error: inferError, creation, creationError };

  // case.md：文件在就用它的逐字快照；不在就从 build/ts 实时推进（不写盘）。
  let mdText = null;
  if (item.hasMd) {
    try {
      mdText = fs.readFileSync(`${base}.md`, "utf8");
    } catch {
      mdText = null;
    }
  }

  if (mdText !== null) {
    const parsed = parseStepsFromMarkdown(mdText);
    payload.md = { text: mdText, origin: "fixture" };
    if (parsed.steps.length > 0) {
      payload.steps = { origin: "md", title: parsed.title, steps: parsed.steps, error: null };
    } else {
      payload.steps = { origin: "empty", title: parsed.title, steps: [], error: "case.md 里没有解析出任何步骤" };
    }
  } else if (build.available) {
    try {
      const steps = makeStepsFromSource(payload.ts, item.name);
      payload.steps = { origin: "generated", title: "", steps, error: null };
    } catch (error) {
      payload.steps = { origin: "error", title: "", steps: [], error: errorMessage(error) };
    }
  } else {
    payload.steps = {
      origin: "unavailable",
      title: "",
      steps: [],
      error: `没有 case.md，且 ${build.path} 不存在：先跑 npm run build，或用 node typescript/cases/tts/run.mjs --write-index`,
    };
  }

  return payload;
}

// ---------------------------------------------------------------------------
// 对拍（run.mjs）
// ---------------------------------------------------------------------------

function runNode(args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill();
      resolve({ code: null, stdout, stderr: `${stderr}\n[timeout]`, timedOut: true });
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: String(error), timedOut: false });
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut: false });
    });
  });
}

function parseGateOutput(stdout) {
  const passed = [];
  const failures = {};
  for (const line of stdout.split(/\r?\n/)) {
    let match = /^PASS (.+)$/.exec(line);
    if (match !== null) {
      passed.push(stripCasePrefix(match[1].trim()));
      continue;
    }
    match = /^FAIL (.+?): (.*)$/.exec(line);
    if (match !== null) {
      failures[stripCasePrefix(match[1].trim())] = match[2].trim();
    }
  }
  return { passed, failures };
}

function stripCasePrefix(relPath) {
  const prefix = "typescript/cases/tts/";
  const trimmed = relPath.startsWith(prefix) ? relPath.slice(prefix.length) : relPath;
  // 用例 id 不带扩展名：success/statements/break
  return trimmed.replace(/\.ts$/, "");
}

async function checkOne(item) {
  const result = await runNode([GATE, path.join(CASES, item.rel)], 120000);
  const parsed = parseGateOutput(result.stdout);
  return {
    ok: result.code === 0,
    exit: result.code,
    reason: parsed.failures[item.id] ?? null,
    stdout: result.stdout,
    stderr: result.stderr,
    passed: result.code === 0,
    timedOut: result.timedOut,
  };
}

async function checkAll() {
  const startedAt = Date.now();
  const result = await runNode([GATE, "--all", "--list"], 300000);
  const parsed = parseGateOutput(result.stdout);
  return {
    ok: result.code === 0,
    exit: result.code,
    passed: parsed.passed,
    failures: parsed.failures,
    stdout: result.stdout,
    stderr: result.stderr,
    elapsedMs: Date.now() - startedAt,
  };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const CONTENT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".json", "application/json; charset=utf-8"],
  [".ico", "image/x-icon"],
]);

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    "cache-control": "no-store",
  });
  res.end(text);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.trim() === "") {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(res, urlPath) {
  const relative = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath.replace(/^\//, ""));
  const target = path.resolve(PUBLIC, relative);
  if (!target.startsWith(PUBLIC + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404");
    return;
  }
  const type = CONTENT_TYPES.get(path.extname(target).toLowerCase()) ?? "application/octet-stream";
  const body = fs.readFileSync(target);
  res.writeHead(200, { "content-type": type, "content-length": body.length, "cache-control": "no-cache" });
  res.end(body);
}

async function handle(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = url.pathname;

  if (route === "/api/index") {
    const cases = scanCases();
    const stats = {
      total: cases.length,
      success: cases.filter((item) => item.status === "success").length,
      todo: cases.filter((item) => item.status === "todo").length,
      withMd: cases.filter((item) => item.hasMd).length,
      withAst: cases.filter((item) => item.hasAst).length,
      withInfer: cases.filter((item) => item.hasInfer).length,
      bytes: cases.reduce((sum, item) => sum + item.bytes, 0),
    };
    sendJson(res, 200, {
      root: toPosix(path.relative(ROOT, CASES)),
      gate: toPosix(path.relative(ROOT, GATE)),
      generatedAt: Date.now(),
      stats,
      groups: buildTree(cases),
      cases: cases.map((item) => ({
        id: item.id,
        rel: item.rel,
        name: item.name,
        group: item.group,
        status: item.status,
        category: item.category,
        hasMd: item.hasMd,
        hasAst: item.hasAst,
        hasInfer: item.hasInfer,
        bytes: item.bytes,
        source: item.source,
      })),
      docs: readDocs(),
      build: buildInfo(),
    });
    return;
  }

  if (route === "/api/case") {
    const id = url.searchParams.get("id") ?? "";
    const cases = scanCases();
    const item = loadCase(cases, id);
    if (item === null) {
      sendJson(res, 404, { error: `找不到用例: ${id}` });
      return;
    }
    const build = buildInfo();
    sendJson(res, 200, casePayload(item, build));
    return;
  }

  if (route === "/api/steps" && req.method === "GET") {
    const id = url.searchParams.get("id") ?? "";
    const cases = scanCases();
    const item = loadCase(cases, id);
    if (item === null) {
      sendJson(res, 404, { error: `找不到用例: ${id}` });
      return;
    }
    const build = buildInfo();
    if (!build.available) {
      sendJson(res, 200, { origin: "unavailable", steps: [], error: `缺少 ${build.path}：先跑 npm run build` });
      return;
    }
    try {
      const source = fs.readFileSync(path.join(CASES, item.rel), "utf8");
      sendJson(res, 200, { origin: "generated", title: "", steps: makeStepsFromSource(source, item.name), error: null });
    } catch (error) {
      sendJson(res, 200, { origin: "error", steps: [], error: errorMessage(error) });
    }
    return;
  }

  if (route === "/api/write-docs" && req.method === "POST") {
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      sendJson(res, 400, { error: errorMessage(error) });
      return;
    }
    const cases = scanCases();
    const item = loadCase(cases, String(body.id ?? ""));
    if (item === null) {
      sendJson(res, 404, { error: `找不到用例: ${body.id}` });
      return;
    }
    const build = buildInfo();
    if (!build.available) {
      sendJson(res, 400, { error: `缺少 ${build.path}：先跑 npm run build` });
      return;
    }
    try {
      const absolute = path.join(CASES, item.rel);
      const source = fs.readFileSync(absolute, "utf8");
      const md = renderMarkdown(source, item.name);
      const ast = parseToAstLine(source, item.name) + "\n";
      const mdPath = absolute.replace(/\.ts$/, ".md");
      const astPath = absolute.replace(/\.ts$/, ".ast");
      fs.writeFileSync(mdPath, md, "utf8");
      fs.writeFileSync(astPath, ast, "utf8");
      sendJson(res, 200, {
        ok: true,
        written: [toPosix(path.relative(ROOT, mdPath)), toPosix(path.relative(ROOT, astPath))],
        case: casePayload(loadCase(scanCases(), item.id) ?? item, build),
      });
    } catch (error) {
      sendJson(res, 500, { error: errorMessage(error) });
    }
    return;
  }

  if (route === "/api/check" && req.method === "POST") {
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      sendJson(res, 400, { error: errorMessage(error) });
      return;
    }
    const cases = scanCases();
    const item = loadCase(cases, String(body.id ?? ""));
    if (item === null) {
      sendJson(res, 404, { error: `找不到用例: ${body.id}` });
      return;
    }
    const result = await checkOne(item);
    sendJson(res, 200, { id: item.id, ...result });
    return;
  }

  if (route === "/api/check-all" && req.method === "POST") {
    const result = await checkAll();
    sendJson(res, 200, result);
    return;
  }

  if (route === "/api/doc") {
    const name = url.searchParams.get("name") ?? "";
    const full = path.join(CASES, name);
    if (!full.startsWith(CASES + path.sep) || !fs.existsSync(full)) {
      sendJson(res, 404, { error: `找不到文档: ${name}` });
      return;
    }
    sendJson(res, 200, { name, text: fs.readFileSync(full, "utf8") });
    return;
  }

  if (route.startsWith("/api/")) {
    sendJson(res, 404, { error: `未知接口: ${route}` });
    return;
  }

  serveStatic(res, route);
}

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------

function main() {
  const options = parseArgv(process.argv.slice(2));
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: errorMessage(error) });
      } else {
        res.end();
      }
    });
  });

  let attempt = 0;
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attempt < 10) {
      attempt++;
      server.listen(options.port + attempt, options.host);
      return;
    }
    console.error(`${LOG_PREFIX} 启动失败: ${error.message}`);
    process.exitCode = 1;
  });

  server.on("listening", () => {
    const address = server.address();
    const host = address.address === "::" || address.address === "0.0.0.0" ? "127.0.0.1" : address.address;
    const build = buildInfo();
    const count = scanCases().length;
    console.log(`${LOG_PREFIX} http://${host}:${address.port}/`);
    console.log(`${LOG_PREFIX} 用例: ${toPosix(path.relative(ROOT, CASES))}（${count} 个 .ts）`);
    console.log(`${LOG_PREFIX} build/ts: ${build.available ? "可用（缺 case.md 的用例可实时生成逐字）" : "缺失（只显示 case.md 已有快照）"}`);
    console.log(`${LOG_PREFIX} Ctrl+C 退出`);
  });

  server.listen(options.port, options.host);

  process.on("SIGINT", () => {
    console.log(`\n${LOG_PREFIX} 关闭`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}

main();
