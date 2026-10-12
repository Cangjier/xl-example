// xl:note SWEEP-linecomment/optchain 落点（657 审计语料）；第 944 轮起 `Statement:1`：下一行那个 `;` 是这一行自己的终结符（`Statement.TrailingSemicolonJoins`），不再多一层空壳
// xl:expect Identifier:4,NullConditionalOperator:3,Bracket:2,Statement:1,Let,LineAnnotation,Method,Root,SymbolToken
const v = a?.b?.[c]?.(d)//c
;
