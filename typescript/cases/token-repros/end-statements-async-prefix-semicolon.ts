// L / O / async 三族回归用例（本轮修复）
// 每行一个用例；行内 `\n` 是两字符转义，由用例生成器还原成真实换行。
// L：`++` / `--` 既能后缀也能前缀。只有紧贴「能结束表达式」的代码单元（中间无换行）才是后缀，
//    才允许在该格按 ASI 断句；前缀形态（操作数在下一行）绝不能断句 → 改成 `--a` 一条语句。
// O：`break` / `continue` 换行后紧跟 `;` 时，那个 `;` 是本语句自己的终结符（TS 的 canParseSemicolon），
//    必须被 BreakStatement/ContinueStatement 与外层 While/For 壳一起覆盖，不能留成孤儿空语句。
// A2（async）：`async(…)` 后面不是 `=>` 时不是箭头函数，`async` 只是被调用的标识符，
//    退回普通表达式语句 —— 否则 `;` 成孤儿、落进 EOF 兜底并抛「表达式语句没有读完」。
let a = 1; a++; --\na;
let b = 1; b++; ++\nb;
let c = 1; c++; !\nc;
if (a) { a++; } --\na;
let d = 1; d++\n++d;
let e = 1; e++\n--e;
let f = 1; f++\ng();
while (a) break\n;
while (a) break\n;f();
for (;;) foo()\n;
for (const x of y) continue\n;
async(1);
async(1)\n;
const v = async;
async (1);
async x => x;
async (x) => x;
async function f() {}
// 对照组：后缀 + 分号、普通调用、非 async 标识符
let g = 1; g++;
let h = 1; h++; --h;
foo(1);
asyncValue(1);
