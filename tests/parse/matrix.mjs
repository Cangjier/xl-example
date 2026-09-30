// 组合矩阵：把「同一条语法构造落在不同上下文里」跑成一个矩阵，找没人写用例的缺口。
//
//   node tests/parse/matrix.mjs                 跑全矩阵；有问题退出码 1
//   node tests/parse/matrix.mjs --filter arrow  只跑 id / 构造名 / 上下文名命中关键字的
//   node tests/parse/matrix.mjs --show          有问题时连产物 XML 一起打
//   node tests/parse/matrix.mjs --json out.json 完整结果写成 JSON
//
// 为什么需要它：单条构造单独写往往是对的，缺口多半出在**上下文**上——
// `1e-10` 单独跑没问题，可它落在 `for` 头 / 泛型实参 / 装饰器实参里就未必；
// `function () {}` 单独跑没问题，落在 `=` 右边才暴露出「表达式被当成声明边界」。
//
// 每条候选先让 TypeScript 自己判定是否合法（非法的直接跳过，不计入缺口），
// 合法的才跑四条判据：
//   1. 本工程解析器不抛异常；
//   2. 无损——源码里的标识符与字面量值还出现在产物里；
//   3. XML 标签嵌套良好；
//   4. （额外）产物里不出现没被转义的 `<`。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "dawn", "text", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "dawn", "text", "text-context.js"));

// ── 表达式原子 ─────────────────────────────────────────────────────
const EXPR = {
  id: "x",
  member: "x.y.z",
  "member-optional": "x?.y.z",
  index: "x[y]",
  "index-optional": "x?.[y]",
  call: "x(y)",
  "call-spread": "x(...y)",
  "call-trailing-comma": "x(y,)",
  "call-optional": "x?.()",
  "call-generic": "x<T>(y)",
  new: "new X()",
  "new-no-args": "new X",
  "new-generic": "new X<T>()",
  "new-member": "new x.Y()",
  "new-spread": "new X(...args)",
  "tagged-template": "tag`a${b}c`",
  "tagged-template-member": "a.b`x`",
  template: "`a${b}c`",
  "template-nested": "`a${`b${c}d`}e`",
  "template-plain": "`abc`",
  regex: "/ab+c/gi",
  "regex-unicode": "/\\p{L}+/u",
  number: "123",
  "number-hex": "0xFF",
  "number-binary": "0b1010",
  "number-octal": "0o777",
  "number-sep": "1_000",
  "number-exp": "1e10",
  "number-exp-signed": "1e-10",
  "number-exp-plus": "1.5e+3",
  "number-leading-dot": ".5",
  "number-trailing-dot": "5.",
  bigint: "123n",
  "bigint-hex": "0xFFn",
  "string-single": "'s'",
  "string-double": '"s"',
  "string-escape": "'a\\nb\\t\\\\'",
  "string-unicode-escape": "'\\u0041\\u{1F600}'",
  true: "true",
  false: "false",
  null: "null",
  undefined: "undefined",
  this: "this",
  "super-member": "super.x",
  "super-call": "super.x()",
  "super-index": "super['x']",
  paren: "(x)",
  "nested-paren": "((x))",
  sequence: "x, y",
  array: "[x, y]",
  "array-hole": "[x, , y]",
  "array-spread": "[...x]",
  "array-trailing-comma": "[x, y,]",
  object: "({ a: 1 })",
  "object-shorthand": "({ a })",
  "object-spread": "({ ...x })",
  "object-method": "({ m() { return 1; } })",
  "object-async-method": "({ async m() {} })",
  "object-generator": "({ *g() {} })",
  "object-getter-setter": "({ get a() { return 1; }, set a(v) {} })",
  "object-computed": "({ [k]: 1 })",
  "object-string-key": "({ 'a-b': 1 })",
  "object-number-key": "({ 1: 2 })",
  "object-nested": "({ a: { b: { c: 1 } } })",
  arrow: "() => 1",
  "arrow-param": "(a: number) => a",
  "arrow-generic": "<T>(a: T) => a",
  "arrow-async": "async () => 1",
  "arrow-async-generic": "async <T>(a: T) => a",
  "arrow-return-type": "(a: number): number => a",
  "arrow-return-typeliteral": "(): { a: number } => ({ a: 1 })",
  "arrow-return-union": "(a): A | B => a",
  "arrow-destructure": "({ a, b }) => a",
  "arrow-default-param": "(a = 1) => a",
  "arrow-rest-param": "(...a: number[]) => a",
  "arrow-body-block": "() => { return 1; }",
  "arrow-body-object": "() => ({ a: 1 })",
  "function-expr": "function () {}",
  "function-expr-named": "function f() {}",
  "function-expr-generator": "function* () {}",
  "function-expr-async": "async function () {}",
  "class-expr": "class {}",
  "class-expr-named": "class C {}",
  "class-expr-extends": "class extends B {}",
  "class-expr-decorated": "@dec class {}",
  as: "x as T",
  "as-const": "[1] as const",
  "angle-cast": "<T>x",
  satisfies: "x satisfies T",
  nonnull: "x!",
  "nonnull-chain": "x!.y!",
  "nonnull-call": "x!()",
  optional: "x?.y",
  nullish: "x ?? y",
  await: "await x",
  "await-then": "await x.then()",
  yield: "yield x",
  "yield-star": "yield* x",
  typeof: "typeof x",
  "typeof-member": "typeof x.y",
  void: "void x",
  delete: "delete x.y",
  not: "!x",
  "not-not": "!!x",
  bitnot: "~x",
  neg: "-x",
  pos: "+x",
  "pre-inc": "++x",
  "post-inc": "x++",
  "pre-dec": "--x",
  "post-dec": "x--",
  pow: "x ** y",
  add: "x + y",
  sub: "x - y",
  mul: "x * y",
  div: "x / y",
  mod: "x % y",
  lt: "x < y",
  gt: "x > y",
  le: "x <= y",
  ge: "x >= y",
  eq: "x == y",
  ne: "x != y",
  "seq-eq": "x === y",
  "seq-ne": "x !== y",
  and: "x && y",
  or: "x || y",
  bitand: "x & y",
  bitor: "x | y",
  bitxor: "x ^ y",
  shl: "x << y",
  shr: "x >> y",
  ushr: "x >>> y",
  in: "'k' in x",
  instanceof: "x instanceof Y",
  assign: "x = y",
  "assign-add": "x += y",
  "assign-nullish": "x ??= y",
  "assign-and": "x &&= y",
  "assign-or": "x ||= y",
  ternary: "x ? y : z",
  "ternary-nested": "x ? y ? 1 : 2 : z",
  "ternary-optional": "x?.y ? 1 : 2",
  "dynamic-import": "import('m')",
  "dynamic-import-await": "await import('m')",
  "import-meta": "import.meta.url",
  "new-target": "new.target",
  "angle-comparison-chain": "a < b > c",
  "comma-sequence": "x++, y--",
};

