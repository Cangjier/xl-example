// xl:note 类型段**尾巴上那条行注释**（第 934 轮第四批普查量出的一族）：`string//c` 换行 `, b`
// ——行注释把它后面那个换行一起吃进来（TS 的 trailing trivia），而 TS 的节点区间**从不含**
// 尾部 trivia。两处签出按同一个口径改（`TypeDefine` 的尾部跳过 `IsTriviaUnit`、
// `Parameter` 的右端取最后一个实义单元），第 920 轮在 `SignatureTailEnd` 上收过同一格。
// 守卫按**宿主**铺开：元组（具名 / 普通 / 末位 / 具名元素的名字与冒号之间 / 变长）、
// 类型字面量与接口成员、变量声明、形参、类型实参、联合（中间 / 尾部）、数组后缀、
// 返回类型、函数类型（形参 / 返回）、条件类型、`infer`、`import("m").A`、`keyof`、
// 泛型形参表、枚举成员、类字段、继承子句、映射类型的键、模板字面量类型。
// xl:round 934
// xl:end
type T1 = [a: string//c
, b?: number];
type T2 = [string//c
, number];
type T3 = [a: string//c
];
type T4 = [a//c
: string];
type T5 = [...A//c
, B];
type T6 = { a: string//c
, b: number };
type T7 = { a: string//c
; b: number };
interface I1 { a: string//c
; b: number }
interface I2 { a: string//c
, b: number }
let v1: string//c
, v2: number;
function f1(a: string//c
, b: number) {}
type T8 = F<A//c
, B>;
type T9 = A//c
 | B;
type T10 = A | B//c
;
type T11 = A//c
[];
function f2(): string//c
 { return ""; }
type T12 = (a: string//c
) => void;
type T13 = () => string//c
;
type T14 = A extends B//c
 ? C : D;
type T15 = A extends infer U//c
 ? U : never;
type T16 = import("m")//c
.A;
type T17 = keyof A//c
;
function f3<A//c
, B>(x: A) {}
enum E1 { A = 1//c
, B = 2 }
class C1 { a: string//c
; b: number }
class C2 extends A//c
 implements B {}
type T18 = { [K in A//c
]: B };
type T19 = `a${A//c
}b`;
