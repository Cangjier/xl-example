// xl:note SWEEP-linecomment/cond 落点（657 审计语料）
// xl:expect Identifier:3,Statement:2,Let,LineAnnotation,Root,SymbolToken,TernaryOperator,TernaryOperatorCondition,TernaryOperatorFalseStatement,TernaryOperatorTrueStatement
// 第 837 轮收掉：`a ? b :` 换行后面那一行是假分支（`LineCannotEnd` 原来只认条件类型那一族）。
const x = a ? b : //c
c;
