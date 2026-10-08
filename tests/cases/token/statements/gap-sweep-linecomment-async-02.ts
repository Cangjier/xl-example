// xl:note SWEEP-linecomment/async 落点（657 审计语料）
// xl:expect Keyword:3,Statement:3,Bracket,LineAnnotation,Method,MethodBody,MethodDeclaration,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/async）：MISS FunctionDeclaration TS[0,37) «async function //c f() { await g(); }»
async function //c
f() { await g(); }
