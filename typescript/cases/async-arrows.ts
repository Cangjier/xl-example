// async 箭头：`async` 前缀只在真的起始一个箭头时被吃（async (a) => a / async a => a）。
// TS children 顺序：AsyncKeyword 在最前，然后 Parameters、EqualsGreaterThanToken、body。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行。
// 注意：async 与参数之间不能有换行（TS 把它当两个语句/调用），所以 trivia 变体都写在同一行里。

// ── base：四种 async 箭头形态 ──
async (a) => a;
async a => a;
async () => 1;
async (a, b) => a;

// ── trivia 叠加：参数括号内的空格 / 头与括号之间的注释与多空格 ──
async ( a ) => a;
async  (a) => a;
async /* c */ (a) => a;
async (a) /* c */ => a;
async (a, b, c) => a;
async (/* c */ a) => a;
async (a /* c */) => a;

// ── body：表达式体 / 块体 ──
async (a) => { return a; };
async (a) => a + b;
async a => a * b;

// ── 重复形：一条语句里多个 async 箭头 / 与普通语句连排 ──
async (a) => a;
async a => a;
async (a) => a, async b => b;
a; async (a) => a;
async (a) => a; b;

// ── 回归：普通箭头与 ASI ──
a => a;
(a) => a;
a\n++b;
a\nb;
a\n+b;
