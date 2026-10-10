// xl:known-gap 第 970 轮把「三层只折了两层」量到 `Method.PrintAst` 那个空括号闸门上（`ctx.Kids(brace).length > 0`），不是 `chainWithOptional` 的折法。
// xl:round 964
// 第 964 轮换一批底样普查（调用 / 可选链 / 非空断言 / 下标，47 条里 11 条对不上）量出来的，
// 与第 962 / 963 两轮收掉的那一族**同域**——都在 `print-ast-common.xl.md` 的**投影层**
//（第 962 轮补的是折法、第 963 轮补的是入口与续接，这一批是它们的**下一层**）。
//
// --- 第 970 轮实测（**只量，数字一处没动**）---
//
// **token 树**（`cjcli` 实测）：`[Identifier(a), NCO(Method(name="")[Method(name="")[Method(name="b")]])]`
// ——**三个** `Method` 单元。而 `chainWithOptional` 收到的 `kids` 只有两格
//（`[Identifier(a), NCO]`，第 968 轮记的就是这一句）。
//
// **产物实测**（`tmp/dump2.mjs`）：
//
//     CallExpression [0,10)
//       CallExpression [0,8) QD@1
//         Identifier [0,1) "a"
//
// ——只有**两层**，而 TS 是三层（`a?.b()` / `a?.b()()` / `a?.b()()()`）。
//
// **根因落在 `tokens/method.xl.md` 的 `PrintAst`**，不在投影层：最外层那一格
// `Method(name="")[Method(name="")[Method(name="b")]]` 走的是
// 「IIFE / 空名字」那条支路，而它有一道闸门 `ctx.Kids(brace).length > 0`
//（`method.xl.md` 第 419 行）——**`a?.b()()` 最外层那个实参表是空的** ⇒ 闸门答否 ⇒
// 这一支不进 ⇒ 落到下面那条通用支，投出来的 `end` 也就没有盖住最外面那一对 `)`。
// 第 968 轮那句「把 `Math.max(ctx.StmtEndOf(v), argsClose + 1)` 改成 `argsClose + 1`」
// 说的是**同一条支路里的另一句**（第 391 行），与本条闸门**不是同一处**。
//
// **下一处入手处**：这一条要在 `tokens/method.xl.md` 里量——**空实参表**那一档
// （`a?.b()()` 的最外层）为什么进不了「括号是被调用者」那条支路，
// 以及去掉那道闸门会不会把 `f()` 那种**实参表就是这一格**的形状带偏
//（`method.xl.md` 第 414–418 轮记的 `f!(1)` 那一族就是这个风险）。
// xl:end
a?.b()()();
