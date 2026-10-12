// xl:note 一元 `void` 的操作数写在下一行（第 907 轮片段普查量出）：TS 那边是 `VoidExpression`（`void` 要操作数 ⇒ 换行不是边界），产物在 `void` 后收壳 ⇒ 操作数落进另一条语句
// xl:round 907
// 第 911 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：根因是 `Statement.LineCannotEnd`
// 把 `void` 当「两可」词形**一律**排除（那一档是为 `): void` / `=> void` 立的）——
// 可它是运算符时**一定要**操作数。判据从「一律排除」收窄成「按**它前面那一格**分」，
// 只写一份：`Statement.IsVoidInTypePosition`（类型位 `:` / `=>` / `|` / `&` / 类型别名的 `=`；
// 值位一律答「一定没写完」）。六份 `): void` / `=> void` 的用例全在类型位，一行都没改。
// xl:end
const a = void
 0;
