// xl:note 第 929 轮片段普查量到的一族：被标语句的**头部与它自己体之间**换行。
// xl:known-gap 标签那一层的续接判据没认这三格（`while` 与条件括号之间、`interface` /
// `enum` 的名字与体之间都换行）⇒ 换行处收壳 ⇒ 被标的声明与它的体分家。
// xl:expect Label,While,WhileBody,Keyword,TypeDefine,Method
lbl: while
(a) { break lbl; }
iface: interface I
{ m(): void }
en: enum E
{ A }
