// xl:note SWEEP-linecomment/tpl 落点（657 审计语料）
// xl:expect ConstString:2,Statement:2,Identifier,InterpolationString,Let,LineAnnotation,Root,String,SymbolToken
// xl:known-gap 注释 / 换行落在语法相邻位置之间（SWEEP-linecomment/tpl）：FIELD TemplateExpression [10,22) 产物[head] TS[head,templateSpans] «`a${//c b}c`»
const s = `a${//c
b}c`;
