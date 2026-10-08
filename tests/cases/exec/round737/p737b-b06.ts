// xl:title `yield` 后面跟**逻辑表达式**——`&&` 把 `yield` 当成了左操作数
// xl:round 737
// xl:judge stdout
// xl:want blocked
// xl:why **`yield 1 && 2` 整份文件跑不进来**（`name is not a local or a capture: yield`）：
// xl:why 投影出来的是 `BinaryExpression(left: Identifier "yield", &&, right: 2)`
// xl:why ——那个 `1` **一个字都没留下**，而 `yield` 成了一个标识符。
// xl:why **分界是运算符的类**：`yield 1 + 2` / `yield a ? b : c` / `yield arr.length` 都对，
// xl:why 只有**逻辑那一族**（`&&` / `||` / `??`）出这一格——它们在 token 层是
// xl:why `LogicalOperator` 那一支，链子成形时把前面的 `yield` 单元当成了自己的左操作数。
// xl:why **JS 的读法**：`yield 1 && 2` 是 `YieldExpression` 套 `1 && 2`（`yield` 的优先级比 `&&` 低）——
// xl:why 所以链子该**整个**待在 `yield` 的操作数那一格里。
// xl:why **收它的地方在 token 层**（与第 726 轮 `await {…}` / `yield […]` 那一族同一处：
// xl:why 「谁吃掉换行 / 谁当谁的左操作数」），本轮先把它量清楚登在这里。
// xl:end
function* h() { yield 1 && 2; yield 0 || 3; yield null ?? 4; }
console.log([...h()].join(","));
