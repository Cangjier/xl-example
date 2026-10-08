// xl:note C-optchain-nonnull 落点（657 审计语料）
// xl:expect Identifier:3,Let:2,Statement:2,SymbolToken:2,Bracket,Method,NotNull,NullConditionalOperator,Root,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（C-optchain-nonnull）：MISS NonNullExpression TS[30,35) «a?.b!»
declare const a: any;
let x = a?.b!();
