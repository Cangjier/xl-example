// xl:note SWEEP-comment/generic 落点（657 审计语料）
// xl:expect Identifier:7,Keyword:3,Statement:2,SymbolToken:2,TypeDefine:2,AreaAnnotation,Bracket,Root,TypeLiteral,TypeLiteralBody
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/generic）：MISS FunctionDeclaration TS[0,51) «function f<T extends U>/*c*/(x: T): T { return x; }»
function f<T extends U>/*c*/(x: T): T { return x; }
