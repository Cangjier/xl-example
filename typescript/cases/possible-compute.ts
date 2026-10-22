// §6「possible compute 不对」：候选在「这一格该不该活 / 是不是一条边界」上判错
// （成员名 vs 修饰词、跨行边界、类型成员分派、mapped 值换行、上下文关键字升级）。
// 覆盖组：K 类体/接口索引签名、C8 `readonly` 作成员名、D3 修饰词与名字、D4 顶层 `abstract`/`declare` 换行、
// D5 `async` 换行、D8 泛型箭头 vs 尖括号断言、D10 类型位「词 + `{`」、G4 `!` 后缀、G6 `a?` 可选成员、
// G5 无返回类型调用签名与具名可选元组、E 类型实参带逗号、J `async` 作标识符、D12 mapped 值换行、
// 条件类型 / infer 约束回退。
// 来源：token-repros/possible-compute-{class-members,decl-boundary,type-builder}.ts（已并入）与
// tests/cases/token 下对应的 gap-sweep / gap-r 守卫（均已转绿）；一行一个用例，
// 行内 `\n` 由 ast-json.mjs 还原（块注释 / 行注释里的 `\n` 也还原成真换行）。
// §5 口径：base 在前，trivia / 换行 / 重复形变体在后。

// ── K / G5 / G6：类体与接口的索引签名（base → static / readonly 修饰 → 换行即成员边界） ──
class C1 { [key: string]: number }
class C2 { static [k: string]: number; }
class C3 { static readonly [k: string]: number; }
class C4 { readonly [k: symbol]: string }
interface I3 { readonly\n[k: string]: number }
class C5 { readonly\n[k: string]: number }
interface I4 { readonly\n[Symbol.iterator](): T }

// ── C8：`readonly` 既可作修饰词也可作成员名（修饰词要求后面还有名字） ──
class C6 { readonly() {} }
class C7 { static readonly() {} }
class C8 { readonly: number }
class C9 { readonly = 1 }
class C10 { public readonly = 1 }

