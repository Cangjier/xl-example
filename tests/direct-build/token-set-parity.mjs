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
//     B. **三个消费者**都是**纯委托**：目标方法体里出现 `StatementTokenSets.<名字>`，且方法体（去注释后）不含
//        字符串字面量（出现第二份字面量表就意味着镜像，直接失败 —— 契约 §4.8 ②）：
//          ① StatementBoundaryUtil.IsRestrictedPostfixUnit
//          ② DirectExpressionEngine.IsRestrictedPostfix
//          ③ ExpressionStatementPossibleShape.IsContinuation（R5-C2 后 boundary 层手工副本已删，只剩这一个转发口）
//     C. direct-token-util（若存在 RestrictedPostfix 相关镜像）同样必须委托；不存在则记 INFO（不算失败）。
//     D. 语料快照：把 statement-token-sets.js 里的 token 字面量收集成排序清单并打印（CORPUS），
//        供改闭集时同步核对；语料为空直接失败（那说明「唯一来源」里其实没内容）。
//     E. 单一定义：三个闭集方法在全仓 build/ts 里**只有一处实现**（statement-token-sets.js）；
//        其余同名定义（如 boundary 的 `IsRestrictedPostfixUnit` 转发口）必须全部是纯委托。
//
//   脚本口径（与旧版的三处修正，harden §8 的实测缺陷）：
//     - 委托正则不要求方法名前再多一个标识符：`StatementTokenSets\s*\.\s*<方法名>\b`（生成代码带模块前缀
//       `statement_token_sets_1.`，旧正则 `[A-Za-z_$][\w$]*<方法名>` 永远匹配不上）。
//     - 方法体锚点必须是**方法定义行**：`^\s*(?:static\s+)?<方法名>\s*\(`（边界层/形状层是 static，
//       引擎层 `IsRestrictedPostfix` 实测是**实例方法**、没有 static）。不再取文件里第一处调用点
//       （`ScanToSemicolonIncremental` 里的 `StatementBoundaryUtil.IsRestrictedPostfixUnit(code[at])`）。
//     - 扫描前先剥注释：注释里的反引号（`StatementTokenSets.…`）既不算第二份表、也不算一次委托；
//       剥注释后的代码若仍有引号才是真的字面量镜像。委托正则额外剥字符串字面量，避免命中字面量内容。
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
  shape: path.join(TOKENS_TS, "statements", "expression-statement-possible-shape.js"),
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

/**
 * 剥掉 `//` 行注释与 `/* ... *\/` 块注释，字符串/模板字面量原样保留
 * （所以剥完还有引号 = 代码里真的有字面量）。
 */
function stripComments(text) {
  let out = "";
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      out += ch;
      if (ch === "\\") { out += text[i + 1] ?? ""; i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; out += ch; continue; }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/** 在剥注释的基础上再剥字符串字面量内容（只用于委托正则，避免命中注释/字面量里的同名调用）。 */
function stripCommentsAndStrings(text) {
  const noComments = stripComments(text);
  let out = "";
  let quote = null;
  for (let i = 0; i < noComments.length; i += 1) {
    const ch = noComments[i];
    if (quote !== null) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) { quote = null; out += ch; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; out += ch; continue; }
    out += ch;
  }
  return out;
}

/** 从 `braceAt` 的 `{` 起取配对的函数体（跳过字符串与注释）。 */
function sliceBraceBlock(text, braceAt) {
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
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(braceAt, i + 1);
    }
  }
  return null;
}

/**
 * 取**方法定义**的函数体。锚点必须是行首的定义：`static IsRestrictedPostfixUnit(` / `IsRestrictedPostfix(`
 * （边界层/形状层是 static，引擎层实测是实例方法）——不能取第一处调用点。
 */
function methodBody(text, name) {
  const re = new RegExp(`^[ \\t]*(?:static\\s+)?${name}\\s*\\(`, "m");
  const m = re.exec(text);
  if (m === null) return null;
  const braceAt = text.indexOf("{", m.index + m[0].length);
  if (braceAt < 0) return null;
  return sliceBraceBlock(text, braceAt);
}

/**
 * 纯委托判据：方法体（剥注释、剥字符串后）里出现 `StatementTokenSets.<名字>`，且**剥注释后的方法体
 * 不含任何字符串字面量**。第二份字面量表必然带引号（"as" / "satisfies" / "++" …）⇒ 有引号即视为镜像。
 * 注释里的反引号不算（那正是旧版误报的来源）。
 */
