// xl:note SWEEP-linecomment/async 落点（657 审计语料）
// xl:expect Statement:2,Bracket,Function,FunctionBody,Identifier,Keyword,LineAnnotation,Method,Parameter,Root
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/async）：FIELD FunctionDeclaration [0,37) 产物[body,modifiers,name,parameters] TS[body,modifiers,name] «async function f(//c ) { await g(); }»
async function f(//c
) { await g(); }
