#!/usr/bin/env node
// ---------------------------------------------------------------------------
// token-set-parity.mjs —— R5-CONTRACT §3.1 C-3 / §4.8 的「D7 闭集单一来源」单测
//
//   契约事实（R5-CONTRACT §3.1）：
//     新建叶子 typescript/tokens/statements/statement-token-sets.xl.md（StatementTokenSets），导出
//       IsRestrictedPostfixText(text) / IsRestrictedPostfixUnit(unit) / IsExpressionContinuation(unit)；
//     ①② 一处改委托一行：
//       ① StatementBoundaryUtil.IsRestrictedPostfixUnit   → StatementTokenSets.IsRestrictedPostfixUnit
//       ② DirectExpressionEngine.IsRestrictedPostfix      → StatementTokenSets.IsRestrictedPostfixText
//     ③④（StatementScanner / StatementBuilder.ContinuesAcrossLine）语义面不同，**不动**、不参与本测。
//
//   本文件的判定（全部对着 **build/ts 产物** 读文本，不加载编译器、不需要构造 Token）：
//     A. 单一来源存在：build/ts/typescript/tokens/statements/statement-token-sets.js 存在，且三个导出名都在。
//     B. 两个消费者都是**纯委托**：目标方法体里出现 `StatementTokenSets.<…>`，且方法体不含字符串字面量
//        （出现第二份字面量表就意味着镜像，直接失败 —— 契约 §4.8 ②）。
//     C. direct-token-util（若存在 RestrictedPostfix 相关镜像）同样必须委托；不存在则记 INFO（不算失败）。
//     D. 语料快照：把 statement-token-sets.js 里的 token 字面量收集成排序清单并打印（CORPUS），
//        供改闭集时同步核对；语料为空直接失败（那说明「唯一来源」里其实没内容）。
//
//   **harden 未合入时 SKIP 且 exit 0**（不造必然红的文件；R5-CONTRACT §4.8 明确它不进 132/189）：
//     - build/ts 不存在（还没构建）→ SKIP
//     - statement-token-sets.js 不存在（feat-r5-harden 的 C-3 还没合入）→ SKIP，并打印待合入事项
//
//   用法：node tests/direct-build/token-set-parity.mjs [--verbose]
//         退出码 0 = PASS 或 SKIP；1 = FAIL（只有「模块在但镜像不同源」才会 1）
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const VERBOSE = process.argv.includes("--verbose");

const TOKENS_TS = path.join(ROOT, "build", "ts", "typescript", "tokens");
const FILES = {
  source: path.join(TOKENS_TS, "statements", "statement-token-sets.js"),
  boundary: path.join(TOKENS_TS, "statements", "statement-boundary-util.js"),
  engine: path.join(TOKENS_TS, "direct", "direct-expression-engine.js"),
  tokenUtil: path.join(TOKENS_TS, "direct", "direct-token-util.js"),
};

const lines = [];
const fail = [];
const info = [];
function say(s) { lines.push(s); }
function ok(name, detail) { say(`PASS: ${name}${detail ? ` — ${detail}` : ""}`); }
function bad(name, detail) { fail.push(`${name} — ${detail}`); say(`FAIL: ${name} — ${detail}`); }
function skip(why) {
  say(`SKIP: ${why}`);
  say("RESULT: SKIP（本测不判失败；harden 的 C-3 合入后自动转为 PASS/FAIL）");
  console.log(lines.join("\n"));
  process.exit(0);
}
function readText(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return null; }
}

/** 取一个方法的函数体（首个 `{` 到配对的 `}`），粗略跳过字符串/注释，够读生成的产物。 */
function methodBody(text, name) {
  const re = new RegExp(`(?:^|[^A-Za-z0-9_$])${name}\\s*\\(`, "g");
  let m = re.exec(text);
  if (m === null) return null;
  const braceAt = text.indexOf("{", m.index + m[0].length);
  if (braceAt < 0) return null;
  let depth = 0;
  let quote = null;
  for (let i = braceAt; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(braceAt, i + 1);
    }
  }
  return null;
}

/**
 * 纯委托判据：方法体里出现 `StatementTokenSets.<名字>`，且**不含任何字符串字面量**。
 * 第二份字面量表必然带引号（"as" / "satisfies" / "++" …）⇒ 有引号即视为镜像。
 */