function delegationOf(body, method) {
  const code = stripCommentsAndStrings(body);
  const call = new RegExp(`StatementTokenSets\\s*\\.\\s*${method}\\b`);
  if (!call.test(code)) return `方法体没有委托 StatementTokenSets.${method}（R5-CONTRACT §3.1 ①② 要求一行委托）`;
  const literal = stripComments(body).match(/["'`]/);
  if (literal !== null) return "方法体里还有字符串字面量 ⇒ 存在第二份 token 表（契约 §4.8 ② 要求唯一来源）";
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

function collectJsFiles(dir) {
  const out = [];
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && p.endsWith(".js")) out.push(p);
    }
  };
  walk(dir);
  return out;
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
const corpus = collectCorpus(stripComments(sourceText));
if (corpus.length === 0) {
  bad("D/语料", "statement-token-sets.js 里没有任何 token 字面量 ⇒ 「唯一来源」里其实没有闭集内容");
} else {
  ok("D/语料", `${corpus.length} 个 token 字面量（改闭集时必须同步本测的核对清单）`);
  say(`CORPUS: ${corpus.join(" ")}`);
  if (VERBOSE) say(`CORPUS-RAW: ${JSON.stringify(corpus)}`);
}

// ---- B. 三个消费者必须纯委托 ----
const CONSUMERS = [
  { file: FILES.boundary, label: "BoundaryUtil", owner: "statement-boundary-util.js", method: "IsRestrictedPostfixUnit", delegate: "IsRestrictedPostfixUnit" },
  { file: FILES.engine, label: "Engine", owner: "direct-expression-engine.js", method: "IsRestrictedPostfix", delegate: "IsRestrictedPostfixText" },
  { file: FILES.shape, label: "ExpressionShape", owner: "expression-statement-possible-shape.js", method: "IsContinuation", delegate: "IsExpressionContinuation" },
];
for (const c of CONSUMERS) {
  const text = readText(c.file);
  if (text === null) { bad(`B/${c.label}`, `${c.owner} 不存在（build/ts 未构建或文件改名）`); continue; }
  const body = methodBody(text, c.method);
  if (body === null) { bad(`B/${c.label}`, `${c.owner} 里找不到方法定义 ${c.method}`); continue; }
  const problem = delegationOf(body, c.delegate);
  if (problem === null) ok(`B/${c.label}`, `${c.method} 纯委托 StatementTokenSets.${c.delegate}（无第二份字面量表）`);
  else bad(`B/${c.label}`, problem);
}

// ---- C. direct-token-util：有镜像就必须同源；没有就只记 INFO ----
const utilText = readText(FILES.tokenUtil);
if (utilText === null) {
  info.push("direct-token-util.js 不存在 ⇒ 无第三处镜像可校验（R5-CONTRACT §3.1 只列 ①②）");
} else if (!/RestrictedPostfix/.test(stripComments(utilText))) {
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

// ---- E. 单一定义：三个闭集方法全仓只有一处实现，其余同名定义必须纯委托 ----
const allJs = collectJsFiles(path.join(ROOT, "build", "ts"));
for (const name of REQUIRED) {
  const defs = [];
  for (const file of allJs) {
    const text = readText(file);
    if (text === null) continue;
    const body = methodBody(text, name);
    if (body !== null) defs.push({ file, body });
  }
  const inSource = defs.filter((d) => path.resolve(d.file) === path.resolve(FILES.source));
  const outside = defs.filter((d) => path.resolve(d.file) !== path.resolve(FILES.source));
  const problems = [];
  if (inSource.length !== 1) problems.push(`statement-token-sets.js 里 ${name} 定义 ${inSource.length} 处（应恰好 1 处实现）`);
  for (const d of outside) {
    const p = delegationOf(d.body, name);
    if (p !== null) problems.push(`${path.relative(ROOT, d.file)} 里的同名定义不是纯委托（${p}）`);
  }
  if (problems.length === 0) {
    const tail = outside.length === 0
      ? "全仓仅此一处定义"
      : `另有 ${outside.length} 处纯委托（${outside.map((d) => path.basename(d.file)).join(", ")}）`;
    ok(`E/${name}`, `只有一份实现（statement-token-sets.js）；${tail}`);
  } else {
    bad(`E/${name}`, problems.join("；"));
  }
}

// ---- 汇总 ----
for (const i of info) say(`INFO: ${i}`);
say("");
if (fail.length === 0) {
  say("RESULT: PASS（单一来源 + 三个消费者纯委托 + 单一定义；harden C-3 同源成立）");
  console.log(lines.join("\n"));
  process.exit(0);
}
say(`RESULT: FAIL（${fail.length} 项）`);
for (const f of fail) say(`  - ${f}`);
console.log(lines.join("\n"));
process.exit(1);
