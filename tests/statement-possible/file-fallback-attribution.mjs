#!/usr/bin/env node
// Stage 5d-8c：**文件级 fallback 归因探针**（度量，零行为变化）。
//
// 它回答一个问题：默认解析这套固定语料时，还有哪些用例会走**整条文件**的 legacy 重解析
// （`SourceFileRunner.Parse` 的 `EnableFileFallback` 分支），以及**新路径到底在哪一格抛了什么错**。
//
// 做法（两段，与 `tmp/fallback-attrib.mjs` 同一手法，这里是入库版）：
//   A 段：`EnableFileFallback = true` 正常解析，挑出 `StatementRouteUtil.FileFallbackCount` 增量为 1 的用例；
//   B 段：对这些用例把 `EnableFileFallback = false` 再解析一次，让新路径的异常**直接抛出来**，
//         记录最内层 message（沿 `InnerException` / `cause` 走到底）作为归因。
//
// 两段都不改语料、不改任何开关的默认值；B 段只对**已经确认会 fallback** 的用例重跑一次，
// 重跑时 `FileFallbackCount` 在 `finally` 里清零，所以量出来的集合与 A 段逐条相同。
//
// 语料与 `legacy-retirement.mjs` 完全同源（同一套 CORPUS 常量、同一套 ts-invalid 跳过口径），
// 这样两边的 `FileFallbackCount` 必定同数——探针会自己核对这一点。
//
// 用法：
//   node tests/statement-possible/file-fallback-attribution.mjs           # 归因表 + 判决（默认）
//   node tests/statement-possible/file-fallback-attribution.mjs --json    # 机器可读
//   node tests/statement-possible/file-fallback-attribution.mjs --top=N   # 每类最多列 N 条（默认 10）
//
// 退出码：0 = 观测集合是 EXPECTED 的子集（每条不超过登记条数）；1 = 出现**新**的归因类别 /
// 某类条数超过登记值 / 有 crash / 与 legacy-retirement 的总数口径不一致；2 = 用法或语料错误。
//
// **EXPECTED 是「本阶段收尾时的事实」，不是目标值**：目标是 0。这里登记的是**已归因、已知原因、
// 本阶段修不掉**的四类（见 HANDOFF-5d8c §4）。任何新增类别都会让探针红——这正是它的用途：
// 后续阶段改判界 / 改建造器时，file fallback 的**原因**变了就会被看见，而不是只看一个总数。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(root, "build", "ts", rel));
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementShapeAst } = load("typescript/tokens/statements/statement-shape-ast.js");
const { StatementLegacyMetrics } = load("typescript/tokens/statements/statement-legacy-metrics.js");

// 与 `legacy-retirement.mjs` 的 CORPUS 逐字相同（两边必须量同一套用例）。
const CORPUS = [
  { root: "tests/cases/token", recursive: true, mode: "file" },
  { root: "typescript/cases", recursive: false, mode: "file-or-lines" },
];

// 本阶段收尾后的归因台账：message 是**最内层**异常的文本，count 是该类的用例条数。
const EXPECTED = [
  {
    message: "SourceRange is not set: SourceRange.Start < 0 || SourceRange.End < 0",
    count: 5,
    note: "块内声明壳晚建时把**已经打开的 `{…}` 括号**搬进壳：括号的闭合事件留在原父单元，"
      + "`TryToClose` 拿到 End=-1。触发形是 `{ import { a } from 'm'; }` / `{ export { a }; }` / `{ const {a} = o; }`",
  },
  {
    message: "不支持的对象类型成员",
    count: 4,
    note: "函数 / 构造签名的**返回类型字面量**（`type T = (a: A) => { b: B }`）：`=>` 后面那个 `{` 在"
      + "语句层被当成块语句先建掉，类型别名建造器拿到的是坏切片",
  },
  {
    message: "CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 2）",
    count: 3,
    note: "`type` 与名字之间是 CR / U+2028 / U+2029：`type` 是标识符、应为两条 ExpressionStatement，"
      + "但根终结候选与声明候选在同一格同时 Accept",
  },
  {
    message: "表达式意外结束",
    count: 1,
    note: "`a++; --` ⏎ `a;`：前缀 `--` 的操作数写在下一行，表达式壳把 `--` 自己收了尾",
  },
];