// ── 语句原子 ───────────────────────────────────────────────────────
const STMT = {
  empty: ";",
  block: "{ f(); }",
  "nested-block": "{ { f(); } }",
  debugger: "debugger;",
  expr: "f();",
  if: "if (a) f();",
  "if-else": "if (a) f(); else g();",
  "if-block": "if (a) { f(); }",
  "if-else-if": "if (a) f(); else if (b) g(); else h();",
  while: "while (a) f();",
  "do-while": "do f(); while (a);",
  for: "for (let i = 0; i < 1; i++) f();",
  "for-empty": "for (;;) f();",
  "for-in": "for (const k in o) f();",
  "for-of": "for (const v of o) f();",
  "for-of-destructure": "for (const [a, b] of o) f();",
  "for-of-object-destructure": "for (const { a, b } of o) f();",
  "for-await": "for await (const v of o) f();",
  "for-multi": "for (let i = 0, j = 1; i < j; i++, j--) f();",
  switch: "switch (a) { case 1: f(); break; default: g(); }",
  "switch-block-case": "switch (a) { case 1: { f(); } break; }",
  "switch-empty": "switch (a) {}",
  "switch-fallthrough": "switch (a) { case 1: case 2: f(); break; }",
  try: "try { f(); } catch (e) { g(); }",
  "try-nobind": "try { f(); } catch { g(); }",
  "try-finally": "try { f(); } finally { g(); }",
  "try-catch-finally": "try { f(); } catch (e) { g(); } finally { h(); }",
  throw: "throw new Error('x');",
  "throw-template": "throw new Error(`x${y}`);",
  return: "return;",
  "return-value": "return a;",
  "return-object": "return { a: 1 };",
  "return-asi": "return\n{ a: 1 };",
  break: "break;",
  continue: "continue;",
  "break-label": "outer: for (;;) { break outer; }",
  "continue-label": "outer: for (;;) { continue outer; }",
  label: "lbl: f();",
  "label-block": "lbl: { f(); }",
  "label-loop": "lbl: while (a) { break lbl; }",
  var: "var a = 1;",
  let: "let a = 1;",
  const: "const a = 1;",
  "const-multi": "const a = 1, b = 2;",
  "const-destructure-array": "const [a, b] = o;",
  "const-destructure-array-rest": "const [a, ...rest] = o;",
  "const-destructure-array-default": "const [a = 1] = o;",
  "const-destructure-array-hole": "const [, a] = o;",
  "const-destructure-object": "const { a, b } = o;",
  "const-destructure-object-rename": "const { a: x } = o;",
  "const-destructure-object-default": "const { a = 1 } = o;",
  "const-destructure-object-rest": "const { a, ...rest } = o;",
  "const-destructure-nested": "const { a: { b } } = o;",
  using: "using r = f();",
  "await-using": "await using r = f();",
  function: "function f() {}",
  "function-generator": "function* g() {}",
  "function-async": "async function f() {}",
  "function-async-generator": "async function* g() {}",
  "function-overload": "function f(x: number): void;\nfunction f(x: any): void {}",
  "function-nested": "function outer() { function inner() {} }",
  class: "class A {}",
  "class-decorated": "@dec class A {}",
  "class-abstract": "abstract class A {}",
  "class-static-block": "class A { static { init(); } }",
  enum: "enum E { A }",
  "enum-string": "enum E { A = 'a' }",
  "enum-const": "const enum E { A = 1 }",
  "enum-declare": "declare enum E { A = 1 }",
  interface: "interface I {}",
  "interface-declare": "declare interface I {}",
  namespace: "namespace N {}",
  "namespace-dotted": "namespace A.B.C {}",
  "namespace-declare": "declare namespace N {}",
  "type-alias": "type T = number;",
  "type-alias-generic": "type T<U> = U;",
  "declare-function": "declare function f(): void;",
  "declare-var": "declare var a: number;",
  "declare-const": "declare const a: number;",
  "import-default": "import a from 'm';",
  "import-named": "import { a, b } from 'm';",
  "import-namespace": "import * as ns from 'm';",
  "import-side-effect": "import 'm';",
  "import-type": "import type { A } from 'm';",
  "import-inline-type": "import { type A, b } from 'm';",
  "import-equals": "import a = require('m');",
  "import-attributes": "import a from 'm' with { type: 'json' };",
  "export-named": "export { a, b };",
  "export-from": "export { a } from 'm';",
  "export-star": "export * from 'm';",
  "export-star-as": "export * as ns from 'm';",
  "export-type-star": "export type * from 'm';",
  "export-empty": "export {};",
  "export-default": "export default 1 + 2;",
  "export-default-class": "export default class {}",
  "export-default-arrow": "export default () => {};",
  "export-assignment": "export = a;",
  "export-as-namespace": "export as namespace N;",
  "declare-module-string": "declare module 'x' { export const a: number; }",
  "declare-module-wildcard": "declare module '*.css' { const c: string; export default c; }",
  "declare-global": "declare global { interface Window { x: number; } }",
  with: "with (o) { f(); }",
  directive: "'use strict';",
};

