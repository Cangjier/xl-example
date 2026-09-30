/// 广谱构造普查：把一批 TS 构造片段喂给两边的解析器，
/// 只报告「有毛病」的那些（抛异常 / TS 认了但产物里缺关键结构 / 两边节点数差得多）。
///
///   node tests/parse/sweep.mjs            只打印可疑项
///   node tests/parse/sweep.mjs --all      打印全部
///   node tests/parse/sweep.mjs --filter using
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

// 名字, 源码
const CASES = [
  // ---- 语句 ----
  ["stmt-empty", ";"],
  ["stmt-debugger", "debugger;"],
  ["stmt-continue-label", "outer: for (;;) { continue outer; }"],
  ["stmt-break-label", "outer: for (;;) { break outer; }"],
  ["stmt-with", "with (a) { b; }"],
  ["stmt-block-nested", "{ { let a = 1; } }"],
  ["stmt-directive", '"use strict"; let a = 1;'],
  ["stmt-multiple-declarators", "const a = 1, b = 2, c;"],
  ["stmt-var-destructure-default", "const { a = 1, b: { c = 2 } = {} } = x;"],
  ["stmt-array-destructure-nested", "const [[a, b], [, c = 0]] = m;"],
  ["stmt-array-destructure-rest", "const [a, ...rest] = m;"],
  ["stmt-object-destructure-rest", "const { a, ...rest } = m;"],
  ["stmt-object-destructure-computed", "const { [k]: v } = m;"],
  ["stmt-object-destructure-rename", "const { a: b } = m;"],
  ["stmt-for-in-decl", "for (const k in obj) {}"],
  ["stmt-for-of-decl", "for (const v of arr) {}"],
  ["stmt-for-of-await", "async function f() { for await (const v of arr) {} }"],
  ["stmt-for-empty", "for (;;) break;"],
  ["stmt-switch-scope", "switch (x) { case 1: { let a = 1; } break; }"],
  ["stmt-labelled-block", "blk: { break blk; }"],

  // ---- ASI ----
  ["asi-as-then-statement", "const v = x as A\ny = 2"],
  ["asi-return-newline", "function f() { return\n-1 }"],
  ["asi-return-newline-object", "function f() { return\n{ a: 1 } }"],
  ["asi-postfix-newline", "a\n++b"],
  ["asi-call-newline-paren", "f\n(1)"],
  ["asi-throw-newline", "function f() { throw\nnew Error() }"],
  ["asi-two-idents", "let a = 1\nlet b = 2"],
  ["asi-member-chain-newline", "const r = a\n.b\n.c"],
  ["asi-template-newline", "const r = tag\n`x`"],

  // ---- 表达式 ----
  ["expr-angle-assert", "const a = <T>x;"],
  ["expr-class-expression", "const C = class extends B implements I { m() {} };"],
  ["expr-class-expression-named", "const C = class D { };"],
  ["expr-function-expression-named", "const f = function g() { return g; };"],
  ["expr-new-target", "function f() { return new.target; }"],
  ["expr-import-meta", "const u = import.meta.url;"],
  ["expr-super-call", "class A extends B { constructor() { super(1); } }"],
  ["expr-super-member", "class A extends B { m() { return super.m(); } }"],
  ["expr-super-element", "class A extends B { m() { return super['m'](); } }"],
  ["expr-yield", "function* g() { yield 1; yield* h(); }"],
  ["expr-yield-await", "async function* g() { yield await p; }"],
  ["expr-await", "async function f() { await p; }"],
  ["expr-optional-call", "a?.();"],
  ["expr-optional-element", "a?.[0];"],
  ["expr-optional-chain-mixed", "a?.b?.[c]?.(d);"],
  ["expr-tagged-template-typeargs", "tag<T>`x`;"],
  ["expr-call-typeargs", "f<number>(1);"],
  ["expr-new-typeargs", "new C<number>(1);"],
  ["expr-comma-paren", "const a = (b, c);"],
  ["expr-comma-args", "f((a, b), c);"],
  ["expr-object-method", "const o = { m() { return 1; } };"],
  ["expr-object-getter-setter", "const o = { get a() { return 1; }, set a(v) {} };"],
  ["expr-object-computed", "const o = { [k]: 1, [k]() {} };"],
  ["expr-object-shorthand", "const o = { a, b };"],
  ["expr-object-spread", "const o = { ...a, b: 1 };"],
  ["expr-object-keyword-key", "const o = { class: 1, function: 2, new: 3 };"],
  ["expr-object-string-key", "const o = { 'a-b': 1, 2: 2 };"],
  ["expr-object-nested-fn", "const o = { m() { return function () {}; } };"],
  ["expr-array-spread", "const a = [1, ...b, 2];"],
  ["expr-array-holes", "const a = [1, , 3];"],
  ["expr-assign-chain", "a = b = c;"],
  ["expr-assign-destructure", "[a, b] = [b, a];"],
  ["expr-assign-object-destructure", "({ a, b } = o);"],
  ["expr-compound-all", "a += 1; a -= 1; a *= 1; a /= 1; a %= 1; a **= 1; a <<= 1; a >>= 1; a >>>= 1; a &= 1; a |= 1; a ^= 1; a &&= 1; a ||= 1; a ??= 1;"],
  ["expr-unary-tilde", "const a = ~b;"],
  ["expr-unary-plus", "const a = +b;"],
  ["expr-unary-minus", "const a = -b;"],
  ["expr-update-member", "a.b++; --a.b;"],
  ["expr-in-operator", "const a = 'x' in o;"],
  ["expr-instanceof", "const a = x instanceof Y;"],
  ["expr-nullish", "const a = b ?? c;"],
  ["expr-power-right-assoc", "const a = b ** c ** d;"],
  ["expr-conditional-nested-assign", "const a = b ? c : d;"],
  ["expr-paren-sequence-arrow", "const f = (a, b) => a + b;"],
  ["expr-arrow-object-body", "const f = () => ({ a: 1 });"],
  ["expr-arrow-generic", "const f = <T,>(x: T): T => x;"],
  ["expr-arrow-async", "const f = async (x) => await x;"],
  ["expr-arrow-async-generic", "const f = async <T>(x: T): Promise<T> => x;"],
  ["expr-arrow-single-param-typed", "const f = (x: number) => x;"],
  ["expr-arrow-rest", "const f = (...xs: number[]) => xs;"],
  ["expr-arrow-default", "const f = (x = 1) => x;"],
  ["expr-arrow-this-param", "const f = (this: C, x: number) => x;"],
  ["expr-arrow-return-obj-literal", "const f = (): { a: number } => ({ a: 1 });"],
  ["expr-arrow-destructure", "const f = ({ a, b: [c] }) => a;"],
  ["expr-immediately-invoked", "(function () { return 1; })();"],
  ["expr-nested-ternary", "const a = b ? c ? d : e : f;"],
  ["expr-regex-division-ambiguity", "const a = b / c / d;"],

  // ---- 类型 ----
  ["type-assertion-in-call", "f(<T>x);"],
  ["type-conditional-infer-constraint", "type X<T> = T extends [infer U extends string] ? U : never;"],
  ["type-conditional-nested-infer", "type X<T> = T extends (infer U)[] ? U : T extends Promise<infer V> ? V : never;"],
  ["type-import-type-args", "type X = import('./m').A<number>;"],
  ["type-import-typeof-args", "type X = typeof import('./m');"],
  ["type-template-literal", "type X = `a${string}b`;"],
  ["type-template-infer", "type X<T> = T extends `${infer A}-${infer B}` ? [A, B] : never;"],
  ["type-mapped-as", "type X<T> = { [K in keyof T as `get${string & K}`]: T[K] };"],
  ["type-mapped-modifiers", "type X<T> = { readonly [K in keyof T]?: T[K] };"],
  ["type-mapped-remove", "type X<T> = { -readonly [K in keyof T]-?: T[K] };"],
  ["type-indexed-access", "type X = A['b']['c'];"],
  ["type-tuple-named-rest", "type X = [a: number, ...rest: string[]];"],
  ["type-tuple-optional", "type X = [a?: number];"],
  ["type-fn-ctor-abstract", "type X = abstract new (a: number) => A;"],
  ["type-typeof-indexed", "type X = (typeof a)['b'];"],
  ["type-keyof-indexed", "type X = keyof A['b'];"],
  ["type-unique-symbol", "declare const s: unique symbol;"],
  ["type-pred-this", "interface I { m(this: I, a: string): this is I; }"],
  ["type-pred-asserts-this", "interface I { m(): asserts this is I; }"],
  ["type-pred-asserts-param", "function f(x: unknown): asserts x { }"],
  ["type-import-typeof-in-args", "type X = Map<string, import('./m').A>;"],
  ["type-conditional-distributive-nested", "type X<T> = T extends any ? T extends string ? 1 : 2 : 3;"],
  ["type-literal-index-signature", "type X = { [k: string]: number };"],
  ["type-literal-index-readonly", "type X = { readonly [k: string]: number };"],
  ["type-literal-method-generic", "type X = { m<T>(a: T): T };"],
  ["type-literal-new", "type X = { new (a: number): A };"],
  ["type-literal-new-generic", "type X = { new <T>(a: T): A<T> };"],
  ["type-literal-call", "type X = { (a: number): string };"],
  ["type-literal-getter", "type X = { get a(): number; set a(v: number); };"],
  ["type-literal-nested-object", "type X = { a: { b: { c: number } } };"],
  ["type-union-paren-array", "type X = (A | B)[];"],
  ["type-union-leading-pipe", "type X =\n  | A\n  | B;"],
  ["type-intersection-leading", "type X =\n  & A\n  & B;"],
  ["type-array-of-fn", "type X = (() => void)[];"],
  ["type-this-type", "class A { m(): this { return this; } }"],
  ["type-variance", "interface I<in out T> { }"],
  ["type-const-param", "function f<const T>(x: T) { }"],
  ["type-param-default-constraint", "type X<T extends string = 'a'> = T;"],
  ["type-generic-default-object", "class A<T = {}> { }"],
  ["type-import-type-qualified", "type X = import('./m').A.B;"],

  // ---- 声明 ----
  ["decl-class-modifiers", "export abstract class A<T> extends B implements I, J { }"],
  ["decl-class-index-signature", "class A { [k: string]: number; }"],
  ["decl-class-static-block", "class A { static { A.x = 1; } }"],
  ["decl-class-static-block-complex", "class A { static { let a = 1; if (a) { a = 2; } } }"],
  ["decl-class-semicolon-element", "class A { ; m() {} ; }"],
  ["decl-class-ctor-param-props", "class A { constructor(private a: number, public readonly b = 1, protected c?: string) {} }"],
  ["decl-class-overloads", "class A { m(a: number): void; m(a: string): void; m(a: any): void {} }"],
  ["decl-class-accessors", "class A { get x(): number { return 1; } set x(v: number) {} }"],
  ["decl-class-auto-accessor", "class A { accessor x = 1; static accessor y = 2; }"],
  ["decl-class-private", "class A { #x = 1; #m() {} static #y = 2; get #z() { return 1; } }"],
  ["decl-class-declare-field", "class A { declare x: number; }"],
  ["decl-class-definite-assign", "class A { x!: number; }"],
  ["decl-class-abstract-member", "abstract class A { abstract m(): void; abstract x: number; }"],
  ["decl-class-implements-generic", "class A implements I<number>, J { }"],
  ["decl-class-extends-expr", "class A extends mixin(B) { }"],
  ["decl-class-ctor-overload", "class A { constructor(a: number); constructor(a: string); constructor(a: any) {} }"],
  ["decl-class-generic-method", "class A { m<T extends object = {}>(a: T): T { return a; } }"],
  ["decl-class-static-init-order", "class A extends B { static x = super.y; }"],
  ["decl-class-computed-member", "class A { [k]() {} static [j] = 1; }"],
  ["decl-class-string-name", "class A { 'm-n'() {} 'p' = 1; 2() {} }"],
  ["decl-class-decorators", "class A { @dec m() {} @dec x = 1; @dec accessor y = 2; }"],
  ["decl-class-decorator-params", "class A { m(@dec a: number, @dec b) {} constructor(@dec c) {} }"],
  ["decl-class-call-super-in-field", "class A extends B { x = super.m(); }"],
  ["decl-fn-overloads", "function f(a: number): void; function f(a: string): void; function f(a: any): void {}"],
  ["decl-fn-generic-constraint-default", "function f<T extends A = B, U = T>(a: T, b: U): U { return b; }"],
  ["decl-fn-rest-param", "function f(...a: number[]): void {}"],
  ["decl-fn-optional-param", "function f(a?: number): void {}"],
  ["decl-fn-default-param", "function f(a = 1, { b } = {}, [c] = []): void {}"],
  ["decl-fn-this-param", "function f(this: void, a: number): void {}"],
  ["decl-fn-return-predicate", "function f(a: unknown): a is string { return true; }"],
  ["decl-fn-assertion-signature", "function f(a: unknown): asserts a is string {}"],
  ["decl-fn-no-body", "declare function f(): void;"],
  ["decl-enum-string", "enum E { A = 'a', B = 'b' }"],
  ["decl-enum-computed", "enum E { A = 1 << 2, B = A | 4 }"],
  ["decl-enum-const", "const enum E { A, B }"],
  ["decl-enum-comma", "enum E { A = 1, B = 2, }"],
  ["decl-interface-extends", "interface I<T> extends A, B<T> { }"],
  ["decl-interface-overloads", "interface I { m(a: number): void; m(a: string): void; }"],
  ["decl-interface-call-construct", "interface I { (a: number): string; new (a: number): I; }"],
  ["decl-interface-index", "interface I { [k: string]: number; }"],
  ["decl-interface-heritage-generic", "interface I extends A.B<C> { }"],
  ["decl-interface-empty", "interface I { }"],
  ["decl-interface-declare-global", "declare global { interface Window { x: number; } }"],
  ["decl-namespace-nested", "namespace A.B.C { export const x = 1; }"],
  ["decl-namespace-export-import-equals", "namespace A { export import B = C.D; }"],
  ["decl-module-string", "declare module 'foo' { export const x: number; }"],
  ["decl-module-wildcard", "declare module '*.css' { const s: string; export default s; }"],
  ["decl-module-augment", "declare module './m' { interface I { x: number; } }"],
  ["decl-type-alias-object", "type X = { a: number };"],
  ["decl-type-alias-fn", "type X = (a: number) => string;"],
  ["decl-type-alias-generic-nested", "type X<A, B = A> = Map<A, Array<B>>;"],
  ["decl-type-alias-union-tuple", "type X = [a: string] | [b: number];"],
  ["decl-using", "using x = make();"],
  ["decl-await-using", "async function f() { await using x = make(); }"],
  ["decl-using-destructure", "using { a, b } = make();"],
  ["decl-import-equals-require", "import x = require('y');"],
  ["decl-import-equals-qualified", "import x = A.B.C;"],
  ["decl-import-type-only-equals", "import type x = require('y');"],
  ["decl-export-equals", "export = x;"],
  ["decl-export-import-equals", "export import x = A.B;"],
  ["decl-export-as-namespace", "export as namespace Foo;"],
  ["decl-export-star-as", "export * as ns from './m';"],
  ["decl-export-type-star", "export type * from './m';"],
  ["decl-export-default-interface", "export default interface I { }"],
  ["decl-import-assert", "import x from './m' assert { type: 'json' };"],
  ["decl-import-attributes", "import x from './m' with { type: 'json' };"],
  ["decl-import-named-rename", "import { a as b, c } from './m';"],
  ["decl-import-default-namespace", "import d, * as ns from './m';"],
  ["decl-import-default-named", "import d, { a } from './m';"],
  ["decl-decorator-class", "@dec class A { }"],
  ["decl-decorator-export-class", "@dec export class A { }"],
  ["decl-decorator-factory", "@dec(1) @ns.dec class A { }"],
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
  if (ts.parseDiagnostics && diags.length) issues.push("TS 本身就有语法诊断: " + diags[0]);
  if (err) {
    let chain = [];
    let cur = err;
    for (let i = 0; i < 6 && cur; i++) {
      chain.push((cur.constructor && cur.constructor.name) + ": " + String(cur.Message || cur.message || "").split("\n")[0]);
      cur = cur.InnerException;
    }
    issues.push("抛异常 " + chain.join(" ← "));
  } else {
    const tags = tagsOf(xml);
    // 文本丢失：源码里的标识符既不在元素文本里、也不在任何属性值里。
    // 词法里 `$` 只允许出现在**开头**（`$foo`），不让它落在词尾——否则模板串 `` `a${x}` ``
    // 会被切成 `a$`，而产物里 `a` 与 `$` 是分开的两个单元，凭空报一次「标识符丢失」。
    const words = new Set(source.match(/\$?[A-Za-z_][A-Za-z0-9_]*/g) || []);
    const xmlText = xml.replace(/<[^>]*>/g, " ") + " " + [...xml.matchAll(/([a-zA-Z]+)="([^"]*)"/g)].map((m) => m[2]).join(" ");
    const missing = [...words].filter((w) => !xmlText.includes(w) && !CONSUMED_KEYWORDS.has(w));
    if (missing.length) issues.push("产物里找不到这些标识符: " + missing.join(","));
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

console.log(`\n普查 ${total} 条：可疑 ${problems} 条`);
process.exit(problems ? 1 : 0);