function parseArgs(argv) {
  const args = { json: false, top: 10 };
  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg.startsWith("--top=")) {
      const value = Number(arg.slice("--top=".length));
      if (!Number.isInteger(value) || value < 0) fail(`--top 需要非负整数，收到 ${arg}`);
      args.top = value;
    } else if (arg === "--help" || arg === "-h") {
      console.log("用法：node tests/statement-possible/file-fallback-attribution.mjs [--json] [--top=N]");
      process.exit(0);
    } else fail(`不认识的选项：${arg}`);
  }
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function toPosix(rel) {
  return rel.split(path.sep).join("/");
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// 与 `legacy-retirement.mjs` 的 `buildCases` 同口径：整文件合法 TS → 一文件一用例；
// 否则（只对 `typescript/cases`）退化成逐行用例，单行不合法则跳过。
function buildCases() {
  const files = [];
  for (const entry of CORPUS) {
    const base = path.join(root, entry.root);
    if (!fs.existsSync(base)) fail(`语料目录不存在：${entry.root}`);
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir).sort()) {
        const abs = path.join(dir, name);
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) {
          if (entry.recursive) walk(abs);
          continue;
        }
        if (stat.isFile() && name.endsWith(".ts")) files.push({ entry, rel: toPosix(path.relative(root, abs)) });
      }
    };
    walk(base);
  }
  files.sort((left, right) => (left.rel < right.rel ? -1 : left.rel > right.rel ? 1 : 0));
  const cases = [];
  for (const file of files) {
    const text = stripBom(fs.readFileSync(path.join(root, file.rel), "utf8"));
    const broken = (source, name) => {
      const sourceFile = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      return sourceFile.parseDiagnostics !== undefined && sourceFile.parseDiagnostics.length > 0;
    };
    if (!broken(text, file.rel)) {
      cases.push({ key: file.rel, source: text });
      continue;
    }
    if (file.entry.mode !== "file-or-lines") continue;
    const lines = text.split("\n");
    for (let at = 0; at < lines.length; at++) {
      const line = lines[at].trim();
      if (line.length === 0 || line.startsWith("//")) continue;
      const key = `${file.rel}:L${at + 1}`;
      if (broken(line, key)) continue;
      cases.push({ key, source: line });
    }
  }
  return cases;
}

// xl 的异常是普通类实例（`Message` / `InnerException` 字段），不是 JS Error，所以要沿链自己走。
function messageOf(error) {
  if (error === null || error === undefined) return "<null>";
  if (typeof error === "string") return error.split("\n")[0];
  const raw = error.Message !== undefined ? error.Message : error.message;
  if (raw === undefined) return String(error);
  const text = String(raw);
  const first = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0)[0];
  return first === undefined ? text : first;
}

function innermostMessage(error) {
  let current = error;
  let message = messageOf(error);
  let depth = 0;
  while (current !== null && current !== undefined && depth < 8) {
    const next = current.InnerException !== undefined ? current.InnerException : current.cause;
    if (next === null || next === undefined) break;
    current = next;
    message = messageOf(current);
    depth += 1;
  }
  return message;
}

function resetCounters() {
  StatementLegacyMetrics.Reset();
  StatementShapeAst.TotalDeclined = 0;
  StatementShapeAst.TotalShapeAst = 0;
  StatementRouteUtil.FileFallbackCount = 0;
}

