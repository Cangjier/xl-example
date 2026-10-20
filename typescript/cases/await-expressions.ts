// await 表达式：AwaitExpression children = [操作数]，`await` token 不投影。
// 合法性结论（ts.createSourceFile parseDiagnostics）：顶层 `await x;` 与语句首 await 均为 0 诊断，
// async 箭头体内的 await 也合法；因此本 stem 同时覆盖顶层语句与 async 箭头体两种位置。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行。

// ── base：顶层 await 语句 ──
await x;
await x + y;
await f(a);
(await a).b;
await await x;

// ── 顶层 trivia：await 之后的空白 / 注释 ──
await  x;
await /* c */ x;
/* c */ await x;
await x;\nawait y;
// 未收（原因）：await 是「无换行」受限产生式，`await\nx;` TS 会 ASI 成两条语句；
// 本仓 builder 的 Units 已经滤掉 trivia、看不到换行，所以要收这一族得先有换行判据。
// `// ` await\nx;
// `// ` await\nf(a);
// 未收（原因）：非 async 上下文里 TS 把 `await (` 当调用 `await(a)`（CallExpression），
// 与 AwaitExpression 的形态不同；等 await 上下文的判定点落地再收。
// `// ` await (a);

// ── async 箭头体里的 await（expr body） ──
async () => await x;
async (a) => await a;
async () => await f(a);
async () => (await a).b;

// ── async 箭头体：优先级 / 结合性 ──
async () => await a + b;
async () => await (a + b);
async () => -await a;
async () => (await a)();

// ── async 箭头块体里的 await ──
async () => { return await a; };

// ── 重复形 ──
await a; await b;
async () => await a, async (b) => await b;

// ── 回归 ──
a + b;
f(a);
async (a) => a;
