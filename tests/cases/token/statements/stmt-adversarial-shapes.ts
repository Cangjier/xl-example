// xl:note 语句层/类/表达式的对抗形状集（第 66 轮第十二批）
// xl:expect Class:4,MethodDeclaration:6,IndexSignature,StaticBlock,Label,DoWhile,Namespace:2,NotNull,New,For,Satisfies,As
class A1 { static readonly p = 1; get x(): A { return 1 } set x(v: A) {} }
abstract class A2 { abstract m(): void; protected abstract readonly n: A }
class A3 { constructor(private readonly a: A, public b = 1) {} }
class A4 { [Symbol.iterator]() {} static { this.x = 1 } }
function f1(a: A): asserts a is B {}
function f2(this: void, ...args: any[]): void {}
const g1 = <T,>(x: T) => x;
const g2: <T>(x: T) => T = (x) => x;
label1: for (const a of b) { if (a) continue label1; else break label1 }
do { x++ } while (x < 3);
try { a() } catch { b() } finally { c() }
switch (x) { case 1: case 2: y(); break; default: z() }
namespace N1 { export const v = 1; export namespace N2 { export type T = 1 } }
let v2 = a as const satisfies B;
const { ...rest3 } = o;
for (let i = 0, j = 1; i < j; i++, j--) {}
const t1 = x!;
const t2 = a?.b?.[c]?.(d);
new (getCtor())(1);
interface A5 { readonly a?: A; b(): void }
type A6 = { readonly [k: string]: A };
