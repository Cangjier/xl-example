// xl:note 第 960 轮的**反向守卫**：`yield` / `await` **在上下文里、或者带操作数**时
// 仍然是 `YieldExpression` / `AwaitExpression`——它们与
// `gap-r955-yield-await-outside-context.ts`（裸词、两处都不在 ⇒ `Identifier`）是同一格的两半。
//
// 这一份把「不能顺手判成标识符」的每一档都钉住（第 960 轮修那一格时逐档量出来的）：
// - **生成器里**（`function* g()` / 类与对象字面量的 `*m()`）：`yield 1` 是 `YieldExpression`；
// - **`async` 函数里**：`await 1` 是 `AwaitExpression`；
// - **裸 `yield` 在生成器里**：TS 还是 `YieldExpression`（只是没有 `expression`）——
//   这一档是「只看有没有操作数」那一版的**反例**；
// - **`async` 箭头函数里**：`async () => await 1` 同第一档；
// - **模块顶层的 `await 0;`**：TS 给 `AwaitExpression`——这一档是「只看在不在 async 里」
//   那一版的**反例**（顶层不在任何函数体里，可它是模块顶层 await）；
// - **非生成器 / 非 async 函数里带操作数**：`function f() { yield g(); }` 与
//   `function h() { await g(); }`，TS **照收**表达式（运行期才报），所以带操作数那一边
//   一律不收成标识符。
// xl:end
function* g() { yield 1; }
async function h() { await 1; }
function* bare() { yield; }
const arrow = async () => await 1;
class K { *m() { yield 2; } async n() { await 2; } }
const o = { *m() { yield 3; }, async n() { await 3; } };
function f() { yield g(); }
function h2() { await g(); }
