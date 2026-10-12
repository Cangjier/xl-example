// xl:note `do…while` 后面还跟着一条语句（ASI 断在条件括号上）——第 859 轮登记、第 866 轮转绿。
// 第 866 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `DoWhile` **不在** `Statement.IsStatementUnit` 的表里 —— `do {} while (a) b()` 的壳由
// `Statement.FormTail` 收（`;` 与 `\n` 两档都不响），壳里 `DoWhile` 与后面那条语句**并排**；
// `Statement.SplitShell` 的入口（头是不是语句级单元）与标签那一支（`lbl: do … while (a) b()`）
// 都问这张表 ⇒ 两处都为假 ⇒ 拆不开 ⇒ 投影把两条语句粘成一条 `ExpressionStatement`（缺 3 多 1）。
// 现在 `DoWhile` 在表里（用类名判定，`statement.xl.md` 不 import 它——与 `StaticBlock` 同款）。
// 实测 `tmp/r866/do-while.mjs` 那一族 20 条探针全绿（`dw-then-*` / 标签 / 函数体 / 注释 / 嵌套）。
// xl:expect DoWhile,Method
do {} while (a) b()
