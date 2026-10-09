// xl:note 函数声明上的标签（第 900 轮）：`lbl: function f() {}` 在 TS 里是一条 `LabeledStatement`，而标签的「冒号后面能不能起一条语句」名单里只有控制流那七个词 ⇒ 标签收不出来、`TypeDefineCloseRule` 把 `:` 与整个声明收成一个类型标注
// xl:round 900
// xl:expect Label:1,Function:1,FunctionBody:1,Identifier:1,Bracket:1,Statement:1
// xl:end
lbl: function f() {}
