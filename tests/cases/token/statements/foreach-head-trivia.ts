// xl:note `for…in` / `for…of` 的头：`for` 与 `(` 之间夹注释或行注释换行时整条句子照样成形
// （第 937 轮收掉的那一族）。`ForeachCloseRule.Previous` 早已用 `GetSkipNextTrivia` 跳过注释，
// 坏的只有另一半：`BinaryOperatorCloseRule` 里那条「`in` 是分隔词不是运算符」的判据用
// `SkipPreviousWrapSymbol`（只跳软换行）往回找 `for`，撞上注释就找不到 ⇒ `k in o` 先被折成
// `BinaryOperator` ⇒ 轮到 `Foreach` 时括号里已经没有那个词了。
// 四档：块注释 / 行注释换行 × `in` / `of`。
// xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody,AreaAnnotation,LineAnnotation
for /* c */ (const k in o) {}
for // c
(const k in o) {}
for /* c */ (const x of y) {}
for // c
(const x of y) {}