// ── 类型原子 ───────────────────────────────────────────────────────
const TYPE = {
  any: "any",
  unknown: "unknown",
  never: "never",
  void: "void",
  undefined: "undefined",
  null: "null",
  boolean: "boolean",
  number: "number",
  bigint: "bigint",
  string: "string",
  symbol: "symbol",
  object: "object",
  this: "this",
  "lit-string": "'s'",
  "lit-string-double": '"s"',
  "lit-number": "1",
  "lit-neg": "-1",
  "lit-bigint": "1n",
  "lit-true": "true",
  "lit-false": "false",
  "lit-template": "`a${string}b`",
  "lit-template-plain": "`abc`",
  ref: "A",
  "ref-qualified": "A.B.C",
  "ref-generic": "A<B>",
  "ref-generic-multi": "A<B, C>",
  "ref-generic-nested": "A<B<C>>",
  "ref-generic-union": "A<B | C>",
  "ref-generic-fn": "A<(x: number) => void>",
  "ref-generic-object": "A<{ b: number }>",
  "ref-generic-tuple": "A<[B, C]>",
  array: "A[]",
  "array-nested": "A[][]",
  "array-of-union": "(A | B)[]",
  "readonly-array": "readonly A[]",
  "readonly-array-generic": "readonly Array<A>",
  tuple: "[A, B]",
  "tuple-empty": "[]",
  "tuple-rest": "[A, ...B[]]",
  "tuple-optional": "[A, B?]",
  "tuple-labeled": "[a: A, b: B]",
  "tuple-labeled-optional": "[a: A, b?: B]",
  "tuple-labeled-rest": "[a: A, ...rest: B[]]",
  "tuple-readonly": "readonly [A, B]",
  "tuple-nested": "[[A], [B]]",
  union: "A | B",
  "union-leading-pipe": "\n  | A\n  | B",
  "union-many": "A | B | C | D",
  "union-undefined": "A | undefined",
  "union-literal": "'a' | 'b' | 1",
  intersection: "A & B",
  "union-intersection": "(A | B) & C",
  paren: "(A)",
  "nested-paren": "((A))",
  "paren-union-array": "(A | B)[]",
  fn: "() => void",
  "fn-params": "(a: number, b?: string, ...c: any[]) => void",
  "fn-generic": "<T>(a: T) => T",
  "fn-generic-constraint": "<T extends object>(a: T) => T",
  "fn-new": "new (a: number) => A",
  "fn-abstract-new": "abstract new (a: number) => A",
  "fn-this": "(this: void, a: number) => void",
  "fn-predicate": "(a: unknown) => a is string",
  "fn-asserts": "(a: unknown) => asserts a is string",
  "fn-return-object": "() => { a: A }",
  "fn-return-union": "() => A | B",
  keyof: "keyof A",
  "keyof-indexed": "keyof A['b']",
  typeof: "typeof a",
  "typeof-member": "typeof a.b.c",
  indexed: "A['b']",
  "indexed-chain": "A['b']['c']",
  conditional: "A extends B ? C : D",
  "conditional-nested": "A extends B ? (C extends D ? 1 : 2) : 3",
  "conditional-infer": "A extends Array<infer U> ? U : never",
  "conditional-infer-constraint": "A extends Array<infer U extends string> ? U : never",
  "conditional-infer-multi": "A extends [infer U, infer V] ? U : V",
  mapped: "{ [K in keyof T]: T[K] }",
  "mapped-modifiers": "{ readonly [K in keyof T]?: T[K] }",
  "mapped-minus": "{ -readonly [K in keyof T]-?: T[K] }",
  "mapped-as": "{ [K in keyof T as `get${string & K}`]: T[K] }",
  "mapped-union-key": "{ [K in 'a' | 'b']: number }",
  "mapped-template-key": "{ [K in `a${string}`]: number }",
  "literal-object": "{ a: A }",
  "literal-empty": "{}",
  "literal-optional-readonly": "{ readonly a?: A }",
  "literal-method": "{ m(): void }",
  "literal-method-generic": "{ m<T>(a: T): T }",
  "literal-call": "{ (): A }",
  "literal-construct": "{ new (): A }",
  "literal-abstract-construct": "{ abstract new (): A }",
  "literal-index": "{ [k: string]: A }",
  "literal-index-readonly": "{ readonly [k: string]: A }",
  "literal-nested": "{ a: { b: { c: A } } }",
  "literal-getter-setter": "{ get a(): A; set a(v: A); }",
  "literal-in-union": "{ a: A } | null",
  "import-type": "import('m').A",
  "import-type-generic": "import('m').A<B>",
  "typeof-import": "typeof import('m')",
  "typeof-import-member": "typeof import('m').a.b",
  "unique-symbol": "unique symbol",
  "unique-symbol-prop": "{ readonly s: unique symbol }",
};

