/// 侦察探针（临时）：把一批**高风险** TS 片段同时喂给 TypeScript 自带 parser 与本工程解析器，
/// 只报告可疑项：抛异常 / 产物里找不到标识符 / 关键构造缺节点 / TS 有语法诊断。
///
///   node tests/parse/recon.mjs              只打印可疑项
///   node tests/parse/recon.mjs --all        打印全部
///   node tests/parse/recon.mjs --filter for 只看名字带某子串的
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const args = process.argv.slice(2);
const showAll = args.includes("--all");
const filterAt = args.indexOf("--filter");
const filter = filterAt >= 0 ? args[filterAt + 1] : null;

const CASES = [
  // ---------- 语句 / 声明边界 ----------
  ["stmt-do-while-no-semi", "do { x(); } while (y)\nz()"],
  ["stmt-do-while-body-decl", "do { const a = 1 } while (a)"],
  ["stmt-if-else-if-chain", "if (a) b(); else if (c) d(); else e();"],
  ["stmt-if-no-else-body-block", "if (a) { b() }"],
  ["stmt-switch-fallthrough-decl", "switch (x) { case 1: let a = 1; break; default: }"],
  ["stmt-switch-empty", "switch (x) {}"],
  ["stmt-try-no-binding", "try { a() } catch { b() }"],
  ["stmt-try-binding", "try { a() } catch (e) { b() } finally { c() }"],
  ["stmt-try-finally-only", "try { a() } finally { c() }"],
  ["stmt-label-nested", "a: b: for (;;) break a;"],
  ["stmt-label-function", "lbl: function f() {}"],
  ["stmt-block-in-if", "if (a) { }\nelse { }"],
  ["stmt-empty-block-then-class", "{ }\nclass A {}"],
  ["stmt-arrow-return-newline", "const f = () =>\n1"],
  ["stmt-comma-in-var", "const a = 1, b = (c, d), e = 2"],
  ["stmt-regex-then-statement", "const a = /b/g\ntest()"],
  ["stmt-regex-at-start", "/abc/.test(s)"],
  ["stmt-division-after-paren", "const a = (b) / c"],
  ["stmt-in-operator-for", "for (var x = ('a' in b) ? 1 : 2;;) {}"],
  ["stmt-semicolon-only-lines", ";\n;\na"],
  ["stmt-var-no-init-multi", "var a, b, c;"],
  ["stmt-nested-function-decl-in-block", "{ function f() {} function g() {} }"],
  ["stmt-class-in-block", "{ class A {} class B {} }"],
  ["stmt-delete-expression", "delete a.b;"],
  ["stmt-void-expression", "void 0;"],
  ["stmt-typeof-expression", "typeof a === 'string';"],
  ["stmt-in-operator-nested", "const a = (b in c) && (d in e);"],

  // ---------- 表达式 ----------
  ["expr-arrow-ternary-body", "const f = x => x ? 1 : 2"],
  ["expr-arrow-nested-arrow", "const f = a => b => a + b"],
  ["expr-arrow-paren-single", "const f = (a) => a"],
  ["expr-arrow-return-typed-obj", "const f = (x): { a: 1 } => ({ a: 1 })"],
  ["expr-assign-in-condition", "if ((a = b)) {}"],
  ["expr-assign-to-member", "a.b.c = 1;"],
  ["expr-assign-to-element", "a[b] = 1;"],
  ["expr-assign-compound-member", "a.b += 1;"],
  ["expr-await-in-var", "async function f() { const a = await g() }"],
  ["expr-await-chain", "async function f() { const a = (await g()).h }"],
  ["expr-bigint", "const a = 1n; const b = 0x1fn;"],
  ["expr-numeric-separator", "const a = 1_000_000;"],
  ["expr-binary-numeric", "const a = 0b1010; const b = 0o777;"],
  ["expr-call-chain-newline", "const r = a\n  .b()\n  .c()\n"],
  ["expr-cast-in-arg", "f(<T>x, y);"],
  ["expr-class-expr-decorator", "const A = @dec class {};"],
  ["expr-compound-nested", "a = b ??= c;"],
  ["expr-delete-optional", "delete a?.b;"],
  ["expr-double-not-null", "const a = b!!;"],
  ["expr-exponent-unary", "const a = -(b ** c);"],
  ["expr-function-expr-generic", "const f = function <T>(x: T) { return x };"],
  ["expr-in-nested-paren", "const ok = ('a' in b);"],
  ["expr-literal-object-method-async", "const o = { async m() {}, *g() {}, async *ag() {} };"],
  ["expr-literal-object-proto", "const o = { __proto__: null, get [k]() { return 1 } };"],
  ["expr-literal-object-number-key", "const o = { 1: 'a', 0b1: 'b' };"],
  ["expr-literal-object-trailing-comma", "const o = { a: 1, };"],
  ["expr-literal-array-trailing-comma", "const a = [1, 2, ];"],
  ["expr-literal-nested-array-obj", "const a = [{ b: [1, { c: 2 }] }];"],
  ["expr-member-keyword-name", "a.new; a.class; a.default; a.import;"],
  ["expr-new-no-args", "const a = new A;"],
  ["expr-new-member", "const a = new a.b.C(1);"],
  ["expr-new-paren-member-chain", "const a = new (b.c())(1);"],
  ["expr-newline-before-operator", "const a = b\n  + c"],
  ["expr-nullish-chain", "const a = b?.c ?? d;"],
  ["expr-object-shorthand-with-keyword", "const o = { if: 1, in: 2, of: 3, as: 4, is: 5, satisfies: 6 };"],
  ["expr-optional-call-typeargs", "a?.<T>(1);"],
  ["expr-paren-seq-then-call", "const a = (b, c)();"],
  ["expr-postfix-newline-then-semi", "a++\nb++"],
  ["expr-power-precedence", "const a = (-b) ** 2;"],
  ["expr-regex-after-return", "function f() { return /a/g }"],
  ["expr-regex-in-arg", "f(/a/g, b / c)"],
  ["expr-spread-in-call-mixed", "f(...a, b, ...c);"],
  ["expr-string-escape-unicode", "const a = '\\u{1F600}\\u0041\\x41';"],
  ["expr-string-line-continuation", "const a = 'x\\\ny';"],
  ["expr-template-nested-braces", "const a = `x${ { a: 1 } }y`;"],
  ["expr-template-nested-template", "const a = `x${`y${z}`}w`;"],
  ["expr-template-tagged-member", "a.b`x`;"],
  ["expr-ternary-assign-nested", "const a = b ? c = 1 : d = 2;"],
  ["expr-ternary-in-arrow", "const f = a => a ? b : c ? d : e;"],
  ["expr-this-in-arrow", "const f = () => this;"],
  ["expr-typeof-import", "const a = typeof import('./m');"],
  ["expr-unary-chain", "const a = !!~-+b;"],
  ["expr-update-newline-paren", "a\n(b)"],
  ["expr-yield-no-arg", "function* g() { yield; yield* h(); }"],
  ["expr-as-in-for-init", "for (let i = 0 as number; i < 1; i++) {}"],
  ["expr-satisfies-in-arg", "f(x satisfies T, y);"],
  ["expr-keyof-indexed-type", "type X = keyof typeof a['b'];"],
  ["expr-object-getter-setter-same-name", "const o = { get a() { return 1 }, set a(v) {} };"],
  ["expr-class-member-newline-call", "class A { m() { return this\n.x } }"],

  // ---------- 类型 ----------
  ["type-array-shorthand-nested", "type X = A[][][];"],
  ["type-arrow-in-generic", "type X = Array<(a: number) => string>;"],
  ["type-arrow-rest-optional", "type X = (a?: number, ...b: string[]) => void;"],
  ["type-assertion-const", "const a = <const>[1, 2];"],
  ["type-conditional-in-union", "type X = (A extends B ? C : D) | E;"],
  ["type-conditional-nested-deep", "type X<T> = T extends A ? T extends B ? 1 : T extends C ? 2 : 3 : 4;"],
  ["type-constructor-interface", "interface I { new (): I; new <T>(a: T): I; }"],
  ["type-import-meta-type", "type X = typeof import('./m');"],
  ["type-index-signature-template", "type X = { [k: `a${string}`]: number };"],
  ["type-infer-constraint-index", "type X<T> = T extends Record<infer K, infer V> ? [K, V] : never;"],
  ["type-infer-in-return", "type X<T> = T extends (...a: infer P) => infer R ? [P, R] : never;"],
  ["type-intersection-in-union", "type X = (A & B) | (C & D);"],
  ["type-keyof-keyof", "type X = keyof keyof A;"],
  ["type-literal-in-union", "type X = { a: 1 } | { b: 2 };"],
  ["type-literal-method-optional", "type X = { m?(): void; readonly a?: number };"],
  ["type-mapped-constraint-conditional", "type X<T> = { [K in keyof T extends string ? keyof T : never]: 1 };"],
  ["type-mapped-template-key", "type X<T> = { [K in keyof T as `on${Capitalize<string & K>}`]: () => void };"],
  ["type-optional-in-union", "type X = { a?: 1 } | undefined;"],
  ["type-paren-arrow-return", "type X = (a: number) => (b: string) => boolean;"],
  ["type-readonly-array-generic", "type X = readonly A<B>[];"],
  ["type-template-literal-multi", "type X = `${A}${B}${C}`;"],
  ["type-template-then-union", "type X = `a${string}` | `b${number}`;"],
  ["type-tuple-optional-after-rest", "type X = [a: number, ...b: string[], c?: boolean];"],
  ["type-tuple-rest-named", "type X = [...rest: string[]];"],
  ["type-tuple-readonly", "type X = readonly [a: 1, b: 2];"],
  ["type-typeof-keyof", "type X = keyof typeof a;"],
  ["type-union-fn-arrow", "type X = ((a: 1) => 2) | ((b: 3) => 4);"],
  ["type-unique-symbol-in-class", "class A { readonly s: unique symbol; }"],
  ["type-variance-annotations", "interface I<in T, out U, in out V> {}"],
  ["type-const-type-param", "function f<const T extends readonly unknown[]>(a: T) {}"],
  ["type-noinfer", "type X<T> = { [K in keyof T & string]: T[K] };"],
  ["type-indexed-access-tuple", "type X = [1, 2][number];"],
  ["type-generic-default-conditional", "type X<T, U = T extends A ? B : C> = [T, U];"],
  ["type-fn-type-in-type-literal", "type X = { f: (a: number) => void };"],
  ["type-pred-asserts-this-plain", "interface I { m(): asserts this; }"],
  ["type-literal-new-abstract", "type X = { abstract new (): A };"],

  // ---------- 声明 / 模块 ----------
  ["decl-abstract-class-abstract-method-body", "abstract class A { abstract m(): void; n() {} }"],
  ["decl-ambient-module-nested", "declare module 'a' { declare module 'b' { const x: number } }"],
  ["decl-class-implements-keyword-name", "class A implements I<number> {}"],
  ["decl-class-method-overloads-then-body", "class A { m(): void; m(a: any) {} }"],
  ["decl-class-parameter-property-readonly-only", "class A { constructor(readonly a: number) {} }"],
  ["decl-class-property-computed-symbol", "class A { [Symbol.iterator]() {} }"],
  ["decl-class-static-block-multiple", "class A { static {} static { let a = 1 } }"],
  ["decl-class-static-nested-class", "class A { static B = class {}; }"],
  ["decl-const-enum-in-namespace", "namespace N { export const enum E { A } }"],
  ["decl-declare-class-field-no-type", "declare class A { x; m(); }"],
  ["decl-declare-function-overloads", "declare function f(a: number): void; declare function f(a: string): void;"],
  ["decl-declare-global-in-module", "export {};\ndeclare global { interface Window { x: number } }"],
  ["decl-decorator-before-export-default", "@dec export default class A {}"],
  ["decl-decorator-parameter-property", "class A { constructor(@dec private readonly a: number) {} }"],
  ["decl-default-export-arrow", "export default () => 1;"],
  ["decl-default-export-anonymous-class", "export default class {}"],
  ["decl-default-export-function-named", "export default function f() {}"],
  ["decl-default-export-identifier", "export default a;"],
  ["decl-enum-after-namespace", "namespace N {}\nenum E { A }"],
  ["decl-enum-initializer-ref", "enum E { A = 1, B = A + 1, C = 'x'.length }"],
  ["decl-export-declaration-list-double", "export { a, b as c };\nexport { d } from './m';"],
  ["decl-export-default-type-only", "export type { A };"],
  ["decl-export-star-from", "export * from './m';"],
  ["decl-function-generic-constraint-infer", "function f<T extends (a: infer U) => void>(x: T) {}"],
  ["decl-function-in-namespace-jump", "namespace N { function f() {} function g() {} }"],
  ["decl-import-attributes-multi", "import x from './m' with { type: 'json', other: 'v' };"],
  ["decl-import-default-and-named-type", "import d, { type A, B } from './m';"],
  ["decl-import-side-effect", "import './m';"],
  ["decl-import-type-star-as", "import type * as ns from './m';"],
  ["decl-interface-heritage-qualified-generic", "interface I extends A.B<C>, D {}"],
  ["decl-interface-member-newline", "interface I {\n  a: number\n  b: string\n}"],
  ["decl-interface-method-generic-optional", "interface I { m?<T>(a: T): T; }"],
  ["decl-namespace-dotted-string-mix", "declare module 'a.b' { const x: number }"],
  ["decl-namespace-empty-then-decl", "namespace N {}\nconst a = 1"],
  ["decl-namespace-export-nested-fn", "namespace N { export function f() {} export class C {} }"],
  ["decl-overloads-across-lines", "function f(a: number): void;\nfunction f(a: string): void;\nfunction f(a: any): void {}"],
  ["decl-type-alias-arrow-object-return", "type X = () => { a: number };"],
  ["decl-type-alias-generic-arrow", "type X = <T>(a: T) => T;"],
  ["decl-type-alias-new-abstract-generic", "type X = abstract new <T>(a: T) => A<T>;"],
  ["decl-var-using-in-namespace", "namespace N { export using x = make(); }"],
  ["decl-class-in-ts-nocheck-next-line", "// @ts-ignore\nconst a = 1;"],
  ["decl-class-member-semicolon-between", "class A { m() {} ; n() {} }"],
  ["decl-interface-in-declare-module-string", "declare module 'x' { export interface I { a: number } }"],
  ["decl-global-augmentation-top", "declare global { var x: number }"],
  ["decl-export-assignment-in-module", "declare module 'x' { export = y; }"],
  ["decl-import-equals-then-statement", "import x = require('y')\nconst a = 1"],
  ["decl-function-return-this-type", "function f(): this { return this; }"],
  ["decl-class-ctor-return-type", "class A { constructor() {} }"],
  ["decl-generic-method-in-object-literal", "const o = { m<T>(a: T): T { return a } };"],
  ["decl-class-field-arrow-type", "class A { m: (a: number) => void = () => {}; }"],
  ["decl-namespace-with-string-export", "namespace N { export const a = 'x'; export type T = 1; }"],
  ["decl-decorator-class-and-members", "@dec\nclass A {\n  @dec2 m() {}\n  @dec3 x = 1\n}"],
];

