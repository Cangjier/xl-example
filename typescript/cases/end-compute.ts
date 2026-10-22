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
while (a) { b = c\n }
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
a = 1\nb = 2
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
