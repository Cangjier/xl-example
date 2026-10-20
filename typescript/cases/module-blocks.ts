// module / namespace 块 chunk 3：模块体里带体声明（class/interface/enum/function）+ export 修饰。
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
// M12 暂缓：`declare module "m" { function f(): void; }`（无体函数要声明 end 候选）、`export as namespace X;`（cover-module-1 所有者）
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
// M16 暂缓：`declare module "m" { function f(): void; }`（ambient 无体函数）、`namespace N { function f(): void; }`、`export as namespace X;`
