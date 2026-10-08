// xl:note SWEEP-linecomment/async 落点（657 审计语料）
// xl:expect Statement:3,Keyword:2,Bracket,Function,FunctionBody,Identifier,LineAnnotation,Method,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/async）：MISS Identifier TS[0,5) «async»
async //c
function f() { await g(); }
