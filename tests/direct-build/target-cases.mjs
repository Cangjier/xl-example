#!/usr/bin/env node
// 目标 case 验证 harness（任务 T14 / M4）—— tests/direct-build/target-cases.mjs
//
// 规格来源（只读）：
//   _coord/CONTRACT.md §6          —— CASES 10 条 / A1–A8 断言 / CLI / 输出 / 退出码
//   _coord/DESIGN-all-possible.md §8 —— 三件套（AST 逐字段、XML、直建计数）
//   _coord/TARGET-CASES.md         —— 验证口径（只跑目标 case，不跑全量门）
//   _coord/HARNESS.md              —— 构建链与已知坑（build/ts 入口、EOF 口径）
//   _coord/probe-target-cases.mjs  —— 输出行同名同格式（SOURCE/TS-AST/CJ-AST/AST-MATCH(ts)/XML）
//
// 本脚本只读：不改产品源码、不改仓库文件、不跑任何全量门（gates/ast-json/coverage/samples）。
//
// 用法（在克隆根目录）：
//   node tests/direct-build/target-cases.mjs
//   node tests/direct-build/target-cases.mjs --only=2*3+1 --trace --strict
//   node tests/direct-build/target-cases.mjs --expect-direct        # 断言直建被使用
//   node tests/direct-build/target-cases.mjs --json                 # 读数 JSON 到 stdout
//
// 断言（CONTRACT §6）：
//   A1 cjAst(root.Data) JSON === sf.statements.map(tsAst) JSON（唯一归一表 ast-compare.mjs）
//   A2 同源解析两次 ToXmlString() 逐字节相同
//   A3 XML 非空且根下节点数 == TS 顶层语句数
//   A4 DirectBuildMetrics：StatementsBuilt>=1、Declined/IncompleteFallback/Errors/StrictViolations==0
//      （反例 `let x = f()` 相反：Declined>=1）
//   A5 --strict 时上述计数器仍全 0（strict 异常可能被上层 catch 吞掉 —— 看计数器，不看是否抛）
//   A6 StatementBuilder.prototype.Load 与 ExpressionBuilder.prototype.Load 调用计数 == 0
//      （反例不断言；--expect-direct 时强制）
//   A7 --trace 时 Traces 含 `insert(` 条目（仅对有二元运算符的 case 有意义）
//   A8 --expect-direct 时 A4/A6 强制；否则只报读数
//
// 基线/集成两态：
//   - 基线（M1–M3 未合入）：DirectBuildMetrics 模块不存在 → A4/A5/A7 记 SKIP（"未实现"），
//     A1–A3 全绿、A6 只报读数、退出码 0。脚本显式区分「没实现（absent）」与「实现错了（present-bad）」。
//   - 集成后：`--expect-direct`（通常再叠 --strict）→ A4/A6 强制；A4 在直建缺失/未接线/计数错时红。
//
// A6 的口径说明（CONTRACT §3.4 与 §6/A6 的字面冲突，这里按「零次事后 Build」的本意落地）：
//   CONTRACT §3.4 明令 DirectTokenUtil.OperatorToken 复用 `new ExpressionBuilder(...); builder.Load([unit], pos);
//   return builder.MakeOperatorToken(...)`，因此直建路径上 ExpressionBuilder.Load 的**合法**调用不为 0。
//   A6 要证明的是「旧路径事后 reparse 0 次」，所以：
//     loads = stmtLoads + (exprLoads - exprLoadsFromDirectTokenUtil)
//   A6 用 loads==0 判定；同时把 exprLoads 的原始计数一并打印，避免「数字对不上」的误读。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const REPO = path.resolve(import.meta.dirname, "..", "..");
const SEP = "=".repeat(72);