function delegationOf(body, method) {
  const call = new RegExp(`StatementTokenSets\\s*\\.\\s*[A-Za-z_$][\\w$]*${method}`);
  if (!call.test(body)) return `方法体没有委托 StatementTokenSets.…${method}（R5-CONTRACT §3.1 ①② 要求一行委托）`;
  const quoted = body.match(/["'`]/);
  if (quoted !== null) return "方法体里还有字符串字面量 ⇒ 存在第二份 token 表（契约 §4.8 ② 要求唯一来源）";
  return null;
}

function collectCorpus(sourceText) {
  const set = new Set();
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m;
  while ((m = re.exec(sourceText)) !== null) {
    const v = m[2];
    if (v.length > 0 && v.length <= 12 && !/\s/.test(v)) set.add(v);
  }
  return [...set].sort();
}

// ---- 前置：build/ts ----
if (!fs.existsSync(path.join(ROOT, "build", "ts"))) {
  skip(`build/ts 不存在（${path.join(ROOT, "build", "ts")}）：先构建（xl_build + tsc）再跑本测`);
}

const sourceText = readText(FILES.source);
const sourceExists = fs.existsSync(FILES.source);
if (!sourceExists) {
  say("INFO: 未找到 build/ts/typescript/tokens/statements/statement-token-sets.js");
  say("SKIP: feat-r5-harden 的 C-3 单一来源模块尚未合入 ⇒ 本测没有可校验的对象");
  say("      待合入事项（R5-CONTRACT §3.1）：");
  say("        1) 新建 typescript/tokens/statements/statement-token-sets.xl.md（StatementTokenSets）");
  say("        2) StatementBoundaryUtil.IsRestrictedPostfixUnit / DirectExpressionEngine.IsRestrictedPostfix 改为一行委托");
  say("        3) 合入后重跑：node tests/direct-build/token-set-parity.mjs");
  say("RESULT: SKIP（不判失败；R5-CONTRACT §4.8 明确本测不进 132/189）");
  console.log(lines.join("\n"));
  process.exit(0);
}

// ---- A. 单一来源的三个导出 ----
const REQUIRED = ["IsRestrictedPostfixText", "IsRestrictedPostfixUnit", "IsExpressionContinuation"];
const missingExports = REQUIRED.filter((name) => !new RegExp(`(?:^|[^A-Za-z0-9_$])${name}\\b`).test(sourceText));
if (missingExports.length === 0) {
  ok("A/单一来源", `statement-token-sets.js 导出 ${REQUIRED.join(" / ")}`);
} else {
  bad("A/单一来源", `statement-token-sets.js 缺 ${missingExports.join(" / ")}（R5-CONTRACT §3.1）`);
}
const corpus = collectCorpus(sourceText);
if (corpus.length === 0) {
  bad("D/语料", "statement-token-sets.js 里没有任何 token 字面量 ⇒ 「唯一来源」里其实没有闭集内容");
} else {
  ok("D/语料", `${corpus.length} 个 token 字面量（改闭集时必须同步本测的核对清单）`);
  say(`CORPUS: ${corpus.join(" ")}`);
  if (VERBOSE) say(`CORPUS-RAW: ${JSON.stringify(corpus)}`);
}

// ---- B. 两个消费者必须纯委托 ----
const CONSUMERS = [
  { file: FILES.boundary, label: "BoundaryUtil", owner: "statement-boundary-util.js", method: "IsRestrictedPostfixUnit" },
  { file: FILES.engine, label: "Engine", owner: "direct-expression-engine.js", method: "IsRestrictedPostfix" },
];
for (const c of CONSUMERS) {
  const text = readText(c.file);
  if (text === null) { bad(`B/${c.label}`, `${c.owner} 不存在（build/ts 未构建或文件改名）`); continue; }
  const body = methodBody(text, c.method);
  if (body === null) { bad(`B/${c.label}`, `${c.owner} 里找不到方法 ${c.method}`); continue; }
  const problem = delegationOf(body, c.method === "IsRestrictedPostfix" ? "IsRestrictedPostfixText" : "IsRestrictedPostfixUnit");
  if (problem === null) ok(`B/${c.label}`, `${c.method} 纯委托 StatementTokenSets（无第二份字面量表）`);
  else bad(`B/${c.label}`, problem);
}

// ---- C. direct-token-util：有镜像就必须同源；没有就只记 INFO ----
const utilText = readText(FILES.tokenUtil);
if (utilText === null) {
  info.push("direct-token-util.js 不存在 ⇒ 无第三处镜像可校验（R5-CONTRACT §3.1 只列 ①②）");
} else if (!/RestrictedPostfix/.test(utilText)) {
  info.push("direct-token-util.js 里没有 RestrictedPostfix 镜像 ⇒ 无需校验（只记 INFO）");
} else {
  const bodies = ["IsRestrictedPostfixText", "IsRestrictedPostfixUnit"]
    .map((m) => methodBody(utilText, m))
    .filter((b) => b !== null);
  if (bodies.length === 0) {
    info.push("direct-token-util.js 提到 RestrictedPostfix 但没有同名方法 ⇒ 人工核对（不算失败）");
  } else {
    const problems = [];
    bodies.forEach((b, i) => {
      const m = ["IsRestrictedPostfixText", "IsRestrictedPostfixUnit"][i];
      const p = delegationOf(b, m);
      if (p !== null) problems.push(`${m}: ${p}`);
    });
    if (problems.length === 0) ok("C/token-util", "RestrictedPostfix 镜像同源委托");
    else bad("C/token-util", problems.join("；"));
  }
}

// ---- 汇总 ----
for (const i of info) say(`INFO: ${i}`);
say("");
if (fail.length === 0) {
  say("RESULT: PASS（单一来源 + 两个消费者纯委托；harden C-3 同源成立）");
  console.log(lines.join("\n"));
  process.exit(0);
}
say(`RESULT: FAIL（${fail.length} 项）`);
for (const f of fail) say(`  - ${f}`);
console.log(lines.join("\n"));
process.exit(1);
