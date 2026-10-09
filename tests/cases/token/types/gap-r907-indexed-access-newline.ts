// xl:note 类型位的下标访问在换行处被 ASI 断成两条语句（第 907 轮片段普查量出）：`type T = A` 换行 `["k"];` 里 TS 那边是一条 `IndexedAccessType`（`[` 起的是续接），产物在 `A` 之后收壳 ⇒ `["k"]` 落进另一条 `ExpressionStatement`
// xl:round 907
// xl:known-gap `Statement.LineCannotEnd` 的左半截在 `A` 那里答「这一行写完了」，而解析期的续接表（`NextLineContinuesExpression`）只认 `|` / `&` / `.` / `?` / `:` / 算术那几个字符——`[` 那一档在 582 轮被单独拿回来时带了两道护栏（`HasTypeColonBefore` 与「左端是收好的花括号组」），这一格是类型位、左边既没有 `:` 也不是花括号组，但**解析期与收尾期问的不是同一句话**
// xl:end
type T = A
["k"];
