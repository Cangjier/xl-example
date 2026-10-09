// xl:note SWEEP-newline/label 落点（657 审计语料）
// xl:expect Statement:3,Identifier,For,ForBody,ForCompare,ForInitial,ForNext,Keyword,Label,Root
// 第 835 轮收掉：`lbl:` 换行 `for (;;) { … }` 原本在换行处收壳 ⇒ 标签那一对与 `for` 分家。
lbl: 
for (;;) { break lbl; }
