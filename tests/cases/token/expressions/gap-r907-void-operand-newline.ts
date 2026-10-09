// xl:note 一元 `void` 的操作数写在下一行（第 907 轮片段普查量出）：TS 那边是 `VoidExpression`（`void` 要操作数 ⇒ 换行不是边界），产物在 `void` 后收壳 ⇒ 操作数落进另一条语句
// xl:round 907
// xl:known-gap `Statement.LineCannotEnd` 把 `void` 当「两可」词形**一律**排除（那一档是为 `): void` / `=> void` 立的，少了它会红六份用例）——可它是运算符时**一定要**操作数；判据缺的是「这一格 `void` 在值位还是在类型位」
// xl:end
const a = void
 0;
