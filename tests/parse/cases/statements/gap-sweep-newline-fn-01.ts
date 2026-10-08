// xl:note SWEEP-newline/fn 落点（657 审计语料）
// xl:expect Identifier:3,Statement:3,Keyword:2,Parameter:2,Bracket,MethodBody,MethodDeclaration,Root,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/fn）：MISS FunctionDeclaration TS[0,31) «function f(a, b) { return a; }»
function 
f(a, b) { return a; }
