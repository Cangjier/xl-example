// xl:note SWEEP-linecomment/label 落点（657 审计语料）
// xl:expect Statement:3,Identifier:2,For,ForBody,ForCompare,ForInitial,ForNext,Keyword,LineAnnotation,Root,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/label）：MISS LabeledStatement TS[0,32) «lbl: //c for (;;) { break lbl; }»
lbl: //c
for (;;) { break lbl; }
