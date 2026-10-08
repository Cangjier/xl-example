// xl:note SWEEP-linecomment/tpl 落点（657 审计语料）
// xl:expect ConstString:2,Identifier:2,Statement:2,InterpolationString,Keyword,LineAnnotation,Root,String,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/tpl）：MISS VariableStatement TS[0,23) «const s //c = `a${b}c`;»
const s //c
= `a${b}c`;
