// xl:note 可选调用 / 非空断言调用都是调用节点：`a?.()` / `a.b?.()` / `b!()`（第 66 轮）
// xl:expect Method:4,NullConditionalOperator:5,NotNull
const a = b?.();
const c = d.e?.();
const f = g!();
const h = i?.j.k?.l?.();
