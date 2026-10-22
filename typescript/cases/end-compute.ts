// §6「end compute 不对」：这条语句 / 类型在哪一格结束算错（ASI / EOF / 后缀单元判据）。
// 覆盖组：A 块体与根级 ASI、B EOF 收口（普通候选与终结候选共存）、C1–C3 import/export 的 ASI、
// L `++`/`--` 前后缀歧义、O `;` 归上一条语句、async 前缀歧义（`async(1)` 不是箭头）。
// 来源：token-repros/end-statements-eof-candidates.ts、end-statements-async-prefix-semicolon.ts、
// end-modules-c1-c2-c3-g2c.ts 的 ASI 部分（均已并入）；一行一个用例，行内 `\n` 由 ast-json.mjs 还原。
// §5 口径：base 在前，对照组（带 `;` / 另一分支）在后。

// ── B：文件最后一条无分号语句在 EOF 处由它自己的最后一个代码单元收口 ──
debugger\n
throw new Error("x")\n
throw new Error("bad")\n
throw 1\n
if (a) f()\n
for (const v of xs) f(v)\n
for (let i = 0; i < 3; i++) g(i)\n
while (x < 10) x++\n
done: f()\n

// ── B 对照组：有分号 / 文档后面没有别的语句（旧路径不得提前收口） ──
if (a) f();
throw new Error("x");
debugger

// ── L：`++`/`--` 只有紧贴可结束表达式的单元才是后缀，才能在换行处断句 ──
let a = 1; a++; --\na;
let b = 1; b++; ++\nb;
let c = 1; c++; !\nc;
if (a) { a++; } --\na;
let d = 1; d++\n++d;
let e = 1; e++\n--e;
let f = 1; f++\ng();

// ── O：break / continue 换行后的 `;` 是本语句自己的终结符，不能留成孤儿空语句 ──
while (a) break\n;
while (a) break\n;f();
for (;;) foo()\n;
for (const x of y) continue\n;

// ── A2：`async(…)` 后面不是 `=>` 时不是箭头，退回普通表达式语句 ──
async(1);
async(1)\n;
const v = async;
async (1);
async x => x;
async (x) => x;
async function f() {}

// ── 对照组：后缀 + 分号、普通调用、非 async 标识符 ──
let g = 1; g++;
let h = 1; h++; --h;
foo(1);
asyncValue(1);

// ── C1–C3：import / export 的 ASI 收口（换行后接 `from` / `with` 仍属同一条） ──
import { a, b as c } //c\nfrom "m";
import a from "m" //c\nwith { type: "json" };
import a from "m"\nwith { type: "json" };

// ── A：无分号变量/解构语句在换行处收口 ──
const a = 1\nconsole.log(a)
let { a } = o\nconsole.log(a)
const [, second] = [1, 2]\nconsole.log(second)
const o = { x: 1 } as const
try { } catch (e) { }
const x = [1, 2]\nconsole.log(x)

// ── A3（审计补强）：块体内部与根级必须同一时机收口（A 组 stmt-block-statements / st-switch / stmt-while）──
function f() { const a = 1\n f(a) }
function f() { const x = 1\n return x }
if (a) { const x = 1\n f(x) }
for (const x of xs) { total += x\n }
try { f()\n } catch (e) { g()\n }
function f() { x as T\n g() }
switch (x) { case 1: { let a = 1\n break\n } }
switch (x) { case 1: f()\n default: g() }
switch (x) { case 1: f()\n break }
function f() { return\n x }
do { f()\n } while (a)
function f() { "use strict"\n g() }
label: { f()\n }
en:\n{ f() }\nenum E { A }
function f() { throw new Error("x")\n }
do f()\nwhile (a)
function f() { if (a) return\n g() }

// ── A-g（审计补强）：根级语句/声明之间 ASI；换行后接 `(` `[` 二元运算符时不得插 ASI ──
const a = 1\nlet b = 2
let a = 1\nfunction f() {}
f()\ng()
f()\n[0]
f()\n(1)
let a = 1\na\n+ 2
const f = () => {}\nconst g = () => {}
class C {}\nconst x = 1
type T = A\nconst x = 1
let a: number\nlet b = 2
const x = y as T\nfoo()
declare const o: any\nconst b = 1;
interface I { a: number }\nconst x = 1
{ x => x\n[1, 2, 3] }

