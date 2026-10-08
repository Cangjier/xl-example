// xl:note C-optchain-nonnull 落点（657 审计语料）
// xl:expect Identifier:4,SymbolToken:4,Let:2,NotNull:2,Statement:2,Bracket,Method,NullConditionalOperator,Root,TypeDefine
// xl:known-gap 注释 / 换行落在语法相邻位置之间（C-optchain-nonnull）：DRIFT NonNullExpression TS[30,38) 产物[30,35) «a?.b!.c!»
declare const a: any;
let x = a?.b!.c!();
