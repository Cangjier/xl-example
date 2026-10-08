// xl:note SWEEP-comment/for 落点（657 审计语料）
// xl:expect Identifier:4,SymbolToken:3,Statement:2,AreaAnnotation,For,ForBody,ForCompare,ForInitial,ForNext,Let,Method,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/for）：MISS PostfixUnaryExpression TS[23,31) «i/*c*/++»
for (let i = 0; i < 3; i/*c*/++) { a(); }
