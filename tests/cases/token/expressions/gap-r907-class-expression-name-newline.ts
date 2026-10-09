// xl:note 具名类表达式：`class` 与名字之间换行（第 907 轮片段普查量出）：TS 那边是 `ClassExpression`（带 `Identifier(Name)`），产物把 `class` 折成 `Identifier`、`Named {}` 落到别处（缺 `ClassExpression` / 名字，多出 `Block` / `EmptyStatement`）
// xl:round 907
// xl:known-gap 类表达式的名字那一格走的是「紧跟 `class` 的词」这一跳，换行挡住它；而 `class` 那一格自己成了操作数 ⇒ 解析期把这一行收成了一条表达式语句
// xl:end
const A = class Named
 {};
