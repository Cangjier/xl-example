// xl:note `new` 与它的类型实参表之间换行（第 900 轮片段普查记在「待登记」那一栏的第 F 格、第 902 轮登记）：`new A` 换行 `<B>()` 被 ASI 在换行处断句 ⇒ `new A` 一条语句、`<B>()` 另起一条（落成 `TypeAssertionExpression`），四个区间各漂一格、多出 7 格
// xl:round 902
// 第 905 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：两根，缺一不可——
// ① 解析期 ASI 的**右半截**（`Statement.NextLineContinuesExpression` 的原始字符表）里没有 `<`：
//    换行处收壳 ⇒ 后半截落进另一个 `Statement`。补法见 `statement.xl.md` 那一格
//    （它与 `+` / `-` 同一档：出现在一行开头时只可能是上一行的二元运算）。
// ② `NewCloseRule.Process` 的扫描**在软换行处停**：它原来只认「同一行的类型名」。
//    现在换行后面紧跟**已经成形的 `GenericType`** 时跨过去（裸的 `<` 不算——
//    那样会把 `new A` 换行 `< B` 这种比较链也并进来）。
// xl:expect New:1,GenericType:1,Identifier:2
// xl:end
const a = new A
<B>();