// ── 成员原子（类体 / 接口体 / 类型字面量体 / 对象字面量）───────────
const MEMBER = {
  prop: "a: number;",
  "prop-optional": "a?: number;",
  "prop-readonly": "readonly a: number;",
  "prop-static": "static a: number;",
  "prop-private": "private a: number;",
  "prop-protected": "protected a: number;",
  "prop-public": "public a: number;",
  "prop-declare": "declare a: number;",
  "prop-definite": "a!: number;",
  "prop-init": "a = 1;",
  "prop-computed": "[Symbol.iterator]: number;",
  "prop-string-name": "'a-b': number;",
  "prop-number-name": "1: number;",
  "prop-private-name": "#a;",
  "prop-accessor": "accessor a = 1;",
  "prop-static-accessor": "static accessor a = 1;",
  "prop-unique-symbol": "readonly s: unique symbol;",
  semicolon: ";",
  method: "m(): void;",
  "method-body": "m() { return 1; }",
  "method-optional": "m?(): void;",
  "method-generic": "m<T>(a: T): T;",
  "method-optional-generic": "m?<T>(a: T): T;",
  "method-static": "static m(): void;",
  "method-async": "async m() {}",
  "method-generator": "*m() {}",
  "method-async-generator": "async *m() {}",
  "method-decorated": "@dec m(): void;",
  "method-abstract": "abstract m(): void;",
  "method-override": "override m() {}",
  "method-declare": "declare m(): void;",
  "method-overload": "m(a: number): void; m(a: string): void;",
  "method-computed": "[Symbol.iterator](): void;",
  "method-computed-body": "[Symbol.iterator]() { return 1; }",
  getter: "get a(): number;",
  "getter-body": "get a() { return 1; }",
  setter: "set a(v: number);",
  "setter-body": "set a(v: number) {}",
  "constructor": "constructor();",
  "constructor-param-props": "constructor(private a: number, public readonly b: string) {}",
  "static-block": "static { init(); }",
  "index-signature": "[k: string]: number;",
  "index-signature-readonly": "readonly [k: string]: number;",
  "index-signature-template": "[k: `a${string}`]: number;",
  "call-signature": "(a: number): string;",
  "call-signature-generic": "<T>(a: T): T;",
  "construct-signature": "new (a: number): I;",
  "construct-signature-generic": "new <T>(a: T): I;",
  "abstract-construct-signature": "abstract new (a: number): I;",
};

