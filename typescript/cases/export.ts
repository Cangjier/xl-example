// export 声明场景：每条以 base 起，再叠加对抗信息（空白 / 注释 / 换行 / 修饰语 / 重复形）。
// 一行一个用例；行内 `\n` 由 ast-json.mjs 还原成真实换行（这样多行语句也能逐行对齐）。
//
// ===== base 1：具名导出（不带模块路径） =====
export { a };
export { a, b };
export { a as b };
export { a, b as c };
export {};
// + 前导空格
  export { a };
// + 前导块注释
/* c */ export { a };
// + 词间块注释
export /* c */ { a };
// + 花括号内注释
export { /* c */ a };
// + 词间多空格
export    {   a   };
// + export 与子句之间有换行
export\n{ a };
// + 行注释夹在中间
export // c\n{ a };
// + 行尾注释
export { a }; // c

// ===== base 2：具名导出 + from =====
export { a } from "m";
export { a as b } from "m";
export {} from "m";
export { a, b, c } from "m";
export { a, b, c, d, e } from "m";
export { a as b, c, d as e } from "m";
export { a, b, } from "m";
export {\n  a,\n  b,\n} from "m";
// + 前导空格
  export { a } from "m";
// + 前导块注释
/* c */ export { a } from "m";
// + 词间块注释
export /* c */ { a } from "m";
// + 子句与 from 之间块注释
export { a } /* c */ from "m";
// + 子句与 from 之间有换行
export { a }\nfrom "m";
// + 词间多空格
export    {   a   }    from    "m";
// + 行尾注释
export { a } from "m"; // c
// + 重复形 × 行注释
export {\n  a, // c\n  b,\n} from "m";

// ===== base 3：星号导出 =====
export * from "m";
export * as ns from "m";
export  *  from  "m";
// + 词间块注释
export * /* c */ from "m";
// + as 与名字之间块注释
export * as /* c */ ns from "m";
// + 星号与 from 之间有换行
export *\nfrom "m";
// + 命名空间名与 from 之间有换行
export * as ns\nfrom "m";
// + 行尾注释
export * from "m"; // c

// ===== base 4：type-only =====
export type { T };
export type { T } from "m";
export type { T as U } from "m";
export type { T, U } from "m";
export type { T, U as V } from "m";
export type {\n  T,\n  U,\n} from "m";
export type * from "m";
export type * as ns from "m";
// + 词间多空格
export  type  {  T  }  from  "m";
// + 词间块注释
export /* c */ type { T } from "m";
// + type 与括号之间有换行
export type\n{ T } from "m";

// ===== base 5：属性段（with / assert） =====
export { a } from "m" with { type: "json" };
export * from "m" with { type: "json" };
export { a } from "m" assert { type: "json" };
export { a } from "m" with { type: "json", other: "x" };
export { a } from "m" assert { type: "json", other: "x" };
export { a }\nfrom "m" with { type: "json" };
// + 行尾注释
export { a } from "m" with { type: "json" }; // c

// ===== base 6：关键字当导出名 =====
export { default as x } from "m";
export { default, a } from "m";
export { a as default };

// ===== base 7：重复语句（同一文件多条 export） =====
export { a }; export { b };
export { a } from "m"; export { b } from "n";
export { a } from "m"; export * from "n"; // c
export type { T } from "m"; export { a } from "n";

// ===== base 8：export + 声明前缀（class/interface/enum/const/var） =====
export const x = 1;
export let y = 2;
export var z = 3;
export class C {}
export interface I {}
export enum E { A }
// + 前导空格
  export const x = 1;
// + 词间块注释
export /* c */ const x = 1;
// + 名字前块注释
export const /* c */ x = 1;
// + export 与声明之间有换行
export\nconst x = 1;
// + 行尾注释
export const x = 1; // c
export class C {} // c
export\nclass C {}
export interface I {} // c
export enum E { A } // c
// + 重复形
export const x = 1; export class C {}
export interface I {} export enum E { A }

// ===== base 9：export default =====
export default 1;
export default a;
export default (a + b);
export default class D {}
// + 前导空格
  export default 1;
// + 行尾注释
export default 1; // c
// + default 与表达式之间有换行
export default\n1;
export default class D {} // c
// + 词间块注释
export /* c */ default 1;

// ===== base 10：export declare / default function / 引号导出名 =====
export declare class C {}
export declare interface I {}
export declare enum E { A }
export default function f() {}
export default function () {}
export declare function f(): void;
export { "a-b" as c } from "m";
// + 前导空格
  export declare class C {}
// + 词间块注释
export /* c */ declare class C {}
export declare /* c */ interface I {}
// + 行尾注释
export declare class C {} // c
export default function f() {} // c
export { "a-b" as c } from "m"; // c
// + 换行
export\ndeclare class C {}
export default\nfunction f() {}
// + 重复形
export declare class C {} export declare interface I {}
export { "a-b" as c } from "m"; export { "x-y" as z } from "n";

// ===== 暂缓（不在本用例集） =====
// export default function* f() {};      —— generator 的 `*` 未处理
// export { a as "b-c" } from "m";       —— 名字是字符串；TS 侧 `name` = 字符串文本，cjAst 只认
//                                          IdentifierShape.EscapedText，harness 缺该语义（报告，不硬改）
// export { "a-b" } from "m";            —— 同上（无 as 时 name 也是字符串文本）
// export declare const x: number;       —— declare 变量语句，statements 侧 declare 修饰词未打通
// export as namespace NS;               —— cover-module-1 已合并
// export = a;                           —— cover-module-1 已合并
// export * as ns from "m" with {…};     —— 属性段已由既有 62 条覆盖
