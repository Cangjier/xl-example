// xl:note SWEEP-linecomment/tpl 落点（657 审计语料）
// xl:expect ConstString:2,Statement:3,Identifier,InterpolationString,Let,LineAnnotation,Root,String,SymbolToken
// 第 836 轮收掉：`${b//c` 换行 `}` 里注释与换行让 `Statement` 壳收进内插段
// ⇒ 投影多一个 `ExpressionStatement`。
const s = `a${b//c
}c`;
