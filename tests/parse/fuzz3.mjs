/// 三片段组合探针：`fuzz.mjs` 是**两两**拼接（9 上下文 × 4 分隔 × 215² 片段），
/// 这一把补的是**三个**片段相邻时的形状——有些缺口只在第三个片段出现时才露出来。
///
/// 它找到的第一处真缺口就是这类：
///
/// ```ts
/// type H = number
/// try { } catch { }
/// ```
///
/// 两两拼接抓不到（`type H = number` + `try { } catch { }` 确实抓得到，但当时
/// `try` 那一族的片段表里没有「紧跟类型别名」这一格）；三片段里 `type H = number`
/// 与 `try { } catch { }` 相邻出现时才发现：`{` 的回扫跨过了换行与 `try`，
/// 把 `try` 的语句体收成一个 `TypeLiteral`，`TryReorganization` 当场抛
/// 「next is not Bracket」——**整份文件解析失败**。修法见
/// `typescript/tokens/type-literal/type-literal.md` 的 `IsTypePosition`（回扫遇语句边界即停）。
///
/// 口径与 `fuzz.mjs` 完全一致，只报「抛异常」与「丢标识符」两类可疑：
/// 候选先交给 TypeScript 自己判定是不是合法 TS，合法的才跑。
/// **抽样**（默认 20 万次，`--rounds N` 改）：三片段的完全组合是 215³ ≈ 1000 万，
/// 采样足够找出「一类形状」——它不当判据，退出码恒为 0。
///
///   node tests/parse/fuzz3.mjs                默认 20 万次抽样
///   node tests/parse/fuzz3.mjs --rounds 500000
///   node tests/parse/fuzz3.mjs --verbose      每个可疑组合打印源码与产物
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const roundsIndex = args.indexOf("--rounds");
const ROUNDS = roundsIndex >= 0 ? Number(args[roundsIndex + 1]) : 200000;

/// 片段表与 `fuzz.mjs` 同源，另加**第 67 轮抓缺口时用的那几条类型形状**
/// （括号类型的内容、空元组、映射键重映射、导入类型、变长元组）。
const DECLS = [
  "import { A } from 'm'",
  "import A from 'm'",
  "import A = require('m')",
  "export { A }",
  "export default A",
  "export * from 'm'",
  "export = A",
  "declare module 'm' { }",
  "declare global { }",
  "namespace N { }",
  "module M { }",
  "class C { }",
  "abstract class C { }",
  "function f() { }",
  "enum E { }",
  "interface I { }",
  "type T = number",
  "const a = 1",
  "let b: string = 'x'",
  "var c",
  "using u = make()",
  "declare const d: number",
  "type G<T> = T extends (infer U)[] ? U : never",
  "type H = readonly (readonly [K, V])[] | null",
  "type K = [] | [number]",
  "type L = { [P in T as `get${P & string}`]-?: T[P] }",
];

const STMTS = [
  "a",
  "a.b.c",
  "f(1, 2)",
  "a = b",
  "a += 1",
  "a ? b : c",
  "a && b || c",
  "a ?? b",
  "await p",
  "yield v",
  "return x",
  "return",
  "throw e",
  "delete a.b",
  "void 0",
  "typeof a",
  "new A()",
  "a!",
  "a as B",
  "a satisfies B",
  "[1, 2, 3]",
  "({ a: 1 })",
  "`t${x}`",
  "/re/g",
  "x => x",
  "(a, b) => a",
  "async () => 1",
  "function () { }",
  "class { }",
  "a?.b?.[c]?.(d)",
  "for (const k of m) { }",
  "try { } catch { }",
  "switch (a) { case 1: break }",
];

const TYPES = [
  "type A1 = (keyof X)",
  "type A2 = ([A, B])",
  "type A3 = (infer U) extends never ? 1 : 2",
  "type A4 = { [K in T as `get${K & string}`]-?: T[K] }",
  "type A5 = import('m').X[]",
  "type A6 = unique symbol",
  "type A7 = readonly [a?: A, ...b: B[]]",
];

const CONTEXTS = [
  ["顶层", (s) => s],
  ["块里", (s) => "{\n" + s + "\n}"],
  ["函数体里", (s) => "function f() {\n" + s + "\n}"],
  ["类体里", (s) => "class C {\n" + s + "\n}"],
  ["命名空间里", (s) => "namespace N {\n" + s + "\n}"],
  ["类型体里", (s) => "type O = {\n" + s + "\n}"],
  ["泛型实参里", (s) => "type P = Array<\n" + s + "\n>"],
];

