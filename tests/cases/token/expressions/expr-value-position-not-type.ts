// xl:note 值位的方括号与 typeof 不许被收成类型节点（第 66 轮的对照组）
// xl:absent ArrayType,TupleType,IndexedAccessType,TypeOperator,TypeQuery
const o = { a: b[0] };
const p = [1, 2];
const q = typeof r;
