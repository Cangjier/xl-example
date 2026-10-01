/// 组合式模糊测试（临时工具）：把构造片段放进各种上下文里、按不同的分隔方式拼接，
/// 找出「TypeScript 能解析、但本工程抛异常或吃掉内容」的组合。
///
///   node tests/parse/fuzz.mjs            跑全部组合
///   node tests/parse/fuzz.mjs --verbose  打印每个可疑组合的产物
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const verbose = process.argv.includes("--verbose");

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
];

const CONTEXTS = [
  ["顶层", (s) => s],
  ["块里", (s) => "{\n" + s + "\n}"],
  ["函数体里", (s) => "function f() {\n" + s + "\n}"],
  ["类体里", (s) => "class C {\n" + s + "\n}"],
  ["命名空间里", (s) => "namespace N {\n" + s + "\n}"],
  ["模块里", (s) => "declare module 'm' {\n" + s + "\n}"],
  ["if 体里", (s) => "if (x) {\n" + s + "\n}"],
  ["for 体里", (s) => "for (;;) {\n" + s + "\n}"],
  ["箭头函数里", (s) => "const g = () => {\n" + s + "\n}"],
];

const SEPARATORS = [["换行", "\n"], ["分号", ";\n"], ["无分隔", " "], ["双换行", "\n\n"]];

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
  "satisfies", "require", "constructor", "debugger", "x", "s",
]);

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

const PIECES = [];
for (const d of DECLS) PIECES.push(["decl", d]);
for (const s of STMTS) PIECES.push(["stmt", s]);
for (const t of DECLS.slice(0, 8)) PIECES.push(["head", t.replace(/^export /, "")]);

// import / export 只允许出现在「模块顶层」的上下文里——TypeScript 自己的 parser 对
// `function f() { import A from 'm' }` 不报语法诊断（它没有把这条限制做进 parseDiagnostics），
// 所以靠 tsParses 过滤不掉，只能在这里按语法事实排除。
const MODULE_ONLY_CONTEXTS = new Set(["顶层", "命名空间里", "模块里"]);

let checked = 0;
let bad = 0;
const problems = [];

for (const [ctxName, wrap] of CONTEXTS) {
  for (const [sepName, sep] of SEPARATORS) {
    for (let i = 0; i < PIECES.length; i++) {
      for (let j = 0; j < PIECES.length; j++) {
        if (i === j) continue;
        const [k1, p1] = PIECES[i];
        const [k2, p2] = PIECES[j];
        if (!MODULE_ONLY_CONTEXTS.has(ctxName) && (k1 === "head" || k2 === "head")) continue;
        const body = p1 + sep + p2;
        const source = wrap(body);
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
          // 正则正文按设计不渲染（见 known-gaps 的 regex-body-not-rendered），所以含正则的片段跳过「找不到标识符」这一条
          const hasRegex = /\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/.test(source);
          const xmlText = xml.replace(/<[^>]*>/g, " ") + " " + [...xml.matchAll(/([a-zA-Z]+)="([^"]*)"/g)].map((m) => m[2]).join(" ");
          const words = new Set(source.match(/\$?[A-Za-z_][A-Za-z0-9_]*/g) || []);
          const missing = [...words].filter((w) => !xmlText.includes(w) && !CONSUMED_KEYWORDS.has(w));
          if (missing.length && !hasRegex) issues.push("找不到标识符: " + missing.join(","));
        }
        if (issues.length) {
          bad++;
          problems.push({ ctxName, sepName, p1, p2, source, issues, xml, err });
        }
      }
    }
  }
}

const bySignature = new Map();
for (const p of problems) {
  const key = p.issues.map((i) => i.replace(/[A-Za-z_$][A-Za-z0-9_$]*/g, "W").replace(/\d+/g, "N")).join(" | ");
  const bucket = bySignature.get(key) ?? [];
  bucket.push(p);
  bySignature.set(key, bucket);
}

const sorted = [...bySignature.entries()].sort((a, b) => b[1].length - a[1].length);
let shown = 0;
for (const [key, bucket] of sorted) {
  if (shown++ >= 25) {
    console.log("\n… 另有 " + (sorted.length - 25) + " 类签名未列出");
    break;
  }
  console.log("\n=== 签名（" + bucket.length + " 例）：" + key + " ===");
  for (const p of bucket.slice(0, 3)) {
    console.log("  [" + p.ctxName + " / " + p.sepName + "] " + JSON.stringify(p.p1) + " + " + JSON.stringify(p.p2));
  }
  if (verbose) {
    const p = bucket[0];
    console.log("  源码: " + JSON.stringify(p.source));
    console.log("  产物: " + p.xml);
  }
}

console.log(`\n组合 ${checked} 个：可疑 ${bad} 个（${bySignature.size} 类签名）`);