function measure(source, key, allowFallback) {
  resetCounters();
  const saved = StatementRouteUtil.EnableFileFallback;
  StatementRouteUtil.EnableFileFallback = allowFallback;
  let fallbacks = 0;
  try {
    SourceFileRunner.Parse(source, key);
    fallbacks = StatementRouteUtil.FileFallbackCount;
    return { crashed: false, message: null, fallbacks };
  } catch (error) {
    return { crashed: true, message: innermostMessage(error), fallbacks };
  } finally {
    StatementRouteUtil.EnableFileFallback = saved;
    StatementRouteUtil.FileFallbackCount = 0;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cases = buildCases();
  const triggers = [];
  const crashes = [];
  for (const item of cases) {
    const normal = measure(item.source, item.key, true);
    if (normal.crashed) {
      // 默认态（兜底开着）还抛错 = 两条路都失败，单独记，判决必红。
      crashes.push({ key: item.key, message: normal.message });
      continue;
    }
    if (normal.fallbacks === 0) continue;
    const raw = measure(item.source, item.key, false);
    triggers.push({ key: item.key, message: raw.message });
  }

  const clusters = new Map();
  for (const item of triggers) {
    if (!clusters.has(item.message)) clusters.set(item.message, []);
    clusters.get(item.message).push(item.key);
  }
  const observed = [...clusters.entries()]
    .map(([message, keys]) => ({ message, count: keys.length, keys: keys.sort() }))
    .sort((left, right) => right.count - left.count || (left.message < right.message ? -1 : 1));

  const failures = [];
  if (crashes.length > 0) failures.push(`默认态 crash ${crashes.length} 个（两条路都失败）`);
  const expectedByMessage = new Map(EXPECTED.map((entry) => [entry.message, entry]));
  for (const cluster of observed) {
    const expected = expectedByMessage.get(cluster.message);
    if (expected === undefined) {
      failures.push(`出现未归因的新类别（${cluster.count} 条）：${cluster.message}`);
    } else if (cluster.count > expected.count) {
      failures.push(`类别条数超过登记值：${cluster.message}（登记 ${expected.count}，实际 ${cluster.count}）`);
    }
  }
  const registeredTotal = EXPECTED.reduce((sum, entry) => sum + entry.count, 0);
  const verdict = failures.length === 0 ? "PASS" : "FAIL";

  if (args.json) {
    process.stdout.write(JSON.stringify({
      cases: cases.length,
      fallbacks: triggers.length,
      registeredTotal,
      crashes,
      clusters: observed,
      expected: EXPECTED,
      verdict,
      failures,
    }, null, 2) + "\n");
    if (verdict !== "PASS") process.exit(1);
    return;
  }

  const lines = [];
  lines.push(`[file-fallback-attribution] cases=${cases.length} fallbacks=${triggers.length}（登记 ${registeredTotal}）crash=${crashes.length}`);
  lines.push("按最内层异常聚类（只列本阶段收尾时仍存在的类；新类别会让判决红）：");
  for (const cluster of observed) {
    const expected = expectedByMessage.get(cluster.message);
    lines.push("");
    lines.push(`### ${cluster.count} 条${expected === undefined ? "  **未登记**" : expected.count === cluster.count ? "" : `（登记 ${expected.count}）`} —— ${cluster.message}`);
    if (expected !== undefined) {
      lines.push(`    原因：${expected.note}`);
    }
    for (const key of cluster.keys.slice(0, args.top)) lines.push(`      - ${key}`);
    if (cluster.keys.length > args.top) lines.push(`      … 其余 ${cluster.keys.length - args.top} 条见 --json`);
  }
  if (crashes.length > 0) {
    lines.push("");
    lines.push(`默认态 crash ${crashes.length} 个：`);
    for (const crash of crashes.slice(0, 10)) lines.push(`      - ${crash.key}: ${crash.message}`);
  }
  lines.push("");
  if (verdict === "PASS") {
    lines.push(`verdict: PASS —— 观测集合是登记台账的子集（${triggers.length} ≤ ${registeredTotal}），没有新类别`);
  } else {
    lines.push("verdict: FAIL ——");
    for (const failure of failures) lines.push(`  - ${failure}`);
  }
  console.log(lines.join("\n"));
  if (verdict !== "PASS") process.exit(1);
}

main();
