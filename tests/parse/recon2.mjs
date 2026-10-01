/// 第二轮侦察：TS 5.x / 6.x 的新构造、以及真实代码里高频的边角写法。
/// 只报可疑项（抛异常 / 产物里找不到标识符 / TS 语法诊断）。
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const CASES = [
  // TS 5.x / 6.x
  ["ts5-satisfies-generic", "const x = y satisfies Record<string, Array<number>>;"],
  ["ts5-const-type-param-array", "function f<const T extends readonly unknown[]>(x: T): T { return x; }"],
  ["ts5-const-type-param-object", "declare function g<const T extends Record<string, unknown>>(x: T): T;"],
  ["ts5-using-in-block", "{ using a = f(); }"],
  ["ts5-using-for-of", "for (using a of b) {}"],
  ["ts5-await-using-toplevel", "await using a = f();"],
  ["ts5-decorator-accessor", "class C { @dec accessor x = 1; }"],
  ["ts5-export-type-star-as", "export type * as ns from 'm';"],
  ["ts5-import-type-attributes", "import type { A } from 'm' with { type: 'json' };"],
  ["ts5-tuple-variadic", "type T = [...A, ...B];"],
  ["ts5-tuple-labeled-optional", "type T = [a: number, b?: string, ...c: boolean[]];"],
  ["ts5-infer-constraint", "type T<U> = U extends infer V extends string ? V : never;"],
  ["ts5-multiple-infer", "type T<U> = U extends [infer A, infer B, ...infer R] ? [A, B, R] : never;"],
  ["ts5-mapped-key-remap-nested", "type T<U> = { [K in keyof U as K extends string ? `x${K}` : never]: U[K] };"],
  ["ts5-import-attributes-string-key", "import x from 'm' with { 'type': 'json' };"],
  ["ts5-decorator-metadata-class", "@dec class C { @dec2 m() {} }"],
  ["ts5-decorator-class-expression", "const A = class { @dec m() {} };"],
  ["ts6-disposable", "declare const d: Disposable;"],
  ["ts6-abstract-ctor-type", "type T = abstract new (x: number) => C;"],
  ["ts6-accessor-in-interface", "interface I { get x(): number; set x(v: number); }"],

  // 真实代码高频
  ["real-overloads-many", "function f(a: string): string;\nfunction f(a: number): number;\nfunction f(a: any): any { return a; }"],
  ["real-class-many-modifiers", "export default abstract class C<T> extends B<T> implements I, J {\n  public static readonly x = 1;\n  protected abstract m(): void;\n}"],
  ["real-nested-generics-deep", "type T = Map<string, Array<Promise<Record<string, Set<number>>>>>;"],
  ["real-conditional-deep", "type T<A, B> = A extends B ? B extends A ? 'same' : 'sub' : 'super';"],
  ["real-union-many", "type T = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';"],
  ["real-intersection-many", "type T = A & B & C & D & E;"],
  ["real-arrow-in-interface", "interface I { f: (a: number) => (b: string) => boolean; }"],
  ["real-object-nested-many", "const o = { a: { b: { c: { d: { e: 1 } } } } };"],
  ["real-array-of-objects", "const a = [{ x: 1, y: 2 }, { x: 3, y: 4 }];"],
  ["real-call-chain-long", "a.b().c().d().e().f();"],
  ["real-optional-chain-long", "a?.b?.c?.d?.e;"],
  ["real-template-multiline", "const s = `line1\nline2 ${x + y}\nline3`;"],
  ["real-iife-async", "(async () => { await f(); })();"],
  ["real-comma-operator", "for (let i = 0, j = 10; i < j; i++, j--) {}"],
  ["real-nested-ternary-long", "const x = a ? b : c ? d : e ? f : g;"],
  ["real-void-arrow", "const f = (): void => {};"],
  ["real-never-arrow", "const f = (): never => { throw new Error(); };"],
  ["real-async-generator", "async function* g() { for await (const x of y) yield x; }"],
  ["real-class-private-methods", "class C { #a = 1; #b() { return this.#a; } static #c = 2; }"],
  ["real-getter-computed", "class C { get [Symbol.toStringTag]() { return 'C'; } }"],
  ["real-index-signature-generic", "interface I { [k: string]: Array<number>; }"],
  ["real-namespace-nested-deep", "namespace A { export namespace B { export namespace C { export const x = 1; } } }"],
  ["real-module-augmentation", "declare module 'express' { interface Request { user?: string; } }"],
  ["real-global-augment", "declare global { interface Window { __x: number; } }"],
  ["real-export-default-fn-generic", "export default function f<T>(x: T): T { return x; }"],
  ["real-type-only-re-export", "export type { A, B } from 'm';"],
  ["real-import-equals-namespace", "import ns = require('m');"],
  ["real-enum-computed-string", "enum E { A = 'a'.length, B = A + 1 }"],
  ["real-const-assertion-array", "const a = [1, 2] as const;"],
  ["real-const-assertion-object", "const o = { a: 1 } as const;"],
  ["real-double-assertion", "const x = y as unknown as Z;"],
  ["real-generic-call-chain", "f<A>(1).g<B>(2).h<C>(3);"],
  ["real-new-generic-newline", "const x = new Map<\n  string,\n  number\n>();"],
  ["real-arrow-return-conditional", "const f = <T,>(x: T): T extends string ? 1 : 2 => (x ? 1 : 2) as any;"],
  ["real-satisfies-and-as", "const x = (y as A) satisfies B;"],
  ["real-nonnull-chain", "a!.b!.c!;"],
  ["real-optional-method-call", "obj?.method?.(1);"],
  ["real-spread-new", "const x = new C(...args);"],
  ["real-array-destructure-default-nested", "const [a = 1, [b = 2] = []] = arr;"],
  ["real-object-destructure-rest-nested", "const { a: { b: [c, ...d] } = {}, ...e } = o;"],
  ["real-param-destructure-default", "function f({ a = 1, b: { c } = {} }: T = {} as T) {}"],
  ["real-typed-this-param", "function f(this: Window, x: number) {}"],
  ["real-predicate-in-interface", "interface I { is(x: unknown): x is string; }"],
  ["real-assertion-in-class", "class C { assert(x: unknown): asserts x is string {} }"],
  ["real-abstract-in-namespace", "namespace N { export abstract class A { abstract m(): void; } }"],
  ["real-interface-extends-class", "interface I extends C {}"],
  ["real-class-expression-iife", "const C = class extends (B) {};"],
  ["real-super-in-nested-arrow", "class C extends B { m() { return () => super.m(); } }"],
  ["real-await-in-loop", "async function f() { for (const x of y) { await g(x); } }"],
  ["real-try-catch-finally-nested", "try { try {} catch {} } finally {}"],
  ["real-switch-nested", "switch (a) { case 1: switch (b) { case 2: break; } break; }"],
  ["real-label-continue", "outer: for (;;) { inner: for (;;) { continue outer; } }"],
  ["real-do-while-nested", "do { do {} while (a) } while (b)"],
  ["real-regex-with-flags", "const r = /[a-z]+/gi;"],
  ["real-regex-with-slash", "const r = /a\\/b/;"],
  ["real-division-chain", "const x = a / b / c / d;"],
  ["real-comment-in-type", "type T = /* c */ string;"],
  ["real-comment-between-decls", "const a = 1; // c\nconst b = 2;"],
  ["real-blank-lines-many", "const a = 1;\n\n\n\nconst b = 2;"],
  ["real-crlf", "const a = 1;\r\nconst b = 2;\r\n"],
  ["real-no-final-newline", "const a = 1;"],
  ["real-semicolonless", "const a = 1\nconst b = 2\nfunction f() {}\nclass C {}"],
  ["real-all-semicolons", "const a = 1;\nconst b = 2;\nfunction f() {};\nclass C {};"],
  ["real-deep-nesting", "function f() { if (a) { for (;;) { while (b) { switch (c) { case 1: try { g(); } catch {} } } } } }"],
  ["real-long-union-in-param", "function f(x: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j') {}"],
  ["real-arrow-in-object", "const o = { f: (x: number) => x, g: async () => 1 };"],
  ["real-class-field-arrow-generic", "class C { f = <T,>(x: T): T => x; }"],
  ["real-interface-method-newline", "interface I {\n  a(): void\n  b(): void\n}"],
  ["real-enum-trailing-newline", "enum E {\n  A,\n  B,\n}"],
  ["real-import-then-export", "import { a } from 'm'\nexport { a }"],
  ["real-export-then-import", "export { a }\nimport { b } from 'm'"],
  ["real-dts-style", "declare namespace N { interface I { x: number } function f(): void }"],
  ["real-dts-export-equals", "declare module 'm' { export = f; }"],
  ["real-dts-global-fn", "declare function f(): void;\ndeclare class C {}\ndeclare const x: number;"],
  // 块语句**紧接着**一条语句、中间没有换行也没有 `;`（第 63 轮记在这一族里：
  // 复合赋值的展开与「块算不算语句边界」互相牵制，改成严格边界会让展开丢内容，
  // 所以没进用例语料，靠这里盯着「内容不许丢」）。
  ["real-block-then-compound-assign", "{ A }a += 1"],
  ["real-block-then-let", "{ let y = 2 } z = 3"],
  // 第 64 轮补的一族：**文件结尾没有换行** / 换行风格 / BOM / 空文件 / 规模。
  // 第 63 轮那四个「合法 TS 抛异常」全在「结尾没有换行」这一族里，所以常驻盯着。
  ["edge-empty-file", ""],
  ["edge-only-newlines", "\n\n\n"],
  ["edge-only-comment", "// a\n/* b */"],
  ["edge-bom", "\uFEFFlet a = 1"],
  ["edge-crlf-no-trailing-newline", "let a = 1\r\nif (a) b()\r\nfunction f() { return a }"],
  ["edge-cr-no-trailing-newline", "let a = 1\rif (a) b()"],
  ["edge-mixed-newlines", "let a = 1\r\nif (a) b()\nfunction f() { return a }\r\n"],
  ["edge-eof-if-body", "if (x) print(1)"],
  ["edge-eof-while-body", "while (x) a = 1"],
  ["edge-eof-for-body", "for (;;) a = 1"],
  ["edge-eof-foreach-body", "for (const x of y) print(x)"],
  ["edge-eof-do-while", "do print(1); while (x)"],
  ["edge-eof-class", "class C { m() { return 1 } }"],
  ["edge-eof-switch", "switch (x) { case 1: a = 1; break; }"],
  ["edge-deep-parens", "let a = " + "(".repeat(60) + "1" + ")".repeat(60)],
  ["edge-deep-generics", "let a: " + "A<".repeat(40) + "B" + ">".repeat(40)],
  ["edge-many-statements", Array.from({ length: 400 }, (_, i) => `let v${i} = ${i}`).join("\n")],
  ["edge-many-union-members", "type T =\n" + Array.from({ length: 120 }, (_, i) => `  | T${i}`).join("\n")],
  // 第 65 轮补的一族：**冷门但合法**的 TS 形状（98 条批次的常驻子集）。
  ["exotic-declare-global", "declare global { interface Window { a: number } }"],
  ["exotic-module-augmentation", "declare module 'm' { interface I { a: number } }"],
  ["exotic-wildcard-module", "declare module '*.css' { const c: string; export default c }"],
  ["exotic-export-star-as", "export * as ns from 'm'"],
  ["exotic-export-type-star", "export type * from 'm'"],
  ["exotic-import-equals", "import fs = require('fs')"],
  ["exotic-export-import-equals", "export import x = y.z"],
  ["exotic-using", "using x = f()"],
  ["exotic-await-using", "async function g() { await using x = f() }"],
  ["exotic-accessor", "class C { accessor p = 1 }"],
  ["exotic-private-in", "class C { #p = 1; m(o: any) { return #p in o } }"],
  ["exotic-decorators", "@dec class C { @dec m(@dec a: number) {} }"],
  ["exotic-abstract-override", "abstract class C { abstract m(): void }"],
  ["exotic-asserts-is", "function f(x: any): asserts x is string {}"],
  ["exotic-this-is", "class C { m(): this is D { return true } }"],
  ["exotic-unique-symbol", "declare const s: unique symbol"],
  ["exotic-infer-constraint", "type X<T> = T extends [infer A extends string] ? A : never"],
  ["exotic-variadic-tuple", "type X<T extends unknown[]> = [number, ...T]"],
  ["exotic-tuple-labels", "type X = [first: number, second?: string]"],
  ["exotic-readonly-tuple", "type X = readonly [number, string]"],
  ["exotic-const-type-param", "function f<const T>(x: T): T { return x }"],
  ["exotic-intrinsic", "type X = Uppercase<'a'> | Capitalize<'b'>"],
  ["exotic-typeof-import", "type X = typeof import('m')"],
  ["exotic-import-type-generic", "type X = import('m').A<number>"],
  ["exotic-optional-index", "let x = a?.[b]"],
  ["exotic-nullish-assign", "a ??= b"],
  ["exotic-unsigned-shift-assign", "a >>>= b"],
  ["exotic-new-target", "function f() { return new.target }"],
  ["exotic-import-meta", "let u = import.meta.url"],
  ["exotic-this-param", "let f: (this: C, a: number) => void"],
  ["exotic-abstract-constructor", "let f: abstract new (a: number) => C"],
  ["exotic-angle-assertion", "let x = <number>y"],
  ["exotic-regex-unicode", "let r = /\\u{1F600}/u"],
  ["exotic-tagged-template", "let x = tag`a${b}c`"],
  ["exotic-nested-template", "let x = `a${`b${c}`}d`"],
  ["exotic-template-type-infer", "type X<T> = T extends `${infer A}-${infer B}` ? [A, B] : never"],
  ["exotic-mapped-as-template", "type X<T> = { [K in keyof T as `get${string & K}`]: T[K] }"],
  ["exotic-computed-symbol-key", "class C { [Symbol.iterator]() {} }"],
  ["exotic-numeric-separator", "let x = 1_000_000 + 0xffn + 0b1010 + 0o777"],
  ["exotic-as-const", "let x = [1, 2] as const"],
];

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
  "satisfies", "require", "constructor", "debugger", "x", "y", "a", "b", "c", "d",
  "e", "f", "g", "i", "j", "k", "m", "n", "o", "r", "s", "v", "T", "U", "A", "B",
  "C", "E", "I", "N", "K", "V", "R", "P", "re", "gi", "line1", "line2", "line3", "c",
]);

