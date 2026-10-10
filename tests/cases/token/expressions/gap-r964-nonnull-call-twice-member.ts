// xl:known-gap 第 970 轮（二）把上一格记错的现场改正了：链那一支**根本没进**（摊开循环一次都没打印），所以根因在**入口判据**那一段之前的某一支，不在 `chainOnto` 的 `break` 上。
// xl:round 964
// 第 964 轮换一批底样普查（调用 / 可选链 / 非空断言 / 下标，47 条里 11 条对不上）量出来的，
// 与第 962 / 963 两轮收掉的那一族**同域**——都在 `print-ast-common.xl.md` 的**投影层**
//（第 962 轮补的是折法、第 963 轮补的是入口与续接，这一批是它们的**下一层**）。
//
// --- 第 970 轮实测（**只量，数字一处没动**）---
//
// **token 树**（`node build/ts/cjcli.js` 实测，一字不差，**注意只有一格 `Method`**）：
//
//     [NotNull([a, !]), PropertyAccess([Method(name="")[Bracket(())]], ., Identifier(c))]
//
// **进到哪一步**（`projectExpression` 入口与链支内部插桩，读到的原文）：
//
//     PE kids=[NotNull(0-1) PropertyAccess(2-7)]
//     （链支的摊开循环**一次都没打印** —— 入口判据那一段就没通过）
//
// **所以下面这两条被这一轮推翻**（第 970 轮第一版记的，留在这里当反例）：
//
//   · ~~「链那一支进得去，卡在链里的摊开循环上」~~ —— 摊开循环没执行；
//   · ~~「`chainOnto` 的续格循环在 `Method` 上 `break`」~~ —— 根本走不到 `chainOnto`。
//
// **插桩的教训**：第 970 轮第一版把 `const ck = [];` 当成了链那一支的锚点，
// 而那个字面量在**别的支路**里也有一份（`flattenChainTailInOperator`），
// 于是打印落到了死代码上、看起来「进了支、没进循环」。**锚点要选那一段独有的字符串**。
//
// **现在的下一处入手处**：这一次要量的是**入口判据那一段**——
// 链支的条件是 `kids.length >= 2 && (isSymbol(kids[1], ".") || isIndexBracket(kids[1]) ||
// isCallFirstUnit(kids[1], ctx) || …)`，而这一格 `kids[1]` 是
// `PropertyAccess([Method(name="")[Bracket(())]])`：
// `isCallFirstUnit` 对它的头一格（`Method` 里的 `Bracket`）**应当**答真，
// 所以下一步是在**那一段前面**（`projectExpression` 开头到链支之间那几支）
// 量清楚是谁先把这一格吃掉的——插桩必须打在**链支条件那一条 `if` 上**，
// 而不是它内部。
// xl:end
a!()().c;
