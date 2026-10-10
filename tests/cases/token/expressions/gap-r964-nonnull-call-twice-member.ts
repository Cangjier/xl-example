// xl:note 第 971 轮收掉：入口判据 `isCallFirstUnit` 原来只认**平级的**实参括号，
// 而这一格的第二格是 `PropertyAccess(Method(name=""[Bracket(())]), ., c)`——括号在 `Method`
// **里面**，于是链那一支整个进不来、只剩一个盖到 `a!` 的 `NonNullExpression`。
// 多问一句「头一格是不是 `Method` 外壳的那一次调用」之后，两个 `CallExpression`、`.c` 与断言
// 各就各位（缺 4 → 0）；那一行 `xl:known-gap` 按规矩撤掉，用例留着当守卫。
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
// **第 970 轮量出的下一处入手处，第 971 轮就是照着它修的**：
// 链支的条件是 `kids.length >= 2 && (isSymbol(kids[1], ".") || isIndexBracket(kids[1]) ||
// isCallFirstUnit(kids[1], ctx) || …)`，而这一格 `kids[1]` 是
// `PropertyAccess([Method(name="")[Bracket(())]])`：`isCallFirstUnit` 对它的头一格
//（`Method` 里的 `Bracket`）**应当**答真——实测它答的是假。
// 修法就在那一句上（`print-ast-common.xl.md` 的 `isCallFirstUnit`）：`PropertyAccess` /
// `NotNull` 那一支先问「头一格是平级的实参括号吗」，再问一句
// 「头一格是 `Method` 外壳的那一次调用吗」（判据转交给 `Method` 那一支，**不写第二份**）。
// 链那一支于是进得去，摊开与 `chainOnto` 的 Method 分支（第 966 轮补的）照常把它折完。
// xl:end
a!()().c;
