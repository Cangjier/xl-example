// xl:note 对象字面量属性值里的 `({ … })`：里面是**对象字面量**，不是类型字面量（第 986 轮收掉，第 985 轮登记时缺 6 漂 0 多 8）
// xl:expect ObjectLiteral:6
// xl:absent TypeLiteral
// 第 985 轮第十批底样（嵌套宿主）量出：`TypeLiteralCloseRule` 的「括号里的第一个 `{`」那一支
// 拿 `IsTypePosition(外层列表, 括号那一格)` 判，而括号前面那个 `:` 是**属性分隔冒号** ⇒ 判成类型位。
// 改法：这一支多问两句——外层花括号是值位（`EnclosingBraceContext`）、且这个冒号不是**返回类型**的冒号
// （返回类型那一格的冒号前面是一个收好的形参表）⇒ 判值位。判据见 `type-literal.xl.md`。
const v = { k: ({ a: 1 }) };
const w = { k: ({ ...o }) };
const u = { k: ({ a: 1 } as any) };
