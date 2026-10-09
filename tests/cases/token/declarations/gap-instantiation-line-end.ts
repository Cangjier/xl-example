// xl:note 实例化表达式：`>` 后面是**行尾**时 TS 照样读成类型实参段（本仓按比较式读）
// xl:known-gap 后继闸在表达式位遇到换行就答「不是类型位」⇒ `<…>` 退回裸符号，整条读成比较式；TS 那边 hasPrecedingLineBreak() 是放行的
const f = a<b>
const g = a.b.c<string>