// ── 上下文 ─────────────────────────────────────────────────────────
const CTX = [
  // 语句上下文
  { id: "top", cat: "stmt", wrap: (s) => s },
  { id: "stmt-block", cat: "stmt", wrap: (s) => `{\n${s}\n}` },
  { id: "stmt-fn-body", cat: "stmt", wrap: (s) => `function __f() {\n${s}\n}` },
  { id: "stmt-arrow-body", cat: "stmt", wrap: (s) => `const __a = () => {\n${s}\n};` },
  { id: "stmt-method-body", cat: "stmt", wrap: (s) => `class __C { m() {\n${s}\n} }` },
  { id: "stmt-if-body", cat: "stmt", wrap: (s) => `if (a) {\n${s}\n}` },
  { id: "stmt-else-body", cat: "stmt", wrap: (s) => `if (a) {} else {\n${s}\n}` },
  { id: "stmt-for-body", cat: "stmt", wrap: (s) => `for (;;) {\n${s}\n}` },
  { id: "stmt-while-body", cat: "stmt", wrap: (s) => `while (a) {\n${s}\n}` },
  { id: "stmt-switch-case", cat: "stmt", wrap: (s) => `switch (a) { case 1:\n${s}\n}` },
  { id: "stmt-switch-default", cat: "stmt", wrap: (s) => `switch (a) { default:\n${s}\n}` },
  { id: "stmt-try-body", cat: "stmt", wrap: (s) => `try {\n${s}\n} catch {}` },
  { id: "stmt-catch-body", cat: "stmt", wrap: (s) => `try {} catch {\n${s}\n}` },
  { id: "stmt-finally-body", cat: "stmt", wrap: (s) => `try {} finally {\n${s}\n}` },
  { id: "stmt-namespace-body", cat: "stmt", wrap: (s) => `namespace __N {\n${s}\n}` },
  { id: "stmt-declare-module", cat: "stmt", wrap: (s) => `declare module 'm' {\n${s}\n}` },
  { id: "stmt-declare-global", cat: "stmt", wrap: (s) => `declare global {\n${s}\n}` },
  { id: "stmt-label-block", cat: "stmt", wrap: (s) => `lbl: {\n${s}\n}` },
  { id: "stmt-async-fn-body", cat: "stmt", wrap: (s) => `async function __f() {\n${s}\n}` },
  { id: "stmt-generator-body", cat: "stmt", wrap: (s) => `function* __f() {\n${s}\n}` },
  { id: "stmt-class-body-top", cat: "stmt", wrap: (s) => `class __C {\n${s}\n}` },

  // 表达式上下文
  { id: "expr-init", cat: "expr", wrap: (s) => `const __v = ${s};` },
  { id: "expr-stmt", cat: "expr", wrap: (s) => `${s};` },
  { id: "expr-call-arg", cat: "expr", wrap: (s) => `f(${s});` },
  { id: "expr-call-second-arg", cat: "expr", wrap: (s) => `f(1, ${s});` },
  { id: "expr-call-last-arg", cat: "expr", wrap: (s) => `f(1, ${s});` },
  { id: "expr-array", cat: "expr", wrap: (s) => `const __v = [${s}];` },
  { id: "expr-array-second", cat: "expr", wrap: (s) => `const __v = [1, ${s}];` },
  { id: "expr-object-value", cat: "expr", wrap: (s) => `const __v = { k: ${s} };` },
  { id: "expr-object-key", cat: "expr", wrap: (s) => `const __v = { [${s}]: 1 };` },
  { id: "expr-return", cat: "expr", wrap: (s) => `function __f() { return ${s}; }` },
  { id: "expr-arrow-body", cat: "expr", wrap: (s) => `const __a = () => ${s};` },
  { id: "expr-if-cond", cat: "expr", wrap: (s) => `if (${s}) {}` },
  { id: "expr-while-cond", cat: "expr", wrap: (s) => `while (${s}) {}` },
  { id: "expr-do-while-cond", cat: "expr", wrap: (s) => `do {} while (${s});` },
  { id: "expr-for-init", cat: "expr", wrap: (s) => `for (${s}; ; ) {}` },
  { id: "expr-for-cond", cat: "expr", wrap: (s) => `for (; ${s}; ) {}` },
  { id: "expr-for-next", cat: "expr", wrap: (s) => `for (; ; ${s}) {}` },
  { id: "expr-switch-disc", cat: "expr", wrap: (s) => `switch (${s}) {}` },
  { id: "expr-switch-case", cat: "expr", wrap: (s) => `switch (a) { case ${s}: break; }` },
  { id: "expr-template", cat: "expr", wrap: (s) => "const __v = `a${" + s + "}b`;" },
  { id: "expr-spread-arg", cat: "expr", wrap: (s) => `f(...${s});` },
  { id: "expr-spread-array", cat: "expr", wrap: (s) => `const __v = [...${s}];` },
  { id: "expr-spread-object", cat: "expr", wrap: (s) => `const __v = { ...${s} };` },
  { id: "expr-throw", cat: "expr", wrap: (s) => `throw ${s};` },
  { id: "expr-assign-rhs", cat: "expr", wrap: (s) => `x = ${s};` },
  { id: "expr-assign-compound", cat: "expr", wrap: (s) => `x += ${s};` },
  { id: "expr-ternary-cond", cat: "expr", wrap: (s) => `const __v = ${s} ? 1 : 2;` },
  { id: "expr-ternary-true", cat: "expr", wrap: (s) => `const __v = x ? ${s} : 2;` },
  { id: "expr-ternary-false", cat: "expr", wrap: (s) => `const __v = x ? 1 : ${s};` },
  { id: "expr-paren", cat: "expr", wrap: (s) => `const __v = (${s});` },
  { id: "expr-logical-left", cat: "expr", wrap: (s) => `const __v = ${s} && y;` },
  { id: "expr-logical-right", cat: "expr", wrap: (s) => `const __v = y && ${s};` },
  { id: "expr-binary-left", cat: "expr", wrap: (s) => `const __v = ${s} + y;` },
  { id: "expr-binary-right", cat: "expr", wrap: (s) => `const __v = y + ${s};` },
  { id: "expr-member-object", cat: "expr", wrap: (s) => `const __v = (${s}).k;` },
  { id: "expr-index-object", cat: "expr", wrap: (s) => `const __v = (${s})[0];` },
  { id: "expr-call-callee", cat: "expr", wrap: (s) => `const __v = (${s})();` },
  { id: "expr-new-arg", cat: "expr", wrap: (s) => `new X(${s});` },
  { id: "expr-new-callee", cat: "expr", wrap: (s) => `new (${s})();` },
  { id: "expr-as-operand", cat: "expr", wrap: (s) => `const __v = (${s}) as any;` },
  { id: "expr-satisfies-operand", cat: "expr", wrap: (s) => `const __v = (${s}) satisfies any;` },
  { id: "expr-await-operand", cat: "expr", wrap: (s) => `async function __f() { await (${s}); }` },
  { id: "expr-decorator", cat: "expr", wrap: (s) => `@${s} class __C {}` },
  { id: "expr-decorator-arg", cat: "expr", wrap: (s) => `@dec(${s}) class __C {}` },
  { id: "expr-computed-member-name", cat: "expr", wrap: (s) => `class __C { [${s}]() {} }` },
  { id: "expr-enum-init", cat: "expr", wrap: (s) => `enum __E { A = ${s} }` },
  { id: "expr-default-param", cat: "expr", wrap: (s) => `function __f(a = ${s}) {}` },
  { id: "expr-var-annotation-generic", cat: "expr", wrap: (s) => `let __v: A<${s}>;` },
  { id: "expr-yield", cat: "expr", wrap: (s) => `function* __f() { yield ${s}; }` },
  { id: "expr-tagged-template", cat: "expr", wrap: (s) => "const __v = (" + s + ")`x`;" },

  // 类型上下文
  { id: "type-annotation", cat: "type", wrap: (s) => `let __v: ${s};` },
  { id: "type-alias", cat: "type", wrap: (s) => `type __T = ${s};` },
  { id: "type-generic-arg", cat: "type", wrap: (s) => `type __T = A<${s}>;` },
  { id: "type-generic-arg-second", cat: "type", wrap: (s) => `type __T = A<B, ${s}>;` },
  { id: "type-array-elem", cat: "type", wrap: (s) => `type __T = (${s})[];` },
  { id: "type-tuple-elem", cat: "type", wrap: (s) => `type __T = [${s}];` },
  { id: "type-tuple-rest", cat: "type", wrap: (s) => `type __T = [...${s}[]];` },
  { id: "type-union-member", cat: "type", wrap: (s) => `type __T = ${s} | null;` },
  { id: "type-union-second", cat: "type", wrap: (s) => `type __T = null | ${s};` },
  { id: "type-intersection-member", cat: "type", wrap: (s) => `type __T = ${s} & object;` },
  { id: "type-conditional-check", cat: "type", wrap: (s) => `type __T = ${s} extends B ? C : D;` },
  { id: "type-conditional-true", cat: "type", wrap: (s) => `type __T = X extends B ? ${s} : D;` },
  { id: "type-conditional-false", cat: "type", wrap: (s) => `type __T = X extends B ? C : ${s};` },
  { id: "type-param-constraint", cat: "type", wrap: (s) => `type __T<X extends ${s}> = X;` },
  { id: "type-param-default", cat: "type", wrap: (s) => `type __T<X = ${s}> = X;` },
  { id: "type-mapped-key", cat: "type", wrap: (s) => `type __T = { [K in ${s}]: number };` },
  { id: "type-mapped-value", cat: "type", wrap: (s) => `type __T = { [K in 'a']: ${s} };` },
  { id: "type-mapped-as", cat: "type", wrap: (s) => `type __T = { [K in 'a' as ${s}]: number };` },
  { id: "type-return", cat: "type", wrap: (s) => `declare function __f(): ${s};` },
  { id: "type-return-body", cat: "type", wrap: (s) => `function __f(): ${s} { return x; }` },
  { id: "type-method-return", cat: "type", wrap: (s) => `interface __I { m(): ${s}; }` },
  { id: "type-interface-extends", cat: "type", wrap: (s) => `interface __I extends ${s} {}` },
  { id: "type-class-implements", cat: "type", wrap: (s) => `class __C implements ${s} {}` },
  { id: "type-class-extends", cat: "type", wrap: (s) => `class __C extends ${s} {}` },
  { id: "type-prop-annotation", cat: "type", wrap: (s) => `interface __I { p: ${s}; }` },
  { id: "type-indexed-object", cat: "type", wrap: (s) => `type __T = ${s}['k'];` },
  { id: "type-keyof", cat: "type", wrap: (s) => `type __T = keyof ${s};` },
  { id: "type-typeof", cat: "type", wrap: (s) => `type __T = typeof ${s};` },
  { id: "type-fn-return", cat: "type", wrap: (s) => `type __T = () => ${s};` },
  { id: "type-fn-param", cat: "type", wrap: (s) => `type __T = (a: ${s}) => void;` },
  { id: "type-template", cat: "type", wrap: (s) => "type __T = `a${" + s + "}b`;" },
  { id: "type-infer-constraint", cat: "type", wrap: (s) => `type __T<A> = A extends Array<infer U extends ${s}> ? U : never;` },
  { id: "type-object-member", cat: "type", wrap: (s) => `type __T = { p: ${s} };` },
  { id: "type-new-return", cat: "type", wrap: (s) => `type __T = new () => ${s};` },
  { id: "type-abstract-new-return", cat: "type", wrap: (s) => `type __T = abstract new () => ${s};` },
  { id: "type-fn-return-typeliteral", cat: "type", wrap: (s) => `type __T = () => { p: ${s} };` },
  { id: "type-generic-default-param", cat: "type", wrap: (s) => `interface __I<T = ${s}> {}` },
  { id: "type-satisfies", cat: "type", wrap: (s) => `const __v = x satisfies ${s};` },
  { id: "type-as", cat: "type", wrap: (s) => `const __v = x as ${s};` },
  { id: "type-angle-cast", cat: "type", wrap: (s) => `const __v = <${s}>x;` },
  { id: "type-predicate", cat: "type", wrap: (s) => `declare function __f(a: unknown): a is ${s};` },
  { id: "type-asserts", cat: "type", wrap: (s) => `declare function __f(a: unknown): asserts a is ${s};` },
  { id: "type-import-arg", cat: "type", wrap: (s) => `type __T = import('m').A<${s}>;` },

  // 成员上下文
  { id: "member-class", cat: "member", wrap: (s) => `class __C {\n${s}\n}` },
  { id: "member-interface", cat: "member", wrap: (s) => `interface __I {\n${s}\n}` },
  { id: "member-typeliteral", cat: "member", wrap: (s) => `type __T = {\n${s}\n};` },
  { id: "member-class-declare", cat: "member", wrap: (s) => `declare class __C {\n${s}\n}` },
  { id: "member-class-abstract", cat: "member", wrap: (s) => `abstract class __C {\n${s}\n}` },
  { id: "member-class-export", cat: "member", wrap: (s) => `export class __C {\n${s}\n}` },
];

