// xl:note SWEEP-newline/async 落点（657 审计语料）
// xl:expect Keyword:3,Statement:3,Bracket,Method,MethodBody,MethodDeclaration,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-newline/async）：MISS FunctionDeclaration TS[0,34) «async function f() { await g(); }»
async function 
f() { await g(); }
