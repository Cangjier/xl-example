// xl:note SWEEP-newline/cond 落点（657 审计语料）
// xl:expect Identifier:3,SymbolToken,Statement:2,Let,Root,TernaryOperator,TernaryOperatorCondition,TernaryOperatorFalseStatement,TernaryOperatorTrueStatement
// 第 837 轮收掉：`a ? b :` 换行 `c;` 原来是两条语句（`LineCannotEnd` 原来只认条件类型那一族）。
const x = a ? b : 
c;
