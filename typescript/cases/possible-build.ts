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

// ── 补强（审计 §3.1/§4.2/§6.5）：每行钉住一个历史 possible build 场景 ──

// D1：数组空槽 —— 多空槽 / 空槽带 trivia / 展开后的空槽（OmittedExpression 计数）
const arr4 = [,,]
const arr5 = [1, /*c*/ , 3]
const arr6 = [...xs, , 1]

// D2：计算键 —— 字符串字面量键、类成员计算名、计算键 + 数组模式（不得按数组解构切）
const { ["k"]: v2 } = o
const { [k3]: [pa, pb] } = o
class C1 { [k]: number }
class C2 { [k]() {} }

// D6：`new` 被构造者后缀链 —— 元素访问 / 括号 / 调用后再取属性 / 标签模板后调用
const n6 = new a[b]()
const n7 = new (a!.b)()
const n8 = new a!().b
const n9 = new A.B`abc`()

// D7：类型实参 + 标签模板 / 实例化表达式取属性 / `new` 开头的实例化标签模板
const t4 = f<T>.x
const t5 = f<A, B>.x
const t6 = new f<T>`t`

// D9：catch 绑定带类型（注释变体）与泛型 `,` 深度（嵌套 / 三实参 / 收口位置）
try { } catch (e: any) { }
try { } catch (/*c*/ e2: unknown) { }
let x6: Record<string, Array<number>> = y;
const x7 = new Map<string, Map<string, number>>();
const x8 = f<A, B, C>(1);
const q2: Promise<Array<number>> = p;
// 缺口（未提交红用例）：`as` 右端的类型收口仍缺一格 —— `a as Foo<A, B>[]`（后缀数组）与
// `a as Array<Array<number>>`（嵌套 `>>`）实测均报「表达式语句没有读完」（带 / 不带结尾分号都一样），
// 故不列为用例；疑点在 `as` 类型段 end 收口，不在 basic token。

// D13：具名导入的字符串名（多条并排，别名必须保留）
import { "a-b" as c1, "c-d" as c2 } from "m"

// G2：`>` 收口 —— 尖括号断言、调用类型实参、`new` 类型实参三种收口
const s3 = <Array<number>>y;
const a5 = a<Array<number>>(1);
const a6 = new Set<Array<string>>();

// G3：async —— 声明（含裸 await 上下文）/ async 生成器 / 泛型箭头尾逗号 / 箭头体
async function af7() { await x; }
const af8 = async function* () { yield 1 };
const af9 = async <T,>(x: T) => x;
const af10 = async () => { await x; };

// G7：无体成员 / 裸 await（表达式语句与实参位）
const m2 = { m(a: number): void };
await;
const w3 = f(await);

// G11：function* —— 声明 / 泛型 / 立即调用
function* gf3() { yield 1; }
const gf4 = function* <T>(x: T) { yield x; };
(function* () {})();

// 守卫：比较链不得被误判成泛型实参
a < b && c > d;
if (a < b && c > d) {}
a<b>>c;

// ── 修复回归：`as` 右端类型收口（嵌套泛型 `>>` 与数组后缀 `[]`）──
// 根因：AngleJudge.FollowerAllows 不认 `[` follower（声明层顶层 `,` 误把 `<A, B>` 切断）+
// ParseFollowingType 用展开后的 `builder.At` 推进本层 `At`（`>>` 拆格后越界）。
const z3 = a as Foo<A, B>[];
const q1 = a as Array<Array<number>>;

