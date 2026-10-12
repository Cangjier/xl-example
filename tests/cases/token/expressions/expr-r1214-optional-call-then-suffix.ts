// xl:note 可选链 `?.(…)` 后面那一截（第 1214 轮，用户口径 1.1）：括号之后的成员里**跟着一次调用**时，
// 原来那一支自己抄的成员循环只认「下标括号 + 靠 `TextValue` 取名的成员」——`.b(d)` 的名字与实参表
// 在**同一格 `Method`** 里、`TextValue` 是空串 ⇒ 静默跳过（`CallExpression` 的区间只到 `a?.(d)`）；
// 而 `return node` 又把 NCO 里**剩下的兄弟**（`a?.(d)[c](d)` 外面那对实参括号）整格丢掉。
// 两条都收进共用件：成员交给 `membersOnto`、剩下的兄弟交给 `tailUnitsOf` + `chainOnto`。
// xl:expect Method,NullConditionalOperator,PropertyAccess,Bracket
const q = a?.(d).b(d);
const r = a?.(d)[c](d);
const s = a?.(d).b;
const t = a?.(d)(e);
const u = f()?.(d).b(d);
const v = a["b"]?.(d)[c](d);
const w = this?.(d).b(d);
const x = (a)?.(d).b(d);