// ── B2（审计补强）：EOF 处普通候选与终结候选共存，最后一条无分号语句由自己的末单元收口 ──
for (;;) f()
switch (x) { case 1: f() }
function f() {}
class C {}
if (a) { f() }
if (a) f()\nelse g()
while (a) b++
const a = 1
try { f() } finally { g() }
for (;;) { x++\ncontinue }
while (a)\n{ break }
do x++; while (x < 3)
type H = number\ntry { } catch { }
// (a) 已修（第二个 commit）：EOF 处 break/continue 的普通候选不再拖到 EOF 哨兵——ScanBreakOrContinue
//   在 AtEOF / 换行处就地 Complete（受限产生式），本组转为活跃用例。
for (;;) break
label: break label
label: for (;;) break label
for (;;) break\nfoo()
label: { break label }
label: for (;;) f()

// ── C4（审计补强）：import/export 无分号、换行后接下一语句时在行末 ASI（end-close-analysis §3 B 组）──
import x from "m"\nimport y from "n"
import x from "m"\nfoo()
import x from "m"\nclass C {}
import "./side"\nexport default 1
import type { T } from "m"\nconst x: T = 1
export * from "m"\nexport * from "n"
export const a = 1\nexport const b = 2
export { a }\nexport { b }
export type { A } from "m"\nexport type { B } from "n"
export default function f() {}\nexport const a = 1
export default async function f() {}\nexport const a = 1
export default 1\nexport const a = 2
import a = require("m")\nfoo()
import a = require("m")\nimport b = require("n")
declare module "m" { export const a: number\nexport const b: string }

// ── L2（审计补强）：`++`/`--` 紧贴可结束表达式才是后缀；换行后不跨行绑定（L 组 prefix-operand-newline）──
let a = 1, b = 2; a++\n++b
let c = 1, d = 2; c++\n--d
let e = 1; e++\n!e
let f = 1; f++\n--f
let g = 1; g\n++g
// (b) 已修（fix-end-compute）：后缀单元判据补「换行后接 `(` `[` `.` `?.` `!` 不能续接」，转活跃用例。
let h = 1; h++\n(h)

// ── O2（审计补强）：换行后的 `;` 归上一条语句，不新起空语句（O 组 gap-r942-loop-body-terminator）──
if (a) f()\n;
while (a) f()\n;
do f()\nwhile (a)\n;
for (;;) continue\n;
switch (x) { case 1: break\n; }

// ── S2（审计补强）：`async` 上下文关键字与换行断句（`async` 换行后不是箭头前缀）──
async\nfunction f() {}
// 不可修缺口（deferred）：`async\n(x) => x;` 的 TS parseDiagnostics = "';' expected."（静默恢复：
//   ExpressionStatement(CallExpression(async,x)) + x）；尺子不测恢复 AST，故不作为活跃用例、不修。
async (a) => a\nasync (b) => b
async function f() {}\nfunction g() {}
async(1)\n(foo)

// ── C5（cover2 补强）：export 子句的 `}` 与下一行 `from` 之间夹行注释时，终结候选不得提前 Accept ──
// 根因：ExportDeclarationEndPossibleShape.CanEndAt 的 `//` 分支直接 return true，
//   跳过了「换行后第一个词是 from/with/assert/as/type 就仍属本条声明」这条检查 →
//   终结候选与 ExportDeclarationPossibleShape 在同一格同时 Accept，CatalogGuide 报
//   「终结候选与其它候选同时成立（宿主 ExportDeclarationShape，下标 6）」并抛错。
// 修法（typescript/tokens/declarations/export-declaration-end-possible-shape.xl.md:CanEndAt）：
//   行注释分支改为「跳过注释 → 让换行分支判续接关键字」，与块注释 / 无注释走同一套判据。
export { a } // c\nfrom "m"
export { a } /* c */\nfrom "m"
export { a }\nfrom "m"
export { a } from\n"m"

