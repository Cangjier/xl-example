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
