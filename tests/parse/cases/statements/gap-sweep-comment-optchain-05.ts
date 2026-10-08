// xl:note SWEEP-comment/optchain 落点（657 审计语料）
// xl:expect Identifier:4,NullConditionalOperator:3,Bracket:2,AreaAnnotation,Let,Root,Statement,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-comment/optchain）：DRIFT VariableDeclarationList TS[0,24) 产物[0,29) «const v = a?.b?.[c]?.(d)»
const v = a?.b?.[c]?.(d)/*c*/;
