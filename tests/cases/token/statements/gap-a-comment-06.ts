// xl:note A-comment 落点（657 审计语料）
// xl:expect SymbolToken:2,AreaAnnotation,Bracket,Let,MethodBody,MethodDeclaration,ObjectLiteral,Root,Statement
// xl:known-gap 注释 / 换行落在语法相邻位置之间（A-comment）：MISS MethodDeclaration TS[12,26) «* /*c*/ g() {}»
const o = { * /*c*/ g() {} };
