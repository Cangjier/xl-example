// xl:note 类型位的下标访问在换行处被 ASI 断成两条语句（第 907 轮片段普查量出）：`type T = A` 换行 `["k"];` 里 TS 那边是一条 `IndexedAccessType`（`[` 起的是续接），产物在 `A` 之后收壳 ⇒ `["k"]` 落进另一条 `ExpressionStatement`
// xl:round 907
// 第 912 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：**907 那一轮把 TS 的读法记反了**——
// 实测 `ts.createSourceFile` 给的是 `TypeAliasDeclaration`（到 `A` 收尾）+ 一条
// `ExpressionStatement`（`["k"];`），**类型位后面接不了下标**（TS 的 `parsePostfixTypeOrHigher`
// 只在同一行里吃 `[`）。判据是既有的一格：`HasTypeColonBefore` 撞上 `=` 时原来一律答
// 「上一行是表达式」，现在先问 `IsTypeAliasAssignment`——**类型别名的 `=` 右边是类型**
//（与「变量声明的 `=` 右边是值」同一格分辨）。两道 `[` 护栏（解析期与收尾期）共用这一句。
// xl:end
type T = A
["k"];
