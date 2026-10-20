// module / namespace 块 chunk 4：ambient module / namespace 里的无体函数声明（base + trivia）。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。以 // 开头的行是暂缓目标，不照进用例。
// M1 namespace 基形
namespace N {}
namespace N { let x = 1; }
namespace N { const x = 1; }
namespace N { let x = 1;\nlet y = 2; }
namespace N { ; }
namespace N { { let x = 1; } }
namespace N { if (a) b; }
namespace N { let x = 1; let y = 2; }
// M2 module 关键字（同形，关键字不同）
module N {}
module N { let x = 1; }
// M3 declare module（字符串模块名 + declare 修饰）
declare module "m" {}
declare module "m" { let x = 1; }
// M4 export 修饰
export namespace N {}
export namespace N { const x = 1; }
// M5 trivia
namespace /* c */ N {}
namespace N { // c\nlet x = 1; }
namespace N {\n  let x = 1;\n}
// M6 限定名（嵌套 ModuleDeclaration）
namespace A.B {}
namespace A.B.C {}
namespace A.B { let x = 1; }
declare namespace N {}
// M7 暂缓：module-block-possible-shape（挂载型）、组合修饰（export declare module）
// M8 module augmentation：typed 变量 / export 修饰 / 普通 const
declare module "m" { let x: number; }
declare module "m" { export let x: number; }
declare module "m" { const x = 1; }
declare module "m" { let x: number; let y: string; }
declare module "m" { let x: number;\nlet y: string; }
// M9 global augmentation（TS 节点仍是 ModuleDeclaration，名字是 global）
declare global { let x: number; }
declare global { const y = 2; }
// M10 模块体里的接口声明（空体）
declare module "m" { interface I {} }
namespace N { interface I {} }
// M11 augmentation 的 trivia
declare module "m" { // c\nlet x: number; }
// M12 暂缓：`export as namespace X;`（cover-module-1 所有者）
// M13 带体声明进 namespace（class / interface / function / enum，chunk 3）
namespace N { class C {} }
namespace N { function f() {} }
namespace N { enum E { A } }
namespace N { function f(a: A): B { return a; } }
namespace N { class C {}\nfunction f() {} }
namespace N { const x = 1;\nclass C {} }
// M14 export 修饰的带体成员
namespace N { export class C {} }
namespace N { export function f() {} }
namespace N { export enum E { A } }
namespace N { export interface I {} }
// M15 declare module 里的带体声明（ambient 模块内 class/enum 合法）
declare module "m" { class C {} }
declare module "m" { enum E { A } }
declare module "m" { interface I {}\nclass C {} }
// M16 无体函数声明进 ambient module / namespace（chunk 4）
declare module "m" { function f(): void; }
declare module "m" { function f(a: A): B; }
declare namespace N { function f(): void; }
declare namespace N { function f(a: A): B; }
// 两条无体函数同体 / 与变量、接口成员混合
declare module "m" { function f(): void; function g(): void; }
declare module "m" { let x: number; function f(): void; }
declare module "m" { function f(): void; interface I {} }
declare module "m" { interface I {} function f(): void; }
declare module "m" { function f(): void; let x: number; }
// export 修饰的无体函数（BuildMember 提出 export 后按无体函数建，再插回 Data 最前）
declare module "m" { export function f(): void; }
declare namespace N { export function f(): void; }
// trivia
declare module "m" { function f(): void /* c */ ; }
declare module "m" {function f():void;}
// 有体函数回归（chunk 3 已收；ambient 里带体在 TS 是语法层允许、语义报错，这里只比 AST）
// M17 暂缓（原因见 docs/coverage-module-blocks.md §7）
// declare module "m" { function f(); }                ← TS 合法（ambient 上下文隐含 declare），但 FunctionDeclarationShape
//                                                       要求「无体且无 declare 时必须有返回类型」，需声明形状侧改
// namespace N { function* f() {} }                    ← FunctionDeclarationShape / BuildMember 都不认 `*`（generator star）
// declare module "m" { function* f(): void; }         ← 同上
// declare module "m" { async function f(): void; }    ← async 修饰：BuildMember 只认 export，async 也不在声明形状里
// export as namespace X;                              ← cover-module-1 所有者

// ===== module body: nested function / async / generator / using（cover-module-body-1） =====
namespace N { async function f() {} }
namespace N { function* g() { yield 1; } }
namespace N { async function* h() {} }
namespace N { using x = a; }
namespace N { await using x = a; }
namespace N { export async function f() {} }
namespace N { export function* g() { yield 1; } }
namespace N { export async function* h() {} }
namespace N { export using x = a; }
declare namespace N { async function f(): void; }
declare module "m" { function* g(): void; }
declare module "m" { async function f(): void; }
namespace N { async function f() { await g(); } }
namespace N { function* g() { yield 1; yield 2; } }
namespace N { export async function* h() { yield 1; } }
namespace N { function /* c */ * g() {} }
namespace N { export  async  function  f  ( )  { } }
namespace N { using  x  =  a ; }
namespace N { /* c */ async function f() {} }
namespace N { class C {} async function f() {} }

// ===== module globals: dotted / nested namespace / declare global / export as namespace / import-equals（cover-module-globals-1） =====
module A.B {}
namespace A { namespace B {} }
namespace A { namespace B { interface I {} } }
namespace A.B { function f() {} }
declare namespace Global { namespace Inner { class C {} } }
declare global {}
declare global { interface Window {} }
declare module "m" { export as namespace X; }
declare module "m" { import x = require("n"); }
declare module "m" { export import x = require("n"); }
module M { export namespace N {} }
// trivia
namespace A . B { }
namespace A { /* c */ namespace B {} }
declare global { /* c */ interface Window {} }
declare module "m" { /* c */ export as namespace X; }
declare module "m" { import /* c */ x = require("n"); }
declare module "m" { import x = require("n") /* c */ ; }

// ===== module-body import declarations（chunk module-imports） =====
declare module "m" { import x from "n"; }
declare module "m" { import { a, b } from "n"; }
declare module "m" { import * as ns from "n"; }
declare module "m" { import "n"; }
namespace N { import x from "n"; }
declare module "m" { import type { T } from "n"; }
// + 行尾注释 / 换行 / 词间块注释
declare module "m" { import x from "n"; } // c
declare module "m" {\n  import { a } from "n";\n}
declare module "m" { /* c */ import x from "n"; }
declare module "m" { import /* c */ { a } from "n"; }
// + 回归（既有绿）：module 体内 import-equals
// ===== module-body imports with attributes（chunk module-imports-2） =====
declare module "m" { import x from "n" with { type: "json" }; }
declare module "m" { import { a } from "n" with { type: "json" }; }
declare module "m" { import "n" with { type: "json" }; }
declare module "m" { import x from "n" assert { type: "json" }; }
declare module "m" { import type { T } from "n" with { type: "json" }; }
declare module "m" { import { a } from "n" with { type: "json", other: "x" }; }
// + 行尾注释 / 换行 / 词间块注释
declare module "m" { import x from "n" with { type: "json" }; } // c
declare module "m" {\n  import { a } from "n"\n    with { type: "json" };\n}
declare module "m" { import /* c */ { a } from "n" with { type: "json" }; }
namespace N { export import A = B.C; }

// ===== module-body const enum（chunk module-const-enum-1）=====
namespace N { const enum E { A } }
namespace N { const enum E { A = 1, B = 2 } }
namespace N { const enum E { A = 1, B = A + 1 } }
declare namespace N { const enum E { A } }
declare module "m" { const enum E { A } }
namespace N { export const enum E { A } }
namespace N { export const enum E { A = 1 } }
namespace N { declare const enum E { A } }
// + trivia
namespace N { /* c */ const enum E { A } }
namespace N { const /* c */ enum E { A } }
namespace N { const enum /* c */ E { A } }
namespace N { const enum E { /* c */ A } }
namespace N { const enum E { A /* c */ } }
declare module "m" { /* c */ const enum E { A } }
declare module "m" {\n  const enum E { A }\n}
// + 多条成员连排 / 混合
namespace N { const enum E { A } enum F { B } }
namespace N { const enum E { A } const enum G { B } }
namespace N { const enum E { A } const x = 1; }
declare module "m" { const enum E { A } enum F { B } }
// + 回归（既有绿）：普通 enum / 普通 module
module M { enum E { A } }
namespace N { enum E { A = 1 } }

// ===== base 13：模块体内 export 成员（ExportAssignment / 修饰词 / 各声明族）=====
// export default 值形态：TS = ExportAssignment（children 只有表达式）
declare module "m" { export default x; }
declare module "m" { export default f(); }
declare module "m" { export default x + y; }
// export = 值形态
declare module "m" { export = x; }
declare module "m" { export = a.b; }
declare module "m" { export = f(); }
// export default + 声明形态：TS children = [ExportKeyword, DefaultKeyword, …声明]
declare module "m" { export default class C {} }
declare module "m" { export default function f() {} }
declare module "m" { export default interface I {} }
// 暂缓（TS 口径怪异）：`export default enum E { A }` —— TS 把 `enum` 恢复成 ExportAssignment 的标识符表达式，
// 语序本身不是合法声明形态，不列用例。
// declare module "m" { export default enum E { A } }
// export + 各声明族
declare module "m" { export const x = 1; }
declare module "m" { export let y: string; }
declare module "m" { export class C {} }
declare module "m" { export interface I {} }
declare module "m" { export enum E { A } }
// export import / import-equals
declare module "m" { export import A = B.C; }
// 回归：namespace 体内 export 变量语句
namespace N { export const x = 1; }
// trivia 变体
declare module "m" { export default /* c */ x; }
declare module "m" { export = /* c */ x; }
declare module "m" { export /* c */ default class C {} }
// 暂缓（红，归属 export-declaration 族）：模块体内的 `export * from "n";` ——
// module-block 走 StatementBuilder，ExportDeclaration 只有 possible-shape（无 FromUnits），
// 需要 export-declaration 家族暴露可复用建树入口；`export { a };` 的 AST 待该入口一并核对。
// declare module "m" { export * from "n"; }

// ===== base 14：模块体 / namespace 体内的声明（无体声明 + 类型别名；measurement-first） =====
// 模块体内的 class / interface / enum / function / 变量声明
declare module "m" { class C {} }
declare module "m" { interface I { a: A } }
declare module "m" { enum E { A } }
declare module "m" { function f(): void; }
declare module "m" { function f(a: A): B; }
declare module "m" { let x: number; }
declare module "m" { const x: 1; }
declare module "m" { var x: number; }
// 模块体内的类型别名（新支持：ModuleBlockShape.BuildMember 消费 TypeAliasDeclarationShape.FromUnits）
declare module "m" { type T = A; }
declare module "m" { type T<U> = U; }
declare module "m" { export type T = A; }
declare module "m" { class C {} type T = A; }
// namespace 体对照（回归）
namespace N { class C {} }
namespace N { interface I {} }
namespace N { enum E { A } }
// 混合体 / trivia
declare module "m" { class C {} interface I {} }
declare module "m" { /* c */ class C {} }
declare module "m" { class C {} // c\n }
declare module "m" { type /* c */ T = A; }
declare module "m" { class /* c */ C {} }
// ===== module-body export declarations（chunk export-build） =====
declare module "m" { export * from "n"; }
declare module "m" { export { a }; }
declare module "m" { export { a as b }; }
declare module "m" { export * as ns from "n"; }
declare module "m" { export { a } from "n"; }
declare module "m" { export {}; }
declare module "m" { export { a, b as c } from "n"; }
declare module "m" { export type { T } from "n"; }
namespace N { export * from "n"; }
namespace N { export { a }; }
namespace N { export * as ns from "n"; }
declare module "m" { export /* c */ * from "n"; }
declare module "m" { export { a } /* c */; }
declare module "m" { export\n{ a }; }
declare module "m" { export * from "n"; } // c

// ===== base 15：模块体 declare function（[export] [declare] function 分派） =====
declare module "m" { declare function f(): void; }
declare module "m" { declare function f<T>(a: T): T; }
declare module "m" { declare function f(); }
namespace N { declare function f(): void; }
declare module "m" { export declare function f(): void; }
declare module "m" { declare /* c */ function f(): void; }
declare module "m" { export /* c */ declare function f(): void; }
declare module "m" { declare function f(): void; class C {} interface I {} type T = A; }
declare module "m" { declare function f(): void; function g(): void; }
// 回归：无体 function / 有体 function / export function
declare module "m" { function f(): void; }
declare module "m" { function f() {} }
declare module "m" { export function f(): void; }

// ===== base 16：namespace 体内无 declare、无 body 的函数声明（gap closure） =====
// TS：namespace/模块 体内的无体函数声明合法，AST 是 FunctionDeclaration（无 declare 修饰、children 不含 DeclareKeyword）
namespace N { function f(); }
namespace N { function f(): void; }
namespace N { function f(a: A): B; }
namespace N { function f(); function f() {} }
namespace N { function f(): void; function f() {} }
namespace N { function f(); function g(); }
namespace N { function f(); class C {} }
namespace N { function f(); type T = A; }
module M { function f(); }
// trivia
namespace N { /* c */ function f(); }
namespace N { function /* c */ f(); }
// 回归：declare module 体内 / namespace 内显式 declare
declare module "m" { function f(); }
namespace N { declare function f(); }

