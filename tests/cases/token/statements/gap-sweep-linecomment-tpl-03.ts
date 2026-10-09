// xl:note SWEEP-linecomment/tpl 落点（657 审计语料）
// xl:expect ConstString:2,Statement:3,Identifier,InterpolationString,Let,LineAnnotation,Root,String,SymbolToken
// 第 836 轮收掉：`${//c` 换行 `b}` 里注释先成了一条壳 ⇒ 内插段里出现
// `[Statement, Identifier]` ⇒ 投影报 `FIELD TemplateExpression` 缺 `templateSpans`。
const s = `a${//c
b}c`;