// ── 只在模块顶层合法的语句 ─────────────────────────────────────────
// `import` / `export` 的**声明形**只能站在模块顶层（或环境模块体内）。
// 放进块 / switch / 函数体里是**语法层之上**的错误：TypeScript 自带的 parser
// （`parseDiagnostics`）并不报它，只有 program 的 grammar 检查才报。
// 这类输入本工程没有义务给出有意义的树，所以从矩阵里剔除，
// 免得把一个「非法程序」记成解析器的缺口。
const TOP_ONLY = new Set([
  "import-default", "import-named", "import-namespace", "import-side-effect",
  "import-type", "import-inline-type", "import-equals", "import-attributes",
  "export-named", "export-from", "export-star", "export-star-as", "export-type-star",
  "export-empty", "export-default", "export-default-class", "export-default-arrow",
  "export-assignment", "export-as-namespace",
]);
const TOP_ONLY_CTX = new Set(["top", "stmt-declare-module"]);

// ── 判据 ───────────────────────────────────────────────────────────
const ESCAPES = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\u000b", a: "\u0007", "0": "\0" };

/** 还原 XML 实体转义（`&lt;` / `&gt;` / `&amp;`）。`&amp;` 必须最后换，否则会二次解码。 */
function unescapeXml(text) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/**
 * 把一段文本里的转义写法还原成实际字符。
 *
 * 产物对转义有自己的写法，那些是**输出格式**而不是内容差异：
 * `\x07` 写成 `\a`、逐字串里把 `\` 写成 `\\`、`"` 串里把 `'` 写成 `\'`。
 * 两侧都过一遍这里，比的是实际字符。
 */