const SEPARATORS = [["换行", "\n"], ["分号", ";\n"], ["无分隔", " "], ["双换行", "\n\n"]];

/// 与 `fuzz.mjs` 同一张表：这些词由构造本身消费掉，不算「内容被吃掉」。
const CONSUMED_KEYWORDS = new Set([
  "class", "interface", "namespace", "module", "type", "import", "export", "from",
  "function", "enum", "const", "let", "var", "declare", "abstract", "extends",
  "implements", "new", "default", "global", "assert", "with", "as", "is",
  "using", "await", "async", "static", "public", "private", "protected", "readonly",
  "get", "set", "override", "accessor", "in", "out", "of", "keyof", "typeof",
  "infer", "unique", "this", "void", "never", "unknown", "any", "string", "number",
  "boolean", "symbol", "object", "null", "undefined", "true", "false", "super",
  "yield", "return", "throw", "if", "else", "for", "while", "do", "switch",
  "case", "break", "continue", "try", "catch", "finally", "delete", "instanceof",
  "satisfies", "require", "constructor", "debugger", "x", "s", "m", "u", "V", "X",
  "G", "H", "K", "L", "P", "O",
]);

const PIECES = [...DECLS, ...STMTS, ...TYPES];

/// `import` / `export` 只允许出现在模块顶层——TypeScript 自己的 parser 对
/// `function f() { import A from 'm' }` 不报语法诊断，只能按语法事实排除（与 `fuzz.mjs` 同）。
const MODULE_ONLY_CONTEXTS = new Set(["顶层", "命名空间里"]);

function tsParses(source) {
  const sf = ts.createSourceFile("s.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return !(sf.parseDiagnostics && sf.parseDiagnostics.length > 0);
}

function parse(source) {
  const document = new TextDocument(source);
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root.ToString();
}

/// 固定种子的线性同余，保证同一 `--rounds` 每次跑的抽样完全一样（可复现）。
let seed = 12345;
function rnd(n) {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % n;
}

let checked = 0;
const problems = new Map();
for (let r = 0; r < ROUNDS; r++) {
  const [ctxName, wrap] = CONTEXTS[rnd(CONTEXTS.length)];
  const [sepName, sep] = SEPARATORS[rnd(SEPARATORS.length)];
  const p1 = PIECES[rnd(PIECES.length)];
  const p2 = PIECES[rnd(PIECES.length)];
  const p3 = PIECES[rnd(PIECES.length)];
  const isHead = (p) => p.startsWith("import ") || p.startsWith("export ");
  if (!MODULE_ONLY_CONTEXTS.has(ctxName) && [p1, p2, p3].some(isHead)) continue;
  const source = wrap(p1 + sep + p2 + sep + p3);
  if (!tsParses(source)) continue;
  checked++;
  let xml = null;
  let err = null;
  try {
    xml = parse(source);
  } catch (e) {
    err = e;
  }
  const issues = [];
  if (err) {
    issues.push("抛异常 " + (err.constructor && err.constructor.name) + " :: " + String(err.message || "").split("\n")[0]);
  } else {
    // 正则正文按设计不渲染（见 known-gaps 的 regex-body-not-rendered），含正则的片段跳过这一条。
    const hasRegex = /\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/.test(source);
    const xmlText = xml.replace(/<[^>]*>/g, " ") + " " + [...xml.matchAll(/([a-zA-Z]+)="([^"]*)"/g)].map((m) => m[2]).join(" ");
    const words = new Set(source.match(/\$?[A-Za-z_][A-Za-z0-9_]*/g) || []);
    const missing = [...words].filter((w) => !xmlText.includes(w) && !CONSUMED_KEYWORDS.has(w));
    if (missing.length && !hasRegex) issues.push("找不到标识符: " + missing.join(","));
  }
  if (issues.length) {
    const key = issues.join(" | ").replace(/[A-Za-z_$][A-Za-z0-9_$]*/g, "W").replace(/\d+/g, "N");
    if (!problems.has(key)) problems.set(key, []);
    const bucket = problems.get(key);
    if (bucket.length < 3) bucket.push({ ctxName, sepName, source, xml });
  }
}

console.log(`\n三片段组合 ${checked} 个（抽样 ${ROUNDS} 次）：可疑 ${problems.size} 类`);
for (const [key, list] of problems) {
  console.log("\n=== 签名（前 3 例）：" + key + " ===");
  for (const p of list) console.log("  [" + p.ctxName + " / " + p.sepName + "] " + JSON.stringify(p.source));
  if (verbose) {
    const p = list[0];
    console.log("  源码: " + JSON.stringify(p.source));
    console.log("  产物: " + p.xml);
  }
}
