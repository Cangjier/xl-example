// xl:note A-comment 落点（657 审计语料）
// xl:expect Identifier:2,Let:2,Statement:2,SymbolToken:2,AreaAnnotation,Root,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（A-comment）：FIELD VariableDeclaration [26,38) 产物[exclamationToken,initializer,name] TS[initializer,name] «x = !/*c*/ a»
declare const a: any;
let x = !/*c*/ a;