// ── L3（cover2 补强）：后缀 `++`/`--` 换行后接反引号模板 = 新语句，不是标签模板 ──
// 根因：ExpressionStatementPossibleShape.IsAsiBoundary 的后缀 `++`/`--` 分支只放行了
//   `(` `[` `.` `?.` `!`，漏了反引号模板（IsContinuation 里反引号按标签模板续接返回 true）→
//   本仓把 `a++` 与下一行模板并成 TaggedTemplateExpression，TS 是两条语句。
// 修法（typescript/tokens/statements/expression-statement-possible-shape.xl.md:IsAsiBoundary）：
//   后缀分支补「current 是 String 且 StringChar 为反引号」→ 返回 true（在这里断句）。
a++\n`t`
f\n`t`
f()\n`t`
new f\n`t`
f\n`t`\ng()

// ── C6（cover2 补强）：import/export 声明跨行续接（换行后仍是 from / with / 说明符串）──
import { a } from\n"m"
import x\nfrom "m"
import * as ns\nfrom "m"
import x from "m"\nwith\n{ type: "json" }
import { "a-b" as c } from "m"\nfoo()
import x = a.b\nfoo()
export default\nx
export =\n1
export as namespace N\nfoo()
export import a = b\nfoo()

// ── A4（cover2 补强）：根级表达式语句换行后的继续 / 收口（后缀与关键字双方向）──
const x = a\n?.b
a\nin o
a\ninstanceof C
typeof\nx
new\nf()
delete\na.b
class C { a = 1\nb = 2 }
switch (x) { case 1:\ncase 2: f() }
type T = A |\nB
function f(): void;\nfunction f() {}
using a = b\nfoo()
while (a)\nf()
if (a)\nf()
// ── C7（cover3 补强）：非调用位表达式（as / satisfies / 箭头体）换行接 `(` `[` 反引号模板 = 新语句 ──
// 根因：ExpressionStatementPossibleShape.IsAsiBoundary 只判「当前单元是不是延续符」，不看上一
//   表达式能不能当 CallExpression / TaggedTemplate 的宿主：as / satisfies 表达式与箭头函数体都
//   不是 MemberExpression，TS 在换行处插 ASI；本仓此前继续续接，甚至抛「表达式语句没有读完」。
// 修法（typescript/tokens/statements/expression-statement-possible-shape.xl.md）：
//   IsAsiBoundary 增加 IsNonCallableExpressionTail(units, prev)（同层扫 `=>` / `as` / `satisfies`），
//   命中且当前是 `(` `[` 反引号模板时 return true；CanEndExpressionAt 之前的守卫再放行后缀 `!`。
x as T\n(1)
x as T\n[0]
x as T\n`t`
x!\ng()
x!\n++g
x!\n--g
// ── yield 受限产生式（[no LineTerminator here]）：yield 与操作数之间换行 ⇒ 本条 yield 无操作数 ──
// 缺口（end compute：收口判据）：expression-builder.xl.md:ParseYield 只按「后面有没有单元 / 是不是 , ; : }」
// 判 hasOperand，没看关键字与操作数之间有没有行终止符；TS 的 YieldExpression 是受限产生式，
// 换行即收口（`yield⏎(x)` = YieldExpression[..yield 末] + ExpressionStatement(`(x)`)，DIFF 见下）。
// 修法：ParseYield 里从 yield 关键字 End 往后扫空白与注释找行终止符（块注释里的换行也算），
// 命中则 hasOperand=false、且 `yield *` 的 `*` 也不吃（[no LineTerminator here] 在 `*` 之前）。
// 什么时候 build / close：yield 候选在关键字处 build；close 时机是「换行 / , ; : } / 生成器体尾」，
// close 时只提取操作数（缺省为空），End 落在关键字末（yield* 时落在 * 末）。
function* g(){ yield (x) }
function* g(){ yield*\n(x) }
function* g(){ yield (x)\n(y) }
while (a) { b = c\n }
a = 1\nb = 2

// ══ cover5 round5（end compute）：语句 / 类型的「终点格」判据补强 ══
// 一轮把「上一表达式 / 类型已完整、换行后下一个单元接不上」的同一套判据接到四处：
//   根终结候选 + 块级表达式语句（IsAsiBoundary）、变量语句 / return 操作数（窄版）、
//   type alias 候选的 AsiEnd；并补两处「什么不算接不上」：yield 受限产生式、类成员模板续接。
// 下面按族给 base + 换行变体 + 对照组（§5：base 在前）。

