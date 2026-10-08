// xl:note SWEEP-linecomment/fn 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,BinaryOperator,Bracket,Function,FunctionBody,Keyword,LineAnnotation,Parameter,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/fn）：DRIFT Parameter TS[15,16) 产物[15,19) «a»
function f//c
(a, b) { return a; }
