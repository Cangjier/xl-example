// xl:note 实例化表达式：`>` 后面是**行尾**时 TS 照样读成类型实参段（本仓按比较式读）
// 第 890 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 后继闸在表达式位遇到换行就答「不是类型位」⇒ `<…>` 退回裸符号，整条读成比较式；
// TS 那边 `canFollowTypeArgumentsInExpression` 的第一句就是 `hasPrecedingLineBreak()`。
const f = a<b>
const g = a.b.c<string>
