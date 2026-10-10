// xl:known-gap 第 971 轮普查量到：`!` 后面**没有点号**、直接跟一条下标子链时，`chainOnto` 的循环在 `if (!isDot(unit, ctx) || i + 1 >= units.length) break` 上收工——子链那一支住在 `isDot` 那一段**里面**，根本走不到。
// xl:round 971
// 第 971 轮把第 964 轮那三格收掉之后，拿 30 条同族片段（调用 / 可选链 / 非空断言 / 下标）
// 普查量的（30 条里 2 条对不上，这是另一条）。
//
// **token 树**（`cjcli` 实测）：
//
//     [Identifier(a), NCO([NotNull([b, !]), PropertyAccess([Bracket([0]), Identifier(c)])])]
//
// ——`!` 后面那一格是 **`[0].c`**（下标 + 成员），**前面没有点号**。
//
// **走到哪**：`chainWithOptional` 的 `NotNull` 那一支先折出
// `NonNull(PropertyAccess(a, ?.b))`，把剩下的 `[PropertyAccess]` 交给 `chainOnto`；
// 那里第一格既不是点号、也不是下标括号 / 圆括号 / `Method` ⇒
// `if (!isDot(unit, ctx) || i + 1 >= units.length) break` ⇒ **整格丢**：
// 产物只剩一格 `PropertyAccessExpression [0,4)`（缺 `ElementAccessExpression` /
// `NumericLiteral` / `Identifier(c)`，`PropertyAccessExpression` 漂 1，共 4 处）。
//
// **为什么第 971 轮补的那两档够不着它**：这一轮在子链分支里补了「第一格是名字」
// 与「第一格是下标括号」两种落单形状，可那一支**只在点号后面**才进得去
//（它住在 `isDot` 那一段里面）——没有点号时循环在它前面就 `break` 了。
//
// **下一处入手处**：把子链那一支从 `isDot` 那一段里抬出来——`unit` 自己就是
// `PropertyAccess` 时也走它（`i += 1` 而不是 `i += 2`，`pendingBang` 那两格照旧）。
// 抬出来之后这一格才轮到「第一格是下标括号」那一档，而那一档在
// `chainWithOptional` 的子链分支里是现成的写法。
// 第 971 轮只量到这里，没有动判据（如实登记，不猜）。
// xl:end
a?.b![0].c;
