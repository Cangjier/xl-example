// 真实 `.d.ts` 暴露的类型/成员形态：TS 合法、但之前的语料没有覆盖（docs/real-dts-ast-analysis.md R1–R14）。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 每个形态先 base，再叠加 trivia / 重复形。

// ===== 前导联合 / 交叉类型（R1）=====
type T = | A | B;
type T = & A & B;
type T = | A;
type T = & A;
type T = | /* c */ A | B;
type T = | A\n  | B\n  | C;
type T = | { a: A } | B[];

// ===== 可选属性的括号 / 函数类型歧义（R12）=====
interface I { a?: (A | B) }
interface I { a?: (A)[] }
interface I { a?: () => void }
interface I { a?: (a: A) => B }
interface I { a?: readonly A[] }
interface I { m?(): void }
interface I { m?(a: A): B }
interface I { a?: A | B }

// ===== 字符串 / 数字成员名（R3 / 数字名）=====
interface I { "abort": Event; }
interface I { "m"(): void; }
interface I { 0: string; 1: number }
interface I { readonly "abort": Event }
type T = { "a": A; 0: B };
declare class A { "foo"(): void; 0 = 1 }

// ===== 计算属性名（R3）：属性访问 / 字符串 / 数字 =====
interface I { [Symbol.iterator](): void; }
interface I { [Symbol.toStringTag]: string; }
interface I { ["a"]: A }
interface I { [0]: A }
interface I { readonly [Symbol.toStringTag]: string; }
declare class A { [Symbol.iterator](): void; }
declare class A { [Symbol.iterator]: () => void }
declare class A { [Symbol.iterator]?<K>(a: A): void; }

// ===== 泛型调用签名（R4 / 计算名泛型方法）=====
interface I { <T>(value?: T): boolean; }
interface I { <T extends A>(x: T, y?: B): C; }
type T = { <T>(x: T): T };
interface I { [sym]?<K>(a: A): void; }

// ===== 类成员名字 / 参数（R5 / R6）=====
declare class A { m<T>(x: T): T; }
declare class A { m<T>(x: T): T }
declare class A { m(...args: any[]): void; }
declare class A { m(a: A, ...rest: B[]): void }
declare class A { get(a: A): B }
declare class A { get: (x: A) => B }
declare class A { readonly get: (x: A) => B }
declare class A { get x(): B }
declare class A { set x(v: B) }
declare class A { get #x() { return 1; } }

// ===== 函数 / 方法的返回类型是对象（R7）=====
declare function f(): { b: B };
declare function f(a: A): { b: B };
declare function f(): Promise<{ b: B }>;
declare class A { m(): { b: B }; }
declare class A { m(): { b: B } }
declare class A { m(): A | {}; }
declare class A { m(): { b: B } | A; }
declare function f(): (a: A) => { b: B };

// ===== 负数字面量类型 / typeof 带类型实参 / intrinsic =====
interface I { readonly TIMEOUT: -1; }
type T = -1;
type T = { a: A }[-1];
type T = typeof x.y<Z>;
type T = typeof ServerResponse<InstanceType<Request>>;
type T = intrinsic;
type T = Array<{ b: B }>;

// ===== 继承列表的逗号（ExpressionWithTypeArguments）=====
interface I extends A.B, C {}
interface I extends A.B<X>, C.D<Y> {}
class C extends A.B, D {}
class C extends mixin<A, B>() {}
declare class A extends stream.Transform, Zlib {}

// ===== 无分号的 ambient 形态（R2 / R9 / R10 / R14）=====
declare class A { x: number\n y: string }
declare class A { m(): void\n n(): void }
declare class A { constructor (a?: A)\n m(): void }
declare class A { readonly x: number\n get y(): string\n }
declare namespace N { function f(): B }
declare namespace N { function f(): B\nfunction g(): C }
declare namespace N { export function f(): B\nexport function g(): C }
declare namespace N { const f: typeof import('./x').default\n const g: A }
declare namespace N { declare interface I {} }
declare namespace N { declare class C {} }
declare namespace N { declare enum E { A } }
declare namespace N { declare namespace M {} }
declare namespace N { export type T = A | B }
declare namespace N { abstract class C {} }
declare global { interface Window { a: A } }
declare module "m" { global { interface I { a: A } } }
declare module "m" { global { interface I { a: A } }\n declare class C {} }

// ===== import / export 收口（R9 / R11 / R13）=====
import x from "m"\ntype T = A;
import x from "m"\ninterface I {}
import MockDispatch = MockInterceptor.MockDispatch\nimport { MockCallHistory } from './mock-call-history'
export declare function f(a: A): B
export function f(a: A): B
export declare const X: A
export declare const X: { a: A }
export declare type T = A
export declare class C {}
export declare interface I {}
export declare namespace N {}
export class C { x = 1 }
export interface I { a: A }
export namespace N { export const x = 1 }
export { a, b }
export * from "m"

// ===== 对照：这些形态带分号 / 正常路径 =====
declare class A { x: number; y: string; }
declare class A { m(): void; n(): void; }
declare function f(): B;
export declare function f(a: A): B;
export declare const X: A;
export interface I { a: A }
import x from "m";\ntype T = A;
