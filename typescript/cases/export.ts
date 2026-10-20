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

// ===== base 10：export declare 变量语句 / type 别名 + 字符串导出名（chunk4） =====
export declare const x: number;
export declare let y: string;
export declare var z = 1;
export declare type T = A;
export { a as "b-c" } from "m";
export { "a-b" } from "m";
// + 前导空格
  export declare const x: number;
// + 词间块注释
export /* c */ declare const x: number;
export declare /* c */ const x: number;
// + 行尾注释
export declare const x: number; // c
export { a as "b-c" } from "m"; // c
// + 换行
export\ndeclare const x: number;
// + 重复形
export declare const x: number; export declare type T = A;
export { a as "b-c" } from "m"; export { "a-b" } from "n";

// ===== base 11：export declare class/interface/enum + default function + declare function（chunk3） =====
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
// export default class D extends B {};  —— heritage（extends）未合并：类声明形状报「类表达式缺少类体」
// export default function* f() {};     —— generator `*` 未处理
// export declare\ntype T = A;          —— declare 与 type 之间换行时 TS 侧 TypeAliasDeclaration 的 pos 是 14 而不是 0
// export declare const x;              —— declare 变量必须有类型或初始化式（TS 语义）
// ===== base 12：export forms sweep（measurement-only，不改 token 源） =====
export { };
export { a, b, c };
export { a as b, c as d };
export { a as b } from "m";
export type { T } from "m";
// export { type T } from "m";        —— inline type specifier：TS 置 ExportSpecifier.isTypeOnly=true 且 name=T；本仓把 `type` 当 Identifier（pos 8..13 vs ts 13..15），未支持
export * as ns from "m" with { type: "json" };
export * as ns from "m" with { type: "json", other: "x" };
export { a as default };
export { default as a };
export {};
export { a }; export { b }; /* c */\n export * from "m"; // d
export {\n};\n
export\n{\n  a,\n  b,\n};
// + 前导空格
  export { };
  export { a, b, c };
// + 行内注释
export { /* c */ a, b };
export { a as b, /* c */ c as d };
// + 行尾注释
export { a, b, c }; // c
export * as ns from "m"; // c
// + 换行
export\n{\n  a,\n  b,\n  c,\n};
export *\nas\nns\nfrom "m";

// ===== sweep 暂缓（measurement-only，未改 token 源） =====
// export { type T } from "m";  —— inline type-only specifier（见上方注释；不支持）

// ===== base 13：export default/abstract/extends/implements/const enum（chunk5） =====
export default class D extends B {}
export default class D implements I {}
export default class D extends B implements I {}
export abstract class C {}
export default abstract class C {}
export abstract class C extends D {}
export declare abstract class C {}
export class C extends D implements I {}
export interface I extends J {}
export default class C { m() {} }
export const enum E { A }
export declare const enum E { A }
// + 前导空格
  export default class D extends B {}
  export abstract class C {}
// + 行尾注释
export default class D extends B {} // c
export const enum E { A } // c
// + 词间块注释
export /* c */ default class D extends B {}
export /* c */ abstract class C {}
export declare /* c */ abstract class C {}
// + 换行
export\ndefault class D extends B {}
// export abstract\nclass C {}          —— abstract 与 class 之间换行时 TS 的 ClassDeclaration pos=15（非 0），ruler 口径问题，暂缓
// export default abstract\nclass C {}  —— 同上（pos=23），暂缓
// + 重复形
export class C extends D implements I {} export interface I extends J {}
export const enum E { A } export declare const enum F { B }