// 声明头关键字被各自的规则吃掉、本来就不进产物文本（这是设计，不是丢内容）
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
  "satisfies", "require", "constructor", "debugger", "with",
]);

function tagsOf(xml) {
  const tags = {};
  for (const m of xml.matchAll(/<([A-Z][A-Za-z]*)(?=[ />])/g)) tags[m[1]] = (tags[m[1]] || 0) + 1;
  return tags;
}

function tsKinds(source) {
  const sf = ts.createSourceFile("s.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const kinds = {};
  (function walk(node) {
    kinds[ts.SyntaxKind[node.kind]] = (kinds[ts.SyntaxKind[node.kind]] || 0) + 1;
    ts.forEachChild(node, walk);
  })(sf);
  const diags = (sf.parseDiagnostics || []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
  return { kinds, diags };
}

let problems = 0;
let total = 0;

for (const [name, source] of CASES) {
  if (filter && !name.includes(filter)) continue;
  total++;
  const { kinds, diags } = tsKinds(source);
  let xml = null;
  let err = null;
  try {
    const document = new TextDocument(source);
    document.FilePath = name + ".ts";
    const context = new TextContext(new Template());
    context.Process(document);
    xml = context.Root.ToString();
  } catch (e) {
    err = e;
  }
  const issues = [];
  if (diags.length) issues.push("TS 语法诊断: " + diags[0]);
  if (err) {
    const chain = [];
    let cur = err;
    for (let i = 0; i < 6 && cur; i++) {
      chain.push((cur.constructor && cur.constructor.name) + ": " + String(cur.Message || cur.message || "").split("\n")[0]);
      cur = cur.InnerException;
    }
    issues.push("抛异常 " + chain.join(" ← "));
  } else {
    const tags = tagsOf(xml);
    // 已知的「不是缺口」：正则正文按设计不渲染（regex-body-not-rendered）；
    // 字符串转义会把 `\u0041` 解成字符 `A`（语言配置）。这两类会让「找不到标识符」误报，跳过。
    const hasRegex = /\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/.test(source);
    const hasEscape = /\\u|\\x|\\[0-7]/.test(source);
    const words = new Set(source.match(/\$?[A-Za-z_][A-Za-z0-9_]*/g) || []);
    const xmlText = xml.replace(/<[^>]*>/g, " ") + " " + [...xml.matchAll(/([a-zA-Z]+)="([^"]*)"/g)].map((m) => m[2]).join(" ");
    const missing = [...words].filter((w) => !xmlText.includes(w) && !CONSUMED_KEYWORDS.has(w));
    if (missing.length && !hasRegex && !hasEscape) issues.push("产物里找不到这些标识符: " + missing.join(","));
    if (showAll) {
      console.log("\n=== " + name + " === " + (issues.length ? "⚠ " + issues.join(" | ") : "ok"));
      console.log("  TS  : " + Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + "=" + v).join(" "));
      console.log("  XML : " + Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + "=" + v).join(" "));
      console.log("  " + xml);
    }
  }
  if (issues.length) {
    problems++;
    console.log("\n⚠ " + name);
    console.log("  源码: " + JSON.stringify(source));
    for (const i of issues) console.log("  - " + i);
    if (xml) console.log("  产物: " + xml);
    if (err) console.log("  TS  : " + Object.entries(kinds).map(([k, v]) => k + "=" + v).join(" "));
  }
}

console.log(`\n侦察 ${total} 条：可疑 ${problems} 条`);
