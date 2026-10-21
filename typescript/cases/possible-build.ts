// §6「possible build 不对」：build 时拿到的单元集被切碎、或提取口径不对（泛型 `,` 顶层切分、
// 数组空槽、`!` 断言、`new` 后缀链 / 标签模板归属、具名导入字符串名、catch 绑定类型）。
// 覆盖组：D1 数组空槽、D2 解构计算键、D6 `new` 后缀链、D7 类型实参 + 标签模板、D9 泛型 `,` 深度、
// D13 具名导入字符串名、G2 `>>` 收口、G3 async 函数/箭头、G7 无体成员与裸 await、
// G11 function* / function<T>。
// 来源：token-repros/possible-build-*.ts（8 个文件，均已并入）；一行一个用例，
// 行内 `\n` 由 ast-json.mjs 还原。§5 口径：base 在前，trivia / 重复形变体在后。

// ── D1：数组空槽 OmittedExpression ──
const arr1 = [1, , 3, ...xs]
const arr2 = [, 1]
const arr3 = [1, ,]

// ── D2：解构里的计算键（不按数组解构切） ──
const { [k]: v } = o
const { [k2]: { a } } = o

// ── G9/G13：`!` 明确赋值断言（声明与无分号收口） ──
let x1!: number;
let x2!: string

// ── D13：具名导入的字符串名 ──
import { "a-b" as c } from "m"

// ── D6：`new` 的被构造者后缀链（`!` / `.` / 标签模板） ──
const n1 = new a!.b()
const n2 = new a!()
const n5 = new a!.b!.c()
const g1 = new A.B`abc`.c

// ── D7：类型实参 + 标签模板 / typeof / 实例化后缀 ──
const t1 = f<T>`t`
const t2 = typeof f<T>
const t3 = typeof f<T>`t`()

// ── D9：catch 绑定带类型（类型段进 VariableDeclaration）与泛型 `,` 深度 ──
try { } catch (e: unknown) { }
try {} catch (e: unknown/*c*/) {}
let x3: Record<string, number> = y;
const r2 = { a: 1 } as Record<string, number>;
const x4 = new Map<string, number>();
const y2 = f<A, B>(1);
const z2 = a as Foo<A, B>;

// ── G2/G3/G7/G11：泛型 `>>` 收口、async 函数/箭头、无体成员、裸 await、function* ──
const s1 = <string>x;
const s2 = <Array<number>>y;
const af1 = async function () {};
const af2 = async (): Promise<void> => {};
const af3 = async (x) => x;
const af4 = async<T>(x) => x;
const af5 = async <T>(x: T) => x;
const af6 = async/*c*/(): Promise<void> => {};
const gf1 = function* () { yield 1 };
const gf2 = (function <T>(x: T) { return x; })(1);
const m1 = { new (a: number): I };
const w1 = await;
const a1 = f<number> ?? 1;
const a2 = f<number> || 1;
const a3 = f<number> && 1;
a<b> as T;
[a<b> as T];
f(a<b> as T);
a<b> instanceof C;
new Map<string, Array<number>>();
new Map<Array<Array<string>>>();
new Map<string, Array<number>>(1);
f<Map<string, Array<number>>>(1);
class S1 { m = new Map<string, Array<number>>() }
a < b && c > (d);