// ── E1：箭头块体 / as / satisfies 不是调用位宿主 ⇒ 换行接 `(` `[` 模板是下一条语句 ──
const f0 = () => {};
x = () => {};
x = () => {}\n(y)
x = () => {}\n[0]
x = () => {}\n`t`
x = async () => {}\n(y)
x = (a) => {}\n(y)
x = () => { return 1 }\n(y)
const f = () => {}\n(y)
const f = () => {}\n[0]
let f = () => {}\n(y)
x = () => a as T\n(y)
(x) => {}\n(y)
{ x = () => {}\n(y) }
// 对照组：concise body 之后调用位仍可续接（TS 不插 ASI）
x = () => 1\n(y)
x = () => 1\n[0]
x = () => 1\n`t`
const f = () => 1\n(y)
x = () => a + b\n(y)
x = () => ({a: 1})\n(y)

// ── E2：块体里的表达式语句与根级同一时机收口（后缀 `++`/`--`/`!` 不是调用位/前缀宿主）──
{ x++; }
{ x++; y; }
{ x++\n++y }
{ x++\n--y }
{ x++\n!y }
{ x++\n~y }
{ x++\n(y) }
{ x++\n[y] }
{ x++\n`t` }
{ x--\n++y }
{ x!\n++y }
{ x as T\n(y) }
{ const z = 1; x++\n++y }
function f(){ x++\n++y }
function f(){ x++\n--y }
if (a) { b++\n++c }
while (a) { x++\n++y }
for(;;){x++\n++y}
switch(x){case 1: x++\n++y}
try { x++\n++y } catch (e) {}
label: { x++\n++y }

// ── E3：yield 受限产生式（关键字与操作数之间换行 ⇒ 本条 yield 无操作数、下一行新语句）──
function* g(){ yield 1 }
function* g(){ yield* x }
function* g(){ yield\n(x) }
function* g(){ yield\n[x] }
function* g(){ yield\n`t` }
function* g(){ yield\n/y/ }
function* g(){ yield\n!x }
function* g(){ yield\n-x }
function* g(){ yield/*c*/\n(x) }
function* g(){ yield (x)\n(y) }
function* g(){ yield*\n(x) }
function* g(){ yield 1\n  yield* other() }

// ── E4：type alias 在行末 ASI 收口（类型已完整 + 换行 + 下一单元接不上）──
type T = A;
type T = A\nz;
export type T = A\nz;
type T = A\n(b)
type T = A\nf
type T = A\n1
type T = A\n"s"
type T = A\n`t`
type T = A\n-1
type T = A\n+B
type T = A /* c */\n(b)
type T = A // c\n(b)
type T = A\n\n(b)
{ type T = A\n(b) }
{ type T = A\nf }
function f(){ type T = A\n(b) }
// 对照组：类型内部的跨行续接不能被切断
type T = keyof\nA
type T = A |\nB
type T = A<B>\n(b)
type T = <U>\n(a: U) => U
type T = -/*c*/1 | 0 | 1
type T = A\n[B]

// ── E5：export 声明结构完整后，下一行的 `type` 不是延续词（行末 ASI）──
export { a } from "m";
export { a } from "m"\ntype T = A
export { a } from "m"\ntype T = A;
export * from "m"\ntype T = A
export type { A } from "m"\ntype T = A
// 对照组：仍是同一条声明的跨行延续
export { a }\nfrom "m"
export { a } from\n"m"
export { a } from "m" with { type: "json" };

// ── E6：class 成员没有分号时，反引号模板续接上一条初始化器（不切成新成员）──
class C { a = 1; }
class C { a = 1\n`t` }
class C { a = b\n`t` }
class C { a = 1 + 2\n`t` }
class C { a = 1\n`t`\nb = 2 }
class C { a = 1\n`s` = 2 }
// 对照组：引号串是成员名
class C { a = 1\n"s" }

