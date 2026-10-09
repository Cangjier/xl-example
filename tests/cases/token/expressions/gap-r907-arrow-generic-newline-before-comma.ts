// xl:note 箭头函数的泛型参数表：`<T` 与 `,>` 之间换行（第 907 轮片段普查量出）：TS 那边整条是一条 `ArrowFunction`，产物把 `<` 折成 `LessThanToken`、`(a: T) => a` 落进另一条语句（缺 `ArrowFunction` / `TypeParameter` / `Identifier`）
// xl:round 907
// xl:known-gap 解析期在换行那一刻判「这一行写完了」（左边是 `T`、下一行以 `,` 起头——逗号那一档不在续接表里），泛型段还没成形
// xl:end
const f = <T
,>(a: T) => a;
