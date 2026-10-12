// xl:note SWEEP-linecomment/label 落点（657 审计语料）
// xl:expect Statement:3,Identifier,For,ForBody,ForCompare,ForInitial,ForNext,Keyword,Label,LineAnnotation,Root
// 第 835 轮收掉：`lbl: //c` 换行 `for (;;) { … }` 原本把注释与冒号收成 `TypeDefine`。
lbl: //c
for (;;) { break lbl; }
