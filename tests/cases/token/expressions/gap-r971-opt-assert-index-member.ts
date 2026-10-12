// xl:note 第 973 轮收掉：**两处各缺一份**——`chainOnto` 的循环在
// `if (!isDot(unit, ctx) || i + 1 >= units.length) break` 上收工，而子链那一支住在
// `isDot` 那一段**里面**（`unit` 自己是 `PropertyAccess` 时根本走不到）；抬出来之后
// 那条子链的第一格是 `Bracket([0])`，而 `chainOnto` 的子链循环里**没有下标括号那一支**
//（`chainWithOptional` 的子链分支里早就有）。补上这两处，`ElementAccessExpression` /
// `NumericLiteral` / `Identifier(c)` 与那个漂掉的外层属性访问各就各位（缺 3 漂 1 → 全 0）。
// 那一行 `xl:known-gap` 按规矩撤掉，用例留着当守卫。
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
// **第 971 轮量出的读数**：`chainWithOptional` 的 `NotNull` 那一支先折出
// `NonNull(PropertyAccess(a, ?.b))`，把剩下的 `[PropertyAccess]` 交给 `chainOnto`；
// 那里第一格既不是点号、也不是下标括号 / 圆括号 / `Method` ⇒
// `if (!isDot(unit, ctx) || i + 1 >= units.length) break` ⇒ **整格丢**：
// 产物只剩一格 `PropertyAccessExpression [0,4)`（缺 `ElementAccessExpression` /
// `NumericLiteral` / `Identifier(c)`，`PropertyAccessExpression` 漂 1，共 4 处）。
//
// **第 971 轮记的「下一处入手处」，第 973 轮逐句验证**：
//
//   1. 「把子链那一支从 `isDot` 那一段里抬出来——`unit` 自己就是 `PropertyAccess` 时也走它
//      （`i += 1` 而不是 `i += 2`）」——**对**：循环入口改成
//      `const dotStep = isDot(unit, ctx) && i + 1 < units.length` 与
//      `loneSubChain = dotStep === false && unit.get("type") === "PropertyAccess"`，
//      末尾那句 `i += 2` 跟着改成 `i += dotStep ? 2 : 1`。
//   2. 「抬出来之后这一格才轮到『第一格是下标括号』那一档，而那一档在 `chainWithOptional`
//      的子链分支里是现成的写法」——**也对**：抬出来之后下标那一格落到子链循环末尾那句
//      空转的 `j += 1`，所以要把 `chainWithOptional` 里的下标支**照同一判据、同一折法**
//      补进 `chainOnto` 的子链循环（**不写第二份判据**：形状与判据一字不差）。
//
// 两处到位之后探针转绿（`node tests/parse/ts-ast.mjs --snippets tmp/r972-probe.mjs`：
// 2 条合法片段、0 条对不上）。
// xl:end
a?.b![0].c;
