// xl:note SWEEP-newline/label 落点（657 审计语料）
// xl:expect Statement:3,Identifier:2,For,ForBody,ForCompare,ForInitial,ForNext,Keyword,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/label）：MISS LabeledStatement TS[0,29) «lbl: for (;;) { break lbl; }»
lbl: 
for (;;) { break lbl; }