// ── 修复回归：可选形参没有类型标注（`?` 后面不是 `:`）──
// 根因：FunctionDeclarationShape.BuildParameters / ClassDeclarationShape.BuildMembers 的 typed 判定
// 写成「`?` 且再下一格是 `:`」，于是 `f(a?)` 落进「裸标识符」分支，`?` 无人认领；下一次循环把 `?`
// 当参数名 → 「函数参数不是标识符」/「类成员参数不是标识符」。TS 侧 `f(a?)` 的 Parameter 是
// name + QuestionToken（Type 缺失），parseDiagnostics=0。
// 正确的 build：`?` 一律走 TypeBuilder.ParseParameter（该函数已支持 name + QuestionToken、无 Type）；
// close：ParameterShape 在名字/`?`/类型之后 TryToClose，区间到 `?` 为止、Pos 含前导 trivia。
function fopt1(a?) {}
function fopt2(a, b?) {}
function fopt3(a?): void {}
class Copt1 { m(a?) {} }
class Copt2 { constructor(a?) {} }
class Copt3 { set x(v?) {} }

// ── cover3：方法/构造器/对象字面量方法的默认值形参（A）──
// 根因：ClassDeclarationShape.BuildParameters 的分派只认 `:` / `?` / 解构模式，`a = 1` 走裸标识符
// 分支，`=` 留给下一轮 → 「类成员参数不是标识符」。正确 build：名字后跟 `=` 也进 ParseParameter，
// 再由 TakeParameterInitializer 收 `= Expr`（默认值是 Parameter 的 Initializer 子节点）。
class Cdef1 { m(a = 1) {} }
class Cdef2 { m(a: T = 1) {} }
class Cdef3 { constructor(a = 1) {} }
class Cdef4 { set x(v = 1) {} }
class Cdef5 { static m(a = 1) {} }
const odef1 = { m(a = 1) {} }
const odef2 = { m(a: T = 1) {} }

// ── cover3：对象字面量字符串名访问器（D）──
// 根因：ExpressionBuilder.ParseObjectLiteral 的 looksLikeMemberName 只认 Common / `[`，字符串名
// 不算成员名 → `get` 当简写属性、`"s"()` 当方法，TS 是单个 Get/SetAccessor。
const oacc1 = { get "s"() { return 1 } }
const oacc2 = { set "s"(v) {} }
const oacc3 = { get "a-b"() { return 1 } }

// ── cover3：heritage 表达式承载（B/C）──
// 根因：HeritageClauseShape.BuildClauses 的 startsWithAccess 不认 `new` 开头与元素访问 `[`，
// 把 `new A()` / `b["c"]` 切成两个 ExpressionWithTypeArguments（TS 各一个）。
class Hnew1 extends new A() {}
class Hidx1 extends b["c"] {}
interface Hidx2 extends b["c"] {}

// ── cover4：interface / 类型字面量签名的默认值形参（A）──
// 根因：TypeBuilder.ParseParameterList 逐参数只调 ParseParameter，`=` 无人认领；下一轮
// ParseParameter 在 `=` 上继续 ParseName → 「缺少标识符」。class / 对象方法由 BuildParameters
// + TakeParameterInitializer 已收，签名路径漏了。正确 build：名字/类型后跟 `=` 时读默认值
// （ExpressionBuilder.ParseAssign）并作为 Parameter 的最后一个 child；close：Parameter 区间延到默认值末尾。
interface Idef1 { m(a = 1): void }
interface Idef2 { m(a: T = 1): void }
type Tdef1 = { (a = 1): void }
interface Idef3 { new (a = 1): C }

// ── cover4：interface / 类型字面量的计算名访问器（C）──
// 根因：TypeBuilder.ParseTypeMember 的 get/set 分支只认「名字是 Common」；计算名 `get [k]()` 落回
// 普通成员名路径 → PropertySignature + CallSignature 两个成员，TS 是单个 GetAccessor（name 为
// ComputedPropertyName）。正确 build：名字是 `[` 括号时用 ExpressionBuilder 读成 ComputedPropertyName，
// 再按 Accessor children 顺序（name + 参数 + 返回类型）装配；close：SpanTypeMember 一次收口。
interface Iacc1 { get [k](): number }
interface Iacc2 { set [k](v: number) }
type Tacc1 = { get [k](): number }