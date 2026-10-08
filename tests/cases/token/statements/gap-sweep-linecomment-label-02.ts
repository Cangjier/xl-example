// xl:note SWEEP-linecomment/label 落点（657 审计语料）
// xl:expect Statement:3,Bracket:2,Keyword:2,SymbolToken:2,Identifier,Label,LineAnnotation,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/label）：DRIFT LabeledStatement TS[0,32) 产物[0,8) «lbl: for //c (;;) { break lbl; }»
lbl: for //c
(;;) { break lbl; }
