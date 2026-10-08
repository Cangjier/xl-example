// xl:note SWEEP-linecomment/fn 落点（657 审计语料）
// xl:expect Identifier:3,Statement:3,Keyword:2,Parameter:2,Bracket,LineAnnotation,MethodBody,MethodDeclaration,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/fn）：MISS FunctionDeclaration TS[0,34) «function //c f(a, b) { return a; }»
function //c
f(a, b) { return a; }
