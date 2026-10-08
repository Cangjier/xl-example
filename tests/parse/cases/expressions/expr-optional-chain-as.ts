// xl:note 可选链后面接 `as` / `satisfies`：断言折在整条链外面（第 664 轮）
// xl:expect As,Satisfies,NullConditionalOperator
a?.b as T;
c?.d satisfies U;
e?.f() as T;
g?.() as T;
h?.[0] as T;
