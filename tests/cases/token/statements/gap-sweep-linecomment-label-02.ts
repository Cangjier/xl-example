// xl:note SWEEP-linecomment/label 落点（657 审计语料）
// xl:expect Statement:3,Identifier,For,ForBody,ForCompare,ForInitial,ForNext,Keyword,Label,LineAnnotation,Root
// 第 835 轮收掉：`lbl: for //c` 换行 `(;;) { … }` 原本在 `for` 后面那一格收壳。
lbl: for //c
(;;) { break lbl; }
