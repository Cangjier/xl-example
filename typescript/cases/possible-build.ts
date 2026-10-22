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

// ══ cover5 round5（possible build）：build 期提取错 ══
// 一行一个用例；行内 `\n` 由 ast-json.mjs 还原。§5 口径：base 在前，trivia / 重复形变体在后。

// A. 枚举计算名：TS 的 EnumMember.name 是 ComputedPropertyName（`[` `]` 不进 children、内部装表达式）。
//    根因：EnumDeclarationShape.BuildMember 只认 Common / String 名字，`[k]` 直接抛「枚举成员的名字不是
//    标识符、字符串或数字」。正确 build：`[` 括号内交 ExpressionBuilder 读表达式包成 ComputedPropertyName，
//    区间覆盖整个方括号、Pos 取成员起点（含前导 trivia）；close：成员区间到名字 / 初始化器末尾。
enum E5 { [k] }
enum E5 { [k] = 1 }
enum E5 { ["a"] }
enum E5 { [0] }
enum E5 { A = 1, [k] = 2, B = 3 }
enum E5 { /*c*/ [k] /*d*/ = 1 }
enum E5 { [k], [m] = 2 }

// B. 尖括号断言里的嵌套泛型收口：`>>` / `>>>` / `>>>>` 是 basic token 的合符号，
//    最后一个 `>` 属于断言自身，类型只能消费前 n-1 个。根因：ExpressionBuilder.ParseAngleType 拿
//    「原单元数」当期望消费数，只有 `>>`（n=2）恰好相等，`>>>` 多一格 → 「尖括号断言里的类型没有读完」。
//    正确 build：期望消费数 = 展开后 unit 数 - 1（切片含合符号时）。
const x1 = <A<B<C>>>y;
const x2 = <Array<Array<number>>>y;
const x3 = <A<B<C<D>>>>y;
const x4 = <A/*c*/<B<C>>>y;
f(<A<B<C>>>y);
function f() { return <A<B<C>>>y; }

// C. import attribute 的值按表达式提取：TS 的 AssertEntry.value 是表达式（`"json"` 是 StringLiteral，
//    恢复形里也会是 Identifier / NumericLiteral / 对象 / 数组 / 二元表达式 / 模板串）。
//    根因：ImportAttributeShape.FromTokens 只认 String basic token → 非字符串值整段丢掉，
//    模板串还被错建成 StringLiteral。正确 build：`:` 之后交 ExpressionBuilder.ParseAssign。
import x1 from "m" with { type: json };
import x2 from "m" with { type: 1 };
import x3 from "m" with { type: `t` };
import x4 from "m" with { type: 1 + 2 };
import x5 from "m" with { type: [1] };
import x6 from "m" with { type: { a: 1 } };

// D. 参数装饰器之后的解构 / rest：TS decorator context 里 `@a` 后面顶层的 `[` 不是 element access，
//    而是参数名（解构模式）的起点；装饰器的 children 只有表达式，Parameter 仍是 [Decorator, 模式, 类型]。
//    根因：TypeBuilder.ParseDecorators 把 `a [x]` 当 element access 整段吃掉；class 侧 BuildParameters
//    的「装饰过的参数」分支只 ParseName（解构模式 / `...` 直接「缺少标识符」）；function/class 解构模式的
//    Pos 接到第一个 `@` 而不是最后一个装饰器之后。正确 build：装饰器表达式在顶层 `[` 处截断，模式/rest
//    交 TypeBuilder.ParseParameter 再补挂装饰器，Pos = 最后一个装饰器的 End+1。
function f1(@a { x }: T) {}
function f6(@a /*c*/ { x }: T) {}
class C2 { m(@a { x }: T) {} }
class C3 { m(@a [x]: T) {} }
class C4 { m(@a @b { x }: T) {} }
class C5 { constructor(@a [x]: T) {} }
class C7 { m(@a() [x]: T) {} }

// E. 参数属性的 rest：TS children 顺序是 [修饰词, DotDotDotToken, Identifier, Type]（parseDiagnostics=0）。
//    根因：class BuildParameters 的属性参数分支在修饰词后直接 ParseName，`...` 当名字 → 「缺少标识符」。
//    正确 build：修饰词之后先认 `...`（DotDotDotToken，Pos 含前导 trivia），再读名字 / 可选 / 类型 / 默认值。
class R1 { constructor(private ...a: A[]) {} }
class R2 { constructor(readonly ...a: A[]) {} }
class R3 { constructor(public ...a: A[]) {} }
class R4 { constructor(private /*c*/ ...a: A[]) {} }

// F. 对象字面量可选方法：TS 是 MethodDeclaration（children 顺序 name → QuestionToken →
//    [TypeParameters] → params → [return type] → Block）。根因：名字后的 `?` 无人认领，落到属性 / 简写
//    分支 → 「缺少标识符」；async / generator 形态则报「对象字面量成员缺少函数体」。
//    正确 build：`?` / `?:` 后紧跟 `(` 或 `<` 时建 QuestionToken（只覆盖 `?` 一格）放在 name 之后。
const o1 = { m?() {} };
const o2 = { m?(a) {} };
const o3 = { async m?() {} };
const o4 = { *m?() {} };
const o5 = { m? /*c*/ () {} };
const o6 = { m?(): void {} };
const o7 = { m?<T>(x: T): T { return x } };
const o8 = { "a-b"?() {} };

// G. 可选调用 + 显式类型参数（`a?.<T>(b)`）：TS 的 CallExpression children 顺序是
//    [expression, QuestionDotToken, TypeArguments…, args…]（`(` / `)` 不投影）。
//    根因：`?.` 分支只认 `?.(` / `?.[` / `?.name`，`<` 落进 ParseName → 「缺少标识符」。
//    正确 build：`?.` 之后先用 AngleJudge.CanStart 判类型实参（`?.` 在 PredecessorAllows 白名单里），
//    读完后要求紧跟实参括号。
a?.<T>(b);
a?.<T, U>(b, c);
a?.<Array<T>>(b);
const ox = a?.<T>(b);
a?./*c*/<T>(b);