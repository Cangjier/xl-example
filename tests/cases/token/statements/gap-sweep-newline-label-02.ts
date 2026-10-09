// xl:note SWEEP-newline/label 落点（657 审计语料）
// xl:expect Statement:4,Identifier,For,ForBody,ForCompare,ForInitial,ForNext,Keyword,Label,Root
// 第 835 轮收掉：`lbl: for` 换行 `(;;) { … }` 原本在 `for` 后面那一格收壳
//（`for` 不在「期待操作数」表里）⇒ `LabeledStatement` 只盖住标签。
lbl: for 
(;;) { break lbl; }
