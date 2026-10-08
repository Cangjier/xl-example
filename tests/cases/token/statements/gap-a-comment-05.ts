// xl:note A-comment 落点（657 审计语料）
// xl:expect Identifier:2,Statement:2,AreaAnnotation,Let,Root,SymbolToken,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（A-comment）：MISS PostfixUnaryExpression TS[22,32) «a /*c*/ ++»
declare const a: any;
a /*c*/ ++;
