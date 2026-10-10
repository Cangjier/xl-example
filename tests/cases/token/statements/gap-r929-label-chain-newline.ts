// xl:note 第 929 轮片段普查量到的一格：**标签链中间换行**。
// xl:known-gap `IsPendingLabelHead` 要求末尾那个名字是**语句开头**（`IsStatementStart`），
// 而链里第二个标签前面是 `a :` ⇒ 判据给否 ⇒ 换行处按 ASI 收壳 ⇒ 两个标签各成一条
// `LabeledStatement`（TS 那边是一条嵌套的：`a: b: for(…)`）。
// xl:expect Label,For,ForBody,Statement
a: b:
for (;;) { break a; }