function report(name, source, xml, err) {
  const issues = [];
  const sf = ts.createSourceFile("s.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diags = (sf.parseDiagnostics || []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
  if (diags.length) issues.push("TS 语法诊断: " + diags[0]);
  if (err) {
    const chain = [];
    let cur = err;
    for (let i = 0; i < 5 && cur; i++) {
      chain.push((cur.constructor && cur.constructor.name) + ": " + String(cur.Message || cur.message || "").split("\n")[0]);
      cur = cur.InnerException;
    }
    issues.push("抛异常 " + chain.join(" ← "));
  } else if (xml !== null) {
    // 已知的「不是缺口」：正则正文按设计不渲染（regex-body-not-rendered），跳过这一类误报。
    const hasRegex = /\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/.test(source);
    const xmlText = xml.replace(/<[^>]*>/g, " ") + " " + [...xml.matchAll(/([a-zA-Z]+)="([^"]*)"/g)].map((m) => m[2]).join(" ");
    const words = new Set(source.match(/\$?[A-Za-z_][A-Za-z0-9_]*/g) || []);
    const missing = [...words].filter((w) => !xmlText.includes(w) && !CONSUMED_KEYWORDS.has(w));
    if (missing.length && !hasRegex) issues.push("产物里找不到标识符: " + missing.join(","));
    if (/<Statement><\/Statement>|<Statement \/>/.test(xml)) issues.push("出现空的 Statement");
  }
  if (issues.length) {
    console.log("\n⚠ " + name);
    console.log("  源码: " + JSON.stringify(source));
    for (const i of issues) console.log("  - " + i);
    if (xml) console.log("  产物: " + xml);
  }
  return issues.length > 0;
}

let total = 0;
let bad = 0;
for (const [name, source] of CASES) {
  total++;
  let xml = null;
  let err = null;
  try {
    const document = new TextDocument(source);
    const context = new TextContext(new Template());
    context.Process(document);
    xml = context.Root.ToString();
  } catch (e) {
    err = e;
  }
  if (report(name, source, xml, err)) bad++;
}
console.log(`\n第二轮侦察 ${total} 条：可疑 ${bad} 条`);