// ---------------------------------------------------------------------------
// CASES —— CONTRACT §6 的 10 条（第 10 条是范围外反例）
// expectInsert：该 case 含二元运算符，--trace 时才期望 Traces 里有 insert( 条目
// ---------------------------------------------------------------------------
const CASES = [
  { src: "let x = 2*3+1", note: "变量语句 + 二元优先级（* 先于 +）+ 无分号（ASI）", expectInsert: true },
  { src: "let x = 1;", note: "最简 let + 分号", expectInsert: false },
  { src: "const a = 2*3;", note: "const 声明 + 乘法", expectInsert: true },
  { src: "2*3+1", note: "表达式语句（裸表达式根）", expectInsert: true },
  { src: "let a=1,b=2", note: "多声明（逗号不是 AST 子节点）", expectInsert: false },
  { src: "2*(3+1)", note: "括号递归 + 二元优先级", expectInsert: true },
  { src: "-a*+b", note: "前缀一元（运算符 token 不进 Data）", expectInsert: true },
  { src: "let x = 2*3+1; let y=4*5+6;", note: "两条语句", expectInsert: true },
  { src: "let x = 1", note: "ASI：end 停在末代码单元，无 ; 节点", expectInsert: false },
  { src: "let x = f()", note: "范围外反例：调用表达式 → 期望显式 Decline，AST 仍 MATCH", counterexample: true, expectInsert: false },
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function usage() {
  return [
    "用法: node tests/direct-build/target-cases.mjs [--only=a,b] [--trace] [--strict] [--expect-direct] [--json]",
    "",
    "  --only=...      只跑指定 case：逗号分隔；全数字按 1 基序号，否则先精确匹配 source、再按子串匹配",
    "  --trace         打开 DirectBuildMetrics.TraceEnabled，并断言 Traces 含 insert(（A7）",
    "  --strict        打开 DirectBuildMetrics.Strict，并断言计数器仍全 0（A5）",
    "  --expect-direct 断言直建确实被使用：A4/A6 强制（CONTRACT §6 A8）",
    "  --json          stdout 只输出一份 JSON 读数（供存盘/报告）",
    "  --help          显示本帮助",
  ].join("\n");
}

function parseArgs(argv) {
  const flags = { only: null, trace: false, strict: false, expectDirect: false, json: false, help: false };
  const readValue = (i, inline, name) => {
    if (inline !== undefined) return { value: inline, next: i };
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`参数 --${name} 缺少值`);
    return { value: v, next: i + 1 };
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`无法识别的参数: ${arg}`);
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);
    const inline = eq >= 0 ? arg.slice(eq + 1) : undefined;
    switch (name) {
      case "only": {
        const r = readValue(i, inline, name);
        flags.only = r.value;
        i = r.next;
        break;
      }
      case "trace": flags.trace = true; break;
      case "strict": flags.strict = true; break;
      case "expect-direct": flags.expectDirect = true; break;
      case "json": flags.json = true; break;
      case "help": case "h": flags.help = true; break;
      default: throw new Error(`未知参数: --${name}`);
    }
  }
  return flags;
}

/** --only 选择：全数字=1 基序号；否则先精确匹配 source（若命中就只取精确的），再退化为子串。 */
function selectCases(cases, only) {
  if (only === null || only === undefined || only.trim() === "") {
    return cases.map((c, i) => ({ ...c, index: i + 1 }));
  }
  const tokens = only.split(",").map((s) => s.trim()).filter(Boolean);
  const picked = new Set();
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      if (n >= 1 && n <= cases.length) picked.add(n);
      continue;
    }
    const exact = cases.map((c, i) => (c.src === token ? i + 1 : 0)).filter(Boolean);
    if (exact.length > 0) {
      for (const n of exact) picked.add(n);
      continue;
    }
    for (let i = 0; i < cases.length; i += 1) {
      if (cases[i].src.includes(token)) picked.add(i + 1);
    }
  }
  if (picked.size === 0) {
    const list = cases.map((c, i) => `  ${i + 1}. ${JSON.stringify(c.src)}`).join("\n");
    throw new Error(`--only=${only} 没有匹配任何 case；可选：\n${list}`);
  }
  return cases
    .map((c, i) => ({ ...c, index: i + 1 }))
    .filter((c) => picked.has(c.index));
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------
const num = (v, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function readTextSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function walkFiles(dir, name, depth = 0, acc = []) {
  if (depth > 8) return acc;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, name, depth + 1, acc);
    else if (entry.name === name) acc.push(full);
  }
  return acc;
}