function decode(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\\") {
      out += text[i];
      continue;
    }
    const c = text[i + 1];
    if (c === undefined) {
      out += "\\";
      break;
    }
    if (c === "x") {
      out += String.fromCharCode(parseInt(text.substr(i + 2, 2), 16));
      i += 3;
      continue;
    }
    if (c === "u") {
      if (text[i + 2] === "{") {
        const close = text.indexOf("}", i + 3);
        out += String.fromCodePoint(parseInt(text.slice(i + 3, close), 16));
        i = close;
        continue;
      }
      out += String.fromCharCode(parseInt(text.substr(i + 2, 4), 16));
      i += 5;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(ESCAPES, c)) {
      out += ESCAPES[c];
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** XML 嵌套是否良好（只认本工程的标签形状：大写开头的 PascalCase）。 */
function xmlNestingProblem(xml) {
  const stack = [];
  const re = /<(\/?)([A-Za-z][A-Za-z0-9]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] === "/") {
      if (stack.pop() !== m[2]) return `闭合不匹配 </${m[2]}>`;
    } else if (m[4] !== "/") {
      stack.push(m[2]);
    }
  }
  if (stack.length) return `未闭合 ${stack.slice(-3).join(" > ")}`;
  return null;
}

/** 产物里出现没被转义的 `<`（标签名都是大写开头）。 */
function xmlEscapeProblem(xml) {
  for (let i = 0; i < xml.length; i++) {
    if (xml[i] !== "<") continue;
    const next = xml[i + 1];
    if (next === "/" || (next >= "A" && next <= "Z")) continue;
    return `未转义的 \`<\`：…${xml.slice(Math.max(0, i - 30), i + 30)}…`;
  }
  return null;
}