// ── D3：成员起点「修饰词 vs 名字」（同一行 base；换行 / 块注释内换行 / 行注释三种变体） ──
class C11 { public static readonly a = 1; private m() { } }
class C12 { public static readonly a = 1; private\nm() { } }
class C13 { public /*x\ny*/ m() {} }
class C14 { public static readonly a = 1; private //c\nm() { } }
class C15 { public\nstatic readonly a = 1 }
class C21 { static\nm() {} }
class C22 { get\nfoo() {} }

// ── D4：顶层修饰词与声明关键字之间换行 = 两条语句（换行用行内 \n） ──
abstract\nclass A {}
declare\nmodule "m" {}
declare\nclass B {}

// ── D5：`async` 是上下文关键字，与 `function` 之间换行就不升级 ──
async\nfunction f() { await g(); }

// ── D8：泛型箭头 vs 尖括号断言的判据（带返回类型的那一支） ──
const ga = <T>(x: T): T => x;

// ── D10：类型位「词 + `{`」（继承子句的实体名是一整格类型字面量） ──
interface I5 extends { a: 1 } { }

// ── G4：JSDocNonNullableType（`!` 后缀）在类型位 / as 位 / 数组位 ──
type T1 = a!;
type T2 = (a!);
type T3 = Box<a!>;
const q1 = f() as T!;
const q2 = f() as T![];

// ── G6：可选无类型成员（`a?`；接口有 / 无分号两档） ──
interface I1 { a? }
interface I2 { a?; }
class C16 { a?() {} }
class C17 { a?(): void }
class C18 { a?(); }
class C19 { m?() }
class C20 { trace?: (s: string) => void }

// ── G5：无返回类型调用签名（类型字面量 / 接口）、具名可选元组（完整链 / 最小） ──
type T4 = { (a: string) };
interface I6 { (a: string) }
type T5 = [A?, ...B, C, name: D?, ...rest: E[]];
type T6 = [name: D?];

// ── E：类型实参列表带逗号（`new` 位 / 成员调用位） ──
const e1 = new Map<string, number>();
const e2 = obj.m<string, number>(x);

// ── J：`async` 当标识符（后接 `(` 不是 async 箭头候选） ──
async(1);

// ── D12：mapped 值之后的成员 / 空方括号（换行即成员边界；as / 冒号后换行是好的对照） ──
type T7 = { [K in keyof U]:U; [X]: A };
type T8 = { [K in keyof U as `k${K}`]:U\n[K] };
type T9 = { [K in keyof U]:U\n[] };
type T10 = { [K in keyof U as\n`k${K}`]:U };
type T11 = { [K in keyof U]:\nU };

// ── 条件类型 / infer 约束回退（无约束 infer 是 base，链式 / 数组格变体在后） ──
type N1 = A extends infer E ? E : never;
type N2 = infer E extends F ? G : H;
type N3 = A extends infer E extends B ? E : never;
type N4 = A extends B ? infer E extends F : G;
type N5 = infer E extends F;
type N6 = A extends (infer E extends F)[] ? E : never;
type N7 = A extends B ? C extends D ? infer E extends F ? G : H : I : J;

// ── 已修复并转活跃（原 task-4 上报的两个 possible compute 缺口） ──
// ① `public` ⏎ `static readonly a = 1`：TS 是两条成员（字段 public + 静态字段 a）。根因在
//    class-declaration-shape.xl.md 的修饰词判定把「下一格还是修饰词」当成不看换行的例外；
// ② `a?() {}` / `a?();` / `m?()`：TS 是带 QuestionToken 的 MethodDeclaration。根因是同文件
//    可选方法判定只认「参数表后跟 `:`」，其余形态掉进属性路径后抛「类成员之间缺少分隔符」。
// 两处均已按 TS 的 parseModifiers / nextTokenCanFollowModifier 判据修复（见上方 C15–C22）。

// ── H1：上下文关键字 `type` 作赋值目标（base 在前；类型别名候选 / EOF 别名兜底都不许误收） ──
// `type = 1` 在 TS 里是赋值表达式语句（`type` 是合法标识符），不是类型别名；此前
// source-file-end-possible-shape.xl.md 的 EOF 兜底只按「首词是 type」就交给
// TypeAliasDeclarationShape.FromUnits，抛「类型别名声明不完整」。修法：新增
// TypeAliasDeclarationShape.IsTypeAliasHead（名字 + `=`/`<` 才算别名头），别名候选
// ComputeByIndex 的 Stage 1 也只认 Common 名字、之后只认 `=` / `<`。
type = 1
type = 1 + 2
type /* c */ = 1
type\n= 1

// ── H2：空声明语句 / 修饰词跨行的 EOF 收口（base 在前；export 与成员词允许跨行） ──
// `export const` 单独成句在 TS 里是带**空** VariableDeclarationList 的 VariableStatement；
// 此前 source-file-end-possible-shape.xl.md 的 isExportVariable 要求 code.length>=3，
// 两格形（export + const）落空后掉进 ExpressionStatement 抛「表达式语句没有读完」。
// 修法：isExportVariable 放宽到 code.length>=2（declare 形 >=3）；EOF 边界拆句时
// 「上一格是 export」不拆（TS 的 parseModifiers 对 export 不看换行）。
export const
export var
export let
export declare const
export const\nconst x = 1
export\nconst x = 1
export\nconst
export default\n1

// ══ cover5 round5（possible compute）：上下文关键字双角色 / 换行 ASI 的调用位判据 / 类型别名收口 / import type ══
// 每条都在 TS 6.0.3 `parseDiagnostics.length === 0` 下真红过（基线：crash 或静默错树），修复后转绿。
// 共同根因：普通候选的 `ComputeByIndex` 该 Reject 没 Reject（把下一语句吃进来 → 静默错树）或
// 该 Accept 没 Accept（等到 EOF → crash）；判据没有与 TS 的解析结果对齐，也没有与同类候选读同一个函数。
// 修法见 docs/cover5-possible-compute.md：StatementScanner 增 StartsBinding /
// StartsUsingDeclaration / IsCallPositionBlocked（与 ExpressionStatementPossibleShape.IsAsiBoundary 共用）；
// ExpressionStatement 候选补 DualStage（let/using/type 双角色）；TypeAliasDeclaration 的 ASI 判据改成
// 「不是类型续接符」；ImportClause 的 `type` 按 TS lookahead 区分修饰符 / 默认导入名。
// §5 口径：base 在前，变体（换行 / trivia / 重复形）在后。

// ── let / using：上下文关键字当标识符（赋值 / 标签 / 调用 / 成员访问 / 一元 / 逗号） ──
let = 1;
let = 1;\nlet = 2;
let = 1\nlet = 2;
let = 1\na();
let: 1
let\n: 1
let: 1\na();
let\n: 1\nlet = 2;
let (a);
let.x;
let += 1;
let + 1;
let ? a : b;
let, x;
using = 1;
using = 1\nx = 2;
using: 1
using\n: 1
using\nx = y;
await using;

// ── let / using / type：类型位的双角色（语句体的换行 ASI 不能被吞） ──
type = 1\na();
type = 1\n(a);

// ── as / satisfies 的类型之后换行接调用位：语句到此结束（ASI） ──
const x = a as T\n(b);
const x = a as T\n[b];
const a = b as T\n[c];
const x = a satisfies T\n(b);
let x = a as T\n(b);
var x = a as T\n(b);
const x: A = a as T\n(b);
declare const x: A = a as T\n(b);
const x = a as T & U\n(b);
const x = a as unknown as T\n(b);
const a = b as T\n(c); const d = e as U\n(f);

// ── 表达式语句根：箭头块体 / as 类型之后换行接调用位（TS 插 ASI） ──
x = a as T + b\n(c);
x = a as T[]\n(c);
x = a as T<U>\n(c);
x = a as (T)\n(c);
x = () => {}\n(1);
x = () => 1\n(1);
x = async () => {}\n(1);
() => {}\n(1);
async () => {}\n(1);
const x = () => {}\n(b);
const x = () => 1\n(b);
const x = 1, f = () => {}\n(1);

// ── 类型别名：类型之后的换行边界（表达式语句 / 模板 / 括号 / 标识符） ──
type T = A\n(b);
type T = A | B\n(C);
type T = (A)\n(B);
type T = A<B>\n(C);
type T = A[]\n(B);
type T = { a: 1 }\n(B);
type T = A\na();
type T = A\n`t`;
type T = A\n`a${B}c`;

// ── import type：`type` 是类型修饰符还是默认导入名（TS 的 lookahead） ──
import type from 'm';
import type\nfrom 'm';
import type, { A } from 'm';
import type from 'm'\nimport type from 'n';

// ── 语句体表达式换行 ASI（if / while / 标签体之后的下一条语句不被吞掉） ──
if (a) b\nc();
while (a) b\nc();
l: x\ny();