function firstDiff(ours, ts, trail = "$") {
  if (ours === ts) return null;
  if (ours === null || ts === null || typeof ours !== "object" || typeof ts !== "object") {
    return { trail, ours, ts };
  }
  const oursArr = Array.isArray(ours);
  const tsArr = Array.isArray(ts);
  if (oursArr !== tsArr) return { trail, ours, ts };
  if (oursArr) {
    if (ours.length !== ts.length) return { trail: `${trail}.length`, ours: ours.length, ts: ts.length };
    for (let i = 0; i < ours.length; i += 1) {
      const d = firstDiff(ours[i], ts[i], `${trail}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  const keys = new Set([...Object.keys(ours), ...Object.keys(ts)]);
  for (const key of keys) {
    const d = firstDiff(ours[key], ts[key], `${trail}.${key}`);
    if (d) return d;
  }
  return null;
}

const short = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined) return String(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

// ---------------------------------------------------------------------------
// 实现探测：DirectBuildMetrics / router / session 产物 / hooks
// ---------------------------------------------------------------------------
const buildDir = path.join(REPO, "build", "ts");
const directDir = path.join(buildDir, "typescript", "tokens", "direct");
const PATHS = {
  runner: path.join(buildDir, "typescript", "run", "source-file-runner.js"),
  statementShape: path.join(buildDir, "typescript", "tokens", "statements", "statement-shape.js"),
  statementBuilder: path.join(buildDir, "typescript", "tokens", "statements", "statement-builder.js"),
  expressionBuilder: path.join(buildDir, "typescript", "tokens", "expressions", "expression-builder.js"),
  directDir,
};

function discoverImplementation() {
  const metricsCandidate = path.join(directDir, "direct-build-metrics.js");
  let metricsFile = fs.existsSync(metricsCandidate) ? metricsCandidate : null;
  if (metricsFile === null) {
    const found = walkFiles(buildDir, "direct-build-metrics.js");
    if (found.length > 0) metricsFile = found[0];
  }

  const metrics = { state: "absent", file: metricsCandidate, Class: null, reason: "" };
  if (metricsFile !== null) {
    metrics.file = metricsFile;
    try {
      const require = createRequire(path.join(REPO, "package.json"));
      const mod = require(metricsFile);
      const Class =
        (mod && mod.DirectBuildMetrics) ||
        (mod && mod.default && mod.default.DirectBuildMetrics) ||
        (mod && typeof mod.Reset === "function" ? mod : null);
      if (!Class) {
        metrics.state = "broken";
        metrics.reason = "模块存在但没有导出 DirectBuildMetrics";
      } else {
        const requiredFields = [
          "Sessions", "StatementsBuilt", "Declined", "IncompleteFallback",
          "Errors", "StrictViolations", "LastDeclineReason", "LastError",
          "Strict", "TraceEnabled", "Traces",
        ];
        const missingFields = requiredFields.filter((key) => !(key in Class));
        const missingMethods = ["Reset", "Trace"].filter((key) => typeof Class[key] !== "function");
        if (missingFields.length > 0 || missingMethods.length > 0) {
          metrics.state = "broken";
          metrics.reason = [
            missingFields.length ? `缺字段 ${missingFields.join(",")}` : "",
            missingMethods.length ? `缺方法 ${missingMethods.join(",")}` : "",
          ].filter(Boolean).join("；");
        } else {
          metrics.state = "present";
          metrics.Class = Class;
        }
      }
    } catch (error) {
      metrics.state = "broken";
      metrics.reason = `require 失败: ${error && error.message ? error.message : String(error)}`;
    }
  }

  const statementShapeText = readTextSafe(PATHS.statementShape) || "";
  const hooks = statementShapeText.includes("DirectSession");
  const routerPresent = fs.existsSync(path.join(directDir, "direct-build-router.js"));
  let sessionFiles = [];
  try {
    // direct-build-session.js 是 DirectSession 接口（编译后无类），不算「某个族的 session」
    sessionFiles = fs
      .readdirSync(directDir)
      .filter((name) => name.endsWith("-session.js") && name !== "direct-build-session.js");
  } catch {
    sessionFiles = [];
  }

  let state;
  if (metrics.state === "broken") state = "broken";
  else if (metrics.state === "present" && hooks) state = "wired";
  else if (metrics.state === "present") state = "partial-metrics-only";
  else if (hooks || routerPresent) state = "partial-hooks-only";
  else state = "absent";

  return {
    state,
    metrics,
    hooks,
    routerPresent,
    sessionFiles,
    runners: {
      runner: fs.existsSync(PATHS.runner),
      statementBuilder: fs.existsSync(PATHS.statementBuilder),
      expressionBuilder: fs.existsSync(PATHS.expressionBuilder),
    },
  };
}

function describeImpl(impl) {
  const bits = [
    `state=${impl.state}`,
    `metrics=${impl.metrics.state}`,
    `hooks=${impl.hooks ? "present" : "absent"}`,
    `router=${impl.routerPresent ? "present" : "absent"}`,
    `sessions=${impl.sessionFiles.length}`,
  ];
  if (impl.metrics.state === "broken") bits.push(`metrics-error="${impl.metrics.reason}"`);
  return `IMPL: ${bits.join(" ")}`;
}

// ---------------------------------------------------------------------------
// 计数器：StatementBuilder.Load / ExpressionBuilder.Load（原型计数，不改源码）
// CONTRACT §6 A6 的「零次事后 Build」证据
// ---------------------------------------------------------------------------
function setupLoadCounters() {
  const counts = { stmt: 0, expr: 0, exprDirectTokenUtil: 0, exprOtherDirect: 0, exprLegacy: 0, unknownSamples: [] };
  const require = createRequire(path.join(REPO, "package.json"));
  let stmtClass = null;
  let exprClass = null;
  let error = null;
  try {
    ({ StatementBuilder: stmtClass } = require(PATHS.statementBuilder));
  } catch (e) {
    error = `StatementBuilder 加载失败: ${e.message}`;
  }
  try {
    ({ ExpressionBuilder: exprClass } = require(PATHS.expressionBuilder));
  } catch (e) {
    error = `${error ? `${error}；` : ""}ExpressionBuilder 加载失败: ${e.message}`;
  }

  const describeFrame = (stack) =>
    stack
      .split("\n")
      .slice(2, 5)
      .map((line) => line.trim())
      .join(" <- ");

  let stmtPatched = false;
  let exprPatched = false;
  if (stmtClass && typeof stmtClass.prototype.Load === "function") {
    const original = stmtClass.prototype.Load;
    stmtClass.prototype.Load = function patchedStatementLoad(...args) {
      counts.stmt += 1;
      return original.apply(this, args);
    };
    stmtPatched = true;
  } else if (!error) {
    error = "StatementBuilder.prototype.Load 不存在";
  }

  if (exprClass && typeof exprClass.prototype.Load === "function") {
    const original = exprClass.prototype.Load;
    exprClass.prototype.Load = function patchedExpressionLoad(...args) {
      counts.expr += 1;
      const stack = new Error().stack || "";
      if (stack.includes("direct-token-util")) {
        counts.exprDirectTokenUtil += 1;
      } else if (stack.includes(`${path.sep}direct${path.sep}`)) {
        counts.exprOtherDirect += 1;
        if (counts.unknownSamples.length < 3) counts.unknownSamples.push(describeFrame(stack));
      } else {
        counts.exprLegacy += 1;
      }
      return original.apply(this, args);
    };
    exprPatched = true;
  } else if (!error) {
    error = "ExpressionBuilder.prototype.Load 不存在";
  }

  const reset = () => {
    counts.stmt = 0;
    counts.expr = 0;
    counts.exprDirectTokenUtil = 0;
    counts.exprOtherDirect = 0;
    counts.exprLegacy = 0;
    counts.unknownSamples = [];
  };
  const snapshot = () => ({ ...counts, unknownSamples: [...counts.unknownSamples] });
  /** 旧路径事后 reparse 次数：StatementBuilder.Load + 非 DirectTokenUtil 的 ExpressionBuilder.Load。 */
  const effectiveLegacy = (snap) => snap.stmt + snap.exprOtherDirect + snap.exprLegacy;

  return { patched: stmtPatched && exprPatched, error, counts, reset, snapshot, effectiveLegacy };
}

// ---------------------------------------------------------------------------
// metrics 快照
// ---------------------------------------------------------------------------
function snapshotMetrics(Class) {
  const read = (key) => Class[key];
  return {
    sessions: num(read("Sessions")),
    statementsBuilt: num(read("StatementsBuilt")),
    declined: num(read("Declined")),
    incompleteFallback: num(read("IncompleteFallback")),
    errors: num(read("Errors")),
    strictViolations: num(read("StrictViolations")),
    lastDeclineReason: typeof read("LastDeclineReason") === "string" ? read("LastDeclineReason") : "",
    lastError: typeof read("LastError") === "string" ? read("LastError") : "",
    traces: Array.isArray(read("Traces")) ? read("Traces").slice(0, 256).map(String) : [],
    strict: Boolean(read("Strict")),
    traceEnabled: Boolean(read("TraceEnabled")),
  };
}

// ---------------------------------------------------------------------------
// 单次解析
// ---------------------------------------------------------------------------
function parseOnce(SourceFileRunner, src) {
  const started = process.hrtime.bigint();
  try {
    const root = SourceFileRunner.Parse(src, "case.ts");
    const xml = root && typeof root.ToXmlString === "function" ? root.ToXmlString() : null;
    return { root, xml, error: null, ms: Number(process.hrtime.bigint() - started) / 1e6 };
  } catch (error) {
    return { root: null, xml: null, error, ms: Number(process.hrtime.bigint() - started) / 1e6 };
  }
}

// ---------------------------------------------------------------------------
// 断言求值
// ---------------------------------------------------------------------------
function evaluateCase(ctx, c) {
  const { flags, impl, metricsOk, M, loads, SourceFileRunner, ts, tsAst, cjAst } = ctx;
  const counter = Boolean(c.counterexample);
  const expectDirect = flags.expectDirect;
  const a = {};
  const add = (id, status, detail, extra = {}) => {
    a[id] = { status, detail, ...extra };
  };

  // --- 解析两次（A2 的确定性；第二次只取 XML） ---
  loads.reset();
  let metricsError = null;
  if (metricsOk) {
    try {
      M.Strict = flags.strict;
      M.TraceEnabled = flags.trace;
      M.Reset();
    } catch (error) {
      metricsError = error && error.message ? error.message : String(error);
    }
  }
  const first = parseOnce(SourceFileRunner, c.src);
  const metrics = metricsOk && metricsError === null ? snapshotMetrics(M) : null;
  const loadSnap = loads.snapshot();
  const second = parseOnce(SourceFileRunner, c.src);

  const ours = first.root && Array.isArray(first.root.Data) ? first.root.Data.map(cjAst) : [];
  const sf = ts.createSourceFile("case.ts", c.src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tsSide = sf.statements.map(tsAst);
  const oursText = JSON.stringify(ours);
  const tsText = JSON.stringify(tsSide);

  // A1 —— AST 逐字段（唯一归一表 ast-compare.mjs）
  if (first.error) {
    add("A1", "FAIL", `PARSE-ERROR: ${first.error.message}`);
  } else if (oursText === tsText) {
    add("A1", "PASS", "AST 与 tsc 逐字段一致");
  } else {
    const diff = firstDiff(ours, tsSide);
    add(
      "A1",
      "FAIL",
      diff
        ? `AST 不一致 @ ${diff.trail}: ours=${short(diff.ours)} ts=${short(diff.ts)}`
        : "AST 不一致（JSON 文本不同但结构化 diff 为空）",
    );
  }

  // A2 —— XML 确定性
  const xml1 = first.xml;
  const xml2 = second.xml;
  if (first.error) {
    add("A2", "FAIL", `PARSE-ERROR: ${first.error.message}`);
  } else if (xml1 === null || xml2 === null) {
    add("A2", "FAIL", "SourceFileShape 没有 ToXmlString()，无法做 XML 指纹");
  } else if (xml1 === xml2) {
    add("A2", "PASS", `XML 两次逐字节一致（len=${xml1.length}）`);
  } else {
    let at = 0;
    while (at < xml1.length && at < xml2.length && xml1[at] === xml2[at]) at += 1;
    add(
      "A2",
      "FAIL",
      `两次 XML 不同（首次差异 @ char ${at}；len ${xml1.length} vs ${xml2.length}）: ` +
        `ours="${short(xml1.slice(at, at + 40))}" retry="${short(xml2.slice(at, at + 40))}"`,
    );
  }

  // A3 —— XML 非空 + 根下节点数 == TS 顶层语句数
  const nodeCount = first.root && Array.isArray(first.root.Data) ? first.root.Data.length : 0;
  if (first.error) {
    add("A3", "FAIL", `PARSE-ERROR: ${first.error.message}`);
  } else if (xml1 === null || xml1.length === 0) {
    add("A3", "FAIL", "XML 为空");
  } else if (nodeCount !== tsSide.length) {
    add("A3", "FAIL", `根下节点数 ${nodeCount} != TS 顶层语句数 ${tsSide.length}`);
  } else {
    add("A3", "PASS", `根下节点数=${nodeCount} == TS 顶层语句数=${tsSide.length}`);
  }

  // A4 —— 直建计数（enforced 仅 --expect-direct；否则 READ/ SKIP）
  const targetCountersOk = (m) =>
    m.statementsBuilt >= 1 &&
    m.declined === 0 &&
    m.incompleteFallback === 0 &&
    m.errors === 0 &&
    m.strictViolations === 0;
  const countersText = (m) =>
    `built=${m.statementsBuilt} declined=${m.declined} incomplete=${m.incompleteFallback} ` +
    `errors=${m.errors} strictViolations=${m.strictViolations}` +
    (m.lastDeclineReason ? ` lastDeclineReason=${JSON.stringify(m.lastDeclineReason)}` : "") +
    (m.lastError ? ` lastError=${JSON.stringify(m.lastError)}` : "");
  const missingBits = (m) => {
    const bits = [];
    if (m.statementsBuilt < 1) bits.push("StatementsBuilt<1");
    if (m.declined !== 0) bits.push("Declined!=0");
    if (m.incompleteFallback !== 0) bits.push("IncompleteFallback!=0");
    if (m.errors !== 0) bits.push("Errors!=0");
    if (m.strictViolations !== 0) bits.push("StrictViolations!=0");
    return bits;
  };
  if (!metricsOk) {
    const broken = impl.metrics.state === "broken";
    const label = broken ? "IMPLEMENTATION-BROKEN" : "IMPLEMENTATION-ABSENT";
    const why = impl.metrics.reason ? `: ${impl.metrics.reason}` : "";
    if (expectDirect) {
      add(
        "A4",
        "FAIL",
        `${label}: DirectBuildMetrics 不可用（state=${impl.metrics.state}${why}），--expect-direct 无法成立`,
        { enforced: true },
      );
    } else if (broken) {
      add(
        "A4",
        "FAIL",
        `${label}: DirectBuildMetrics 模块存在但不可用（state=broken${why}）——这是「实现错了」，不是「没实现」`,
      );
    } else {
      add("A4", "SKIP", `DirectBuildMetrics 未实现（state=absent）：只报读数，A4 暂不可判`);
    }
  } else if (metricsError) {
    add("A4", "FAIL", `DirectBuildMetrics.Reset() 抛错: ${metricsError}`);
  } else if (expectDirect && impl.state !== "wired") {
    add(
      "A4",
      "FAIL",
      `IMPLEMENTATION-UNWIRED: DirectBuildMetrics 已存在（state=${impl.state}），但 statement-shape 里没有 ` +
        `DirectSession hook（hooks=${impl.hooks}）——直建没有被接进语句壳，A4 无法成立`,
      { enforced: true },
    );
  } else {
    const want = counter ? metrics.declined >= 1 : targetCountersOk(metrics);
    const violated = counter
      ? metrics.declined >= 1
        ? []
        : ["Declined<1"]
      : missingBits(metrics);
    const detail =
      (counter ? `${countersText(metrics)}（反例期望 Declined>=1）` : countersText(metrics)) +
      (want ? "" : ` 违反: ${violated.join(",")}`) +
      (!counter && !want && metrics.statementsBuilt === 0
        ? `（提示：Sessions=${metrics.sessions}、StatementsBuilt=0 → 直建没被调用：plugins 未注册 / router 未接上 / session 未创建）`
        : "");
    if (expectDirect) {
      add("A4", want ? "PASS" : "FAIL", detail, { enforced: true });
    } else {
      add("A4", "READING", `${detail}（只报读数；--expect-direct 时强制）`, {
        enforced: false,
        readingPass: want,
      });
    }
  }

  // A5 —— --strict 时计数器仍全 0（只对覆盖范围内的 case；反例的 Decline 是 strict 下的预期行为）
  if (!flags.strict) {
    add("A5", "SKIP", "未开 --strict");
  } else if (!metricsOk) {
    add("A5", "SKIP", "--strict 已开，但 DirectBuildMetrics 未实现，无法看计数器");
  } else if (metricsError) {
    add("A5", "FAIL", `DirectBuildMetrics.Reset() 抛错: ${metricsError}`);
  } else if (counter) {
    add("A5", "SKIP", `反例在 strict 下预期走 Decline（Declined=${metrics.declined}，见 A4）`);
  } else {
    const ok = targetCountersOk(metrics);
    add("A5", ok ? "PASS" : "FAIL", `strict 下计数器 ${countersText(metrics)}`, { enforced: true });
  }

  // A6 —— 旧路径 Load 调用计数（enforced 仅 --expect-direct；否则 READ）
  const legacy = loads.effectiveLegacy(loadSnap);
  const literalZero = loadSnap.stmt === 0 && loadSnap.expr === 0;
  const loadDetail =
    `stmtLoads=${loadSnap.stmt} exprLoads=${loadSnap.expr} ` +
    `(exprDirectTokenUtil=${loadSnap.exprDirectTokenUtil} exprLegacy=${loadSnap.exprLegacy + loadSnap.exprOtherDirect}) ` +
    `effectiveLoads=${legacy}`;
  if (!loads.patched) {
    add("A6", "SKIP", `Load 计数不可用：${loads.error || "产物缺失"}`);
  } else if (expectDirect) {
    add("A6", legacy === 0 ? "PASS" : "FAIL", `${loadDetail}（A6 口径：旧路径事后 Build/ reparse 次数须为 0）`, {
      enforced: true,
      literalZero,
      loadSnap: { ...loadSnap, effectiveLoads: legacy },
    });
  } else {
    add("A6", "READING", `${loadDetail}（只报读数；--expect-direct 时强制 0）`, {
      enforced: false,
      readingPass: legacy === 0,
      literalZero,
      loadSnap: { ...loadSnap, effectiveLoads: legacy },
    });
  }

  // A7 —— --trace 时 Traces 含 insert(
  if (!flags.trace) {
    add("A7", "SKIP", "未开 --trace");
  } else if (!metricsOk || metrics === null) {
    add("A7", "SKIP", "--trace 已开，但 DirectBuildMetrics 未实现，无 Traces 可看");
  } else if (!c.expectInsert) {
    add("A7", "SKIP", "该 case 无二元运算符，不期望 insert( 条目");
  } else {
    const inserts = metrics.traces.filter((line) => line.includes("insert("));
    add(
      "A7",
      inserts.length > 0 ? "PASS" : "FAIL",
      inserts.length > 0 ? `Traces 含 insert(: ${short(inserts[0])}` : `Traces 无 insert( 条目（traces=${metrics.traces.length}）`,
      { enforced: true, inserts },
    );
  }

  return {
    case: c,
    tsAst: tsSide,
    cjAst: ours,
    assertions: a,
    readings: {
      parseError: first.error ? String(first.error.message) : null,
      parseMs: Number(first.ms.toFixed(2)),
      nodeCount,
      statementCount: tsSide.length,
      topKinds: ours.map((node) => node.kind),
      xml: xml1,
      xmlLength: xml1 === null ? null : xml1.length,
      metrics,
      loads: { ...loadSnap, effectiveLoads: legacy },
      determinism: { xmlEqual: xml1 !== null && xml1 === xml2 },
      tsAstLength: tsText.length,
      cjAstLength: oursText.length,
    },
  };
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------
function aggregate(results, id) {
  const statuses = results.map((r) => (r.assertions[id] ? r.assertions[id].status : null)).filter(Boolean);
  if (statuses.length === 0) return null;
  if (statuses.includes("FAIL")) return "FAIL";
  if (statuses.includes("PASS")) return "PASS";
  if (statuses.includes("READING")) return "READING";
  return "SKIP";
}

function renderCaseHuman(result, flags) {
  const { case: c, assertions: a, readings } = result;
  const lines = [];
  lines.push(SEP);
  lines.push(`SOURCE: ${JSON.stringify(c.src)}`);
  if (readings.parseError) {
    lines.push(`PARSE-ERROR: ${readings.parseError}`);
  } else {
    lines.push(`TS-AST:  ${JSON.stringify(result.tsAst)}`);
    lines.push(`CJ-AST:  ${JSON.stringify(result.cjAst)}`);
    lines.push(`AST-MATCH(ts): ${a.A1.status === "PASS" ? "YES" : "NO"}`);
    if (readings.xml === null) lines.push("XML: <none: SourceFileShape 没有 ToXmlString()>");
    else lines.push(`XML: ${readings.xml}`);
  }
  for (const id of ["A1", "A2", "A3"]) {
    const item = a[id];
    lines.push(`${id}: ${item.status}  ${item.detail}`);
  }
  // DIRECT 读数行（CONTRACT §6：每条 case 之后）
  const m = readings.metrics;
  const built = m ? String(m.statementsBuilt) : "NA";
  const declined = m ? String(m.declined) : "NA";
  lines.push(`DIRECT: built=${built} declined=${declined} loads=${readings.loads.effectiveLoads}`);
  // A4/A6 具体读数
  const a4 = a.A4;
  const a6 = a.A6;
  lines.push(`A4: ${a4.status}  ${a4.detail}`);
  if (flags.strict) lines.push(`A5: ${a.A5.status}  ${a.A5.detail}`);
  lines.push(`A6: ${a6.status}  ${a6.detail}`);
  if (flags.trace) lines.push(`A7: ${a.A7.status}  ${a.A7.detail}`);
  return lines;
}

function printSummaryHuman(results, impl, flags, totals) {
  console.log(SEP);
  console.log(describeImpl(impl));
  const assertionIds = ["A1", "A2", "A3", "A4"];
  if (flags.strict) assertionIds.push("A5");
  assertionIds.push("A6");
  if (flags.trace) assertionIds.push("A7");
  const agg = assertionIds
    .map((id) => {
      const status = aggregate(results, id);
      return status === null ? null : `${id}=${status}`;
    })
    .filter(Boolean)
    .join(" ");
  console.log(`ASSERT: ${agg}`);
  const totalLine =
    `CASES=${totals.evaluated} FAILED=${totals.failedCases}` +
    (totals.skipped > 0 ? ` SKIPPED=${totals.skipped}` : "") +
    (totals.readingFailures > 0 ? ` READING-FAIL=${totals.readingFailures}` : "");
  console.log(`DIRECT-TOTAL: builtCases=${totals.builtCases}/${totals.evaluated} loads=${totals.totalLoads}`);
  console.log(totalLine);
  if (!flags.expectDirect && totals.readingFailures > 0) {
    console.log(
      "NOTE: READING-FAIL 只是「读数未达标」，默认模式不作为失败；final 验收请加 --expect-direct（A4/A6 强制）。",
    );
  }
  if (flags.expectDirect && impl.metrics.state !== "present") {
    const broken = impl.metrics.state === "broken";
    console.log(
      `EXPECT-DIRECT: FAIL — DirectBuildMetrics ${broken ? "模块存在但不可用（实现错了）" : "不可用（实现未合入或构建过期）"}；` +
        (broken
          ? `原因：${impl.metrics.reason}`
          : "这属于「没实现」，不是「实现错了」。先合入 M1–M3 并重建 dist/build，再跑 --expect-direct。"),
    );
  } else if (flags.expectDirect) {
    console.log("EXPECT-DIRECT: 已强制 A4/A6（及 --strict 时的 A5）");
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  let flags;
  try {
    flags = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`USAGE-ERROR: ${error.message}`);
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (flags.help) {
    console.log(usage());
    return;
  }

  // 0) 依赖检查：build/ts 必须先构建（CONTRACT §1 / HARNESS §1）
  if (!fs.existsSync(PATHS.runner)) {
    console.error(`BUILD-MISSING: ${PATHS.runner} 不存在。`);
    console.error("先构建：xl_build(cwd=<clone>, paths=[\"core\",\"typescript\"], targets=[\"ts\"], out=\"dist\")");
    console.error("        node node_modules/typescript/bin/tsc -p tsconfig.json");
    process.exitCode = 1;
    return;
  }

  const require = createRequire(path.join(REPO, "package.json"));
  const ts = require(path.join(REPO, "node_modules", "typescript"));
  const { SourceFileRunner } = require(PATHS.runner);
  const astCompare = await import(pathToFileURL(path.join(REPO, "typescript", "cases", "ast-compare.mjs")).href);
  const { cjAst } = astCompare;
  const { tsAst } = astCompare.createAstCore(ts);

  let selected;
  try {
    selected = selectCases(CASES, flags.only);
  } catch (error) {
    console.error(`USAGE-ERROR: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const impl = discoverImplementation();
  const metricsOk = impl.metrics.state === "present" && impl.metrics.Class !== null;
  const M = metricsOk ? impl.metrics.Class : null;
  const loads = setupLoadCounters();
  if (!loads.patched) {
    console.error(`WARN: Load 计数不可用（${loads.error}）——A6 会记 SKIP`);
  }

  const ctx = { flags, impl, metricsOk, M, loads, SourceFileRunner, ts, tsAst, cjAst };
  const results = [];
  let skippedCounterexample = 0;

  if (!flags.json) {
    console.log(`REPO: ${REPO}`);
    console.log(
      `MODE: only=${flags.only === null ? "<all>" : flags.only} trace=${flags.trace ? "on" : "off"} ` +
        `strict=${flags.strict ? "on" : "off"} expect-direct=${flags.expectDirect ? "on" : "off"}`,
    );
    console.log(describeImpl(impl));
  }

  for (const c of selected) {
    if (flags.expectDirect && c.counterexample) {
      skippedCounterexample += 1;
      if (!flags.json) {
        console.log(SEP);
        console.log(`SOURCE: ${JSON.stringify(c.src)}`);
        console.log(`SKIP: 反例（范围外输入）在 --expect-direct 模式下跳过（CONTRACT §6 第 10 条）`);
        console.log("      默认模式（不带 --expect-direct）下它的读数是 Declined>=1。");
      }
      continue;
    }
    const result = evaluateCase(ctx, c);
    results.push(result);
    if (!flags.json) {
      for (const line of renderCaseHuman(result, flags)) console.log(line);
    }
  }

  // 汇总：FAILED 按「有任一断言失败的 case 数」计（与 probe 的 FAILED 同口径），断言失败数另记
  let failedCases = 0;
  let failedAssertions = 0;
  let readingFailures = 0;
  let builtCases = 0;
  let totalLoads = 0;
  for (const result of results) {
    let caseFailed = false;
    for (const item of Object.values(result.assertions)) {
      if (item.status === "FAIL") {
        failedAssertions += 1;
        caseFailed = true;
      }
      if (item.status === "READING" && item.readingPass === false) readingFailures += 1;
    }
    if (caseFailed) failedCases += 1;
    if (result.readings.metrics && result.readings.metrics.statementsBuilt >= 1) builtCases += 1;
    totalLoads += result.readings.loads.effectiveLoads;
  }
  const totals = {
    evaluated: results.length,
    failedCases,
    failedAssertions,
    skipped: skippedCounterexample,
    readingFailures,
    builtCases,
    totalLoads,
  };

  if (flags.json) {
    const output = {
      schema: "dsh/xl-example/target-cases@1",
      generatedAt: new Date().toISOString(),
      repo: REPO,
      modes: {
        only: flags.only,
        trace: flags.trace,
        strict: flags.strict,
        expectDirect: flags.expectDirect,
      },
      implementation: {
        state: impl.state,
        metrics: { state: impl.metrics.state, file: impl.metrics.file, reason: impl.metrics.reason },
        hooks: impl.hooks,
        router: impl.routerPresent,
        sessionFiles: impl.sessionFiles,
        loadCountersPatched: loads.patched,
        loadCounterError: loads.error,
      },
      summary: {
        cases: results.length,
        skipped: skippedCounterexample,
        failed: failedCases,
        failedAssertions,
        readingFailures,
        builtCases,
        totalLoads,
        exitCode: failedCases > 0 ? 1 : 0,
        assertions: ["A1", "A2", "A3", "A4", "A6", ...(flags.strict ? ["A5"] : []), ...(flags.trace ? ["A7"] : [])]
          .map((id) => ({ id, status: aggregate(results, id) }))
          .filter((entry) => entry.status !== null),
      },
      cases: results.map((result) => ({
        index: result.case.index,
        source: result.case.src,
        note: result.case.note,
        counterexample: Boolean(result.case.counterexample),
        assertions: result.assertions,
        readings: result.readings,
      })),
    };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    printSummaryHuman(results, impl, flags, totals);
  }

  process.exitCode = failedCases > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(`HARNESS-ERROR: ${error && error.stack ? error.stack : String(error)}`);
  process.exitCode = 1;
});
