// xl:note 逗号开头的续行**不是**放行条件：`const n = a<b` 换行 `, c = d > e;` 里 `<…>` 后面没有 `(`，TS 那边是两条声明（`n = a<b` 与 `c = d > e`），`<` 与 `>` 都是比较运算符
// xl:round 915
// xl:expect BinaryOperator,SymbolToken,Identifier,Let
// xl:absent GenericType
// xl:end
const n = a<b
, c = d > e;
