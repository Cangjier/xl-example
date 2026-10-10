// xl:note 第 960 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `yield` / `await` **两处上下文都不在**时被投成 `YieldExpression` / `AwaitKeyword`，
// 而 TS 那边是普通 `Identifier`（缺 `Identifier` 1、多 1）。
//
// **判据不在「我在不在生成器 / `async` 里」，而在「这个词有没有操作数」**——这一轮按 TS
// 逐档量了一遍，两种写法**各自两态**：
//
// | 写法 | TS |
// | --- | --- |
// | 生成器里 `yield 1` / `yield* g()` | `YieldExpression` |
// | **非生成器**的 `function f() { yield g(); }` | `YieldExpression`（TS 照收，运行期才报） |
// | **裸** `yield`（`const v = yield;` / `return (yield);`） | **`Identifier`** |
// | `async` 函数里 `await 1` | `AwaitExpression` |
// | **非 async** 的 `function f() { await g(); }` | `AwaitExpression`（同上） |
// | **裸** `await`（`const w = await;` / `return await;` / 顶层 `await;`） | **`Identifier`** |
//
// 所以修法是**两条一起**：①这一格只有那个词（`kids.length === 1`，没有操作数、没有 `*`）；
// ②祖先链上没有生成器 / `async`（`print-ast-common.xl.md` 的 `functionContextOf`）。
// **只看 ② 会把 `await 0;` 这种模块顶层 await 一起判掉**（TS 那边是 `AwaitExpression`，
// 片段普查实测 5 条守卫当场红）；**只看 ① 会把生成器里的裸 `yield` 判掉**。
//
// **`word` 那一道也不能省**：产物里 `this` 同样是一格 `Keyword`，只按 kind 放行会把
// 每一格 `this` 投成 `Identifier`（实测整份文件 `ThisKeyword` 全没、降级期报
// `name is not a local or a capture: this`）。
//
// **上下文的问法是祖先链**（不是 `ctx` 标志）：`projectExpression` 收到的每一格都带
// `__token`（`WithRangeOf` 记的），`Parent` 链就是产物树——语句 → 体 → 函数，一两跳就到。
//
// 四档守卫：裸 `yield`（脚本顶层与普通函数里）、裸 `await`（同上）。
// 反向的五档（生成器 / async / 带操作数 / 顶层 await）由 `expr-yield-await-context.ts` 钉住。
// xl:end
const v = yield;
function f() { return (yield); }
const w = await;
function g() { return await; }
