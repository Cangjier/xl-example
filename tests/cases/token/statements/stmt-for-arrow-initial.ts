// xl:note 初始段是箭头函数：`for` 头里的实参列表分支也不许吃掉后面的分号
// xl:expect For,ForInitial,Lamda,ForCompare,ForNext,ForBody
// `=>` 的父亲是 `for` 的条件括号，被 `IsMethod` 认成实参列表；
// 那条分支收不到 `,` 时会退到 `units.length - 1`，把后面两个 `;` 一起卷进来。
for (() => 1; i < 10; i++) {}
