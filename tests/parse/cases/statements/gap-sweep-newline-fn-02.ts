// xl:note SWEEP-newline/fn 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,BinaryOperator,Bracket,Function,FunctionBody,Keyword,Parameter,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/fn）：DRIFT Parameter TS[12,13) 产物[12,16) «a»
function f
(a, b) { return a; }
