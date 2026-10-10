// xl:known-gap 第 970 轮把根因量到现场了（数字一处没动，见下面那几行）：`projectExpression` 的链那一支里**摊开判据**只认「头一格是方括号」那一档，头一格是**空名字 `Method`** 时整格原样进了续格清单，而 `chainOnto` 的循环在 `Method` 上当场 `break`。
// xl:round 964
// 第 964 轮换一批底样普查（调用 / 可选链 / 非空断言 / 下标，47 条里 11 条对不上）量出来的，
// 与第 962 / 963 两轮收掉的那一族**同域**——都在 `print-ast-common.xl.md` 的**投影层**
//（第 962 轮补的是折法、第 963 轮补的是入口与续接，这一批是它们的**下一层**）。
//
// --- 第 970 轮实测（**只量，数字一处没动**）---
//
// **token 树**（`node build/ts/cjcli.js` 实测，一字不差）：
//
//     [NotNull([a, !]), PropertyAccess([Method(name="")], ., Identifier(c))]   ← 没有 NCO
//
// **进了哪一支**（`projectExpression` 入口插桩实测，那一行的原文）：
//
//     PE kids=[NotNull(2-2) PropertyAccess(3-8)]        ← 只有这一条进不了链那一支
//
// 链那一支的入口判据（`isSymbol(kids[1], ".") || isIndexBracket(kids[1]) ||
// isCallFirstUnit(kids[1], ctx)`）在**这一格上答真**（`isCallFirstUnit` 对
// `PropertyAccess(Method(name=""))` 给 `true`——它往 `Method` 里看一层，见到那个
// `Bracket`），所以链支**进得去**；链里的摊开循环逐格看 `kids[at]`，
// 而 `kids[1]` 就是那一格 `PropertyAccess`：
//
//   · 第 3992 行那条摊开判据要求 `isIndexFirstUnit(k)`——头一格是 `Method` ⇒ 答否；
//   · 第 4002 行那条要求 `isCallFirstUnit(k)`——**这一条答真**，摊开之后
//     `ck` 里就成了 `[NotNull, Method(name=""), ., Identifier(c)]`。
//
// **卡在哪**：`chainOnto` 的续格循环只认「下标括号 / 圆括号 / 点号」，
// 而摊开后的那格 `Method(name="")` 是**一个单元**——既不是点号也不是括号 ⇒
// `if (!isDot(unit, ctx)) break` ⇒ **`.c` 与外面那次调用一起丢**，
// `left` 停在 `a!()` 上（实测缺 3 格，`NonNullExpression` 区间只到 `a!`）。
//
// **下一处入手处**：摊开之后 `chainOnto` 循环遇到 `Method` 时不要 `break`——
// 它那几支空名字 `Method` 的分支（第 966 轮补的「外面还有没有一层」按**区间**判）
// 正是这一档要的，而 `.c` 是它的下一个兄弟、由循环接着接。
// 第 970 轮试过一版（在摊开判据里加「头一格是空名字 `Method`」那一档），
// **门量下来一处没动**（已知缺口那一栏逐字不变：缺 4 / 漂 0），已按本仓规矩撤回。
// xl:end
a!()().c;
