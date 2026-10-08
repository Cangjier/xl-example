// xl:note SWEEP-comment/fn 落点（657 审计语料）
// xl:expect Identifier:4,Statement:2,AreaAnnotation,BinaryOperator,Bracket,Function,FunctionBody,Keyword,Parameter,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/fn）：DRIFT Parameter TS[16,17) 产物[16,20) «a»
function f/*c*/(a, b) { return a; }
