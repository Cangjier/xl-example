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
namespace N { function f() {} }
// M17 暂缓（原因见 docs/coverage-module-blocks.md §7）
// declare module "m" { function f(); }                ← TS 合法（ambient 上下文隐含 declare），但 FunctionDeclarationShape
//                                                       要求「无体且无 declare 时必须有返回类型」，需声明形状侧改
// namespace N { function* f() {} }                    ← FunctionDeclarationShape / BuildMember 都不认 `*`（generator star）
// declare module "m" { function* f(): void; }         ← 同上
// declare module "m" { async function f(): void; }    ← async 修饰：BuildMember 只认 export，async 也不在声明形状里
// export as namespace X;                              ← cover-module-1 所有者

// ===== module body: nested function / async / generator / using（cover-module-body-1） =====
namespace N { function f() {} }
namespace N { async function f() {} }
namespace N { function* g() { yield 1; } }
namespace N { async function* h() {} }
namespace N { using x = a; }
namespace N { await using x = a; }
namespace N { export function f() {} }
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
namespace A.B.C {}
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
