// xl:known-gap `new` 的被调者是**下标访问**且换行落在 `[` 之前时（`new ns` 换行 `[a]()`），
// 下标括号被当成了实参表：`new ns` 折成一条 `NewExpression`（`[399,405)`），
// 下标访问随后挂到它外面 ⇒ 缺 `ElementAccessExpression` 1、漂 1、多 3。
// 第 937 轮收掉的是**点号**那一侧（换行 / 行注释落在 `.` 两边）；下标这一侧试了一版
// （`bracketIndex` 记 `[`、类型段终点按 `startBracket` 分岔、`lastIndex` 跟着分岔）
// **没成**，按规矩登记在这里 —— 下一轮要重做的第一站是「`new ns` 换行 `[a]()` 里
// 那对括号到底被谁先收走」，而不是继续在 `NewCloseRule` 里加分支。
// xl:expect New,NewType,Identifier
const e = new ns
[a]();
const f = new ns // x
[a]();