// ── E7：变量语句 / return 操作数的端点与表达式语句读同一判据 ──
const a = x++;
const a = x++\n++y
const f = () => {};\nconst g = () => {};
function f(){ return x; }
function f(){ return x++\n++y }
function f(){ return x + 1\n g() }
// ══ cover8（U+2028/2029 ASI）：LS/PS 是 ECMAScript 行终止符，参与换行断句 ══
// 探针：tmp/probe-asi.mjs（56 条，TS 6.0.3 diag 全 0）：修前 31 红（crash / 并吞下一语句），修后 0 红。
// 根因：ts 层各处「是否换行」判据只认 \n / \r（expression-statement 的 HasLineBreak/HasLineBreakBefore、
//   statement-builder 的 HasLineBreakAfter、function-declaration 的 LineBreakBefore/NoNewlineBefore、
//   expression-builder 的 ParseYield、statement-scanner 的 NoLineBreakBetween、member-boundary /
//   typescript-template 的 HasLineBreakBetween、import/export end 的 CanEndAt、type-alias 的
//   HasLineBreakBetween）；修法：统一到 typescript/run/line-terminator.xl.md 的 LineTerminator
//   （LF / CR / U+2028 / U+2029，CRLF 算一次），core 零改动。
// 写法：LS/PS 用行内**字面字符**（reader 只按 LF 切行，且会 trim 行首尾的 LS/PS）。
// base：LF 对照（行为不变）
function f(){ return\n1; }
a\nb
const a = 1;\nconst b = 2;
function* g(){ yield\n(x) }
function f(){ return 1; }
function f(){ return 1; }
function f(){ return ; }
function f(){ return 1 2; }
a b
a b
a +b
a ++b
a++ b
a !b
const a = 1; const b = 2;
const a = 1; const b = 2;
let a = 1 let b = 2
type T = A z;
import x from "m" import y from "n"
export { a } from "m" type T = A
{ a b }
function f(){ a b }
function f(){ x++ ++y }
if (a) { b c }
while (a) { b c }
switch (x) { case 1: a b }
function* g(){ yield (x) }
function* g(){ yield x }
while (a) { break label }
while (a) { continue label }
do f() while (a)
x = () => {} (y)
class C { a = 1 `t` }

// ══ cover9（end compute）：type alias 跨行 `<` 边界 + 边界 token 的收尾语句 ══
// 探针：tests/cover9/probe.mjs 的 B06–B14 / C04–C06（TS 6.0.3 parseDiagnostics 全 0，修前全红）。
// B2 族：TS 的 parseTypeArgumentsOfTypeReference 要求类型实参紧跟类型名（有行终止符就不解析类型实参）
//   → `type T = A` ⏎ `<B>c` 是 TypeAliasDeclaration + 独立的 TypeAssertion 表达式语句；
//   修法：type-alias-declaration-possible-shape.xl.md 的 IsAsiBoundary 不再把换行后的 `<` 当续接符。
// C 族：上一条语句在 ASI 边界收口时把边界 token（`return` / `debugger` / 裸块）原样留下，EOF 时
//   语句候选与根终结候选同时 Accept（CatalogGuide 抛「终结候选与其它候选同时成立」）；修法：
//   statement-possible-shape.xl.md 在 EOF 让位 + source-file-end-possible-shape.xl.md 的
//   IsStandaloneTrailingStatement 由根终结候选按正常语句路径建。
// 行终止符写法：`\n` 用转义；CR / U+2028 / U+2029 用行内字面字符（.gitattributes 对本文件钉了 -text）。
// base：LF 对照（修前也红——不是行终止符特有）
type T = A\n<B>c;
type T = A<B>c;
type T = A <B>c;
type T = A <B>c;
// trivia 类：词间块注释 / 行尾注释
type T = A /* c */\n<B>c;
type T = A // c\n<B>c;
// 重复形：无分号 / 后面还有语句
type T = A\n<B>c
type T = A\n<B>c;\nlet z = 1;
// 类型位的其它形态：type query / import() / 括号操作数
type T = typeof x.y\n<Z>c;
type T = typeof x.y<Z>c;
type T = import("m")\n<T>(1);
type T = import("m")<T>(1);
type T = A\n<B>(1);
// 修饰词 / 块级 / 函数体（statement-builder 读同一份判据）
export type T = A\n<B>c;
{ type T = A\n<B>c; }
function f(){ type T = A\n<B>c; }
// ── C 族：上一条语句在 ASI 边界留下的收尾语句（base 是 `return`）──
type T = A\nreturn
type T = A\ndebugger
type T = A\nbreak
type T = A\ncontinue
type T = A\n{ a: 1 }
type T = A\n{ }
type T = A\n{ a: 1; b: 2 }