function parse(source, label) {
  const template = new Template();
  const document = new TextDocument(source);
  document.FilePath = label;
  const context = new TextContext(template);
  context.Process(document);
  return context.Root.ToString();
}

function run() {
  const args = process.argv.slice(2);
  const filter = args.includes("--filter") ? args[args.indexOf("--filter") + 1] : null;
  const show = args.includes("--show");
  const jsonAt = args.indexOf("--json");
  const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : null;

  const CATS = { expr: EXPR, stmt: STMT, type: TYPE, member: MEMBER };
  let total = 0;
  let invalid = 0;
  let ok = 0;
  const problems = [];

  for (const ctx of CTX) {
    for (const [name, atom] of Object.entries(CATS[ctx.cat])) {
      const id = `${ctx.id} × ${name}`;
      if (filter && !(id.includes(filter) || name.includes(filter) || ctx.id.includes(filter))) continue;
      if (TOP_ONLY.has(name) && TOP_ONLY_CTX.has(ctx.id) === false) continue;
      const source = ctx.wrap(atom);
      total++;

      const src = source.charCodeAt(0) === 0xfeff ? source.substring(1) : source;
      const sf = ts.createSourceFile("t.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const diags = (sf.parseDiagnostics || []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
      if (diags.length) {
        invalid++;
        continue;
      }

      const found = [];
      let xml = null;
      try {
        xml = parse(src, "t.ts");
      } catch (e) {
        found.push("throw: " + (e && e.constructor && e.constructor.name) + " :: " + String(e && e.message).split("\n")[0]);
      }

      if (xml !== null) {
        const rawXml = unescapeXml(xml);
        const flat = decode(rawXml);
        const hasRegexToken = xml.includes("<RegexToken");
        const lost = [];
        (function visit(node) {
          let candidates = null;
          let kindName = null;
          if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
            // 标识符在产物里可能是标签名而不是文本（结构词升级成节点：`new` → `<New>`）。
            const capitalized = node.text.length > 0 ? node.text[0].toUpperCase() + node.text.slice(1) : node.text;
            candidates = [node.text, "<" + capitalized];
            kindName = "Identifier";
          } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            const raw = node.getText(sf);
            const inner = raw.length >= 2 ? raw.slice(1, -1) : raw;
            candidates = [node.text, raw, inner];
            kindName = "String";
          } else if (ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) {
            candidates = [node.getText(sf), node.text];
            kindName = "Number";
          } else if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
            // 正则正文与标志存在 `RegexToken.Temp` / `.Flags` 上，**刻意不渲染进 XML**
            // （见 `dawn/text/tokens/regex-token.xl.md`）。这里只断言它成了一个 RegexToken。
            candidates = hasRegexToken ? [node.getText(sf), ""] : [node.getText(sf)];
            kindName = "Regex";
          }
          if (candidates) {
            // 候选与产物都可能是「转义写法」或「实际字符」，两种都试：
            //   `flat` 是还原后的产物文本，`rawXml` 是只去了 XML 实体的产物文本。
            const hit = candidates.some((c) => {
              if (c.length === 0) return true;
              const doubled = c.replace(/\\/g, "\\\\");
              return flat.includes(c) || flat.includes(decode(c)) || rawXml.includes(c) || rawXml.includes(doubled);
            });
            if (!hit) lost.push(kindName + ":" + candidates[0].slice(0, 40));
          }
          ts.forEachChild(node, visit);
        })(sf);
        if (lost.length) found.push("lost: " + [...new Set(lost)].slice(0, 4).join(", "));
        const nest = xmlNestingProblem(xml);
        if (nest) found.push("xml: " + nest);
        const escape = xmlEscapeProblem(xml);
        if (escape) found.push("xml: " + escape);
      }

      if (found.length === 0) {
        ok++;
        continue;
      }
      problems.push({ id, source, problems: found, xml });
    }
  }

  console.log(`构造矩阵：候选 ${total} 条，TS 判定非法跳过 ${invalid} 条，合法并跑通 ${ok} 条，有问题 ${problems.length} 条\n`);

  const groups = new Map();
  for (const p of problems) {
    const key = p.problems.join(" | ").slice(0, 140);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  for (const [key, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`── ${list.length} 条：${key}`);
    for (const p of list.slice(0, 8)) {
      console.log(`     ${p.id}`);
      console.log(`       ${p.source.replace(/\n/g, "⏎").slice(0, 160)}`);
      if (show && p.xml) console.log(`       xml: ${p.xml.slice(0, 700)}`);
    }
    if (list.length > 8) console.log(`     …还有 ${list.length - 8} 条`);
    console.log("");
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(problems.map((p) => ({ id: p.id, source: p.source, problems: p.problems, xml: p.xml })), null, 1), "utf8");
    console.log(`完整结果 → ${jsonPath}`);
  }
  process.exitCode = problems.length === 0 ? 0 : 1;
}

run();
