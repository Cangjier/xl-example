// xl:note SWEEP-newline/tpl 落点（657 审计语料）
// xl:expect ConstString:2,Statement:3,Identifier,InterpolationString,Let,Root,String,SymbolToken
// 第 836 轮收掉：`${b` 换行 `}` 里那个换行让 `Statement` 壳收进内插段
// ⇒ 投影多一个 `ExpressionStatement`（`InterpolationString` 里不收壳）。
const s = `a${b
}c`;
