// xl:known-gap `as T![]`：`As` 里那一对空下标落成了 `TupleType`（`as T[]` 那一档落的是 `ArrayType`），
// 投影的类型那一趟认不出它 ⇒ 缺 `ArrayType` + `JSDocNonNullableType`（实测缺 2）。
// 第 1207 轮量到：把 `!` 收进 `As` 之后，`as T![]` 的产物是
// `As > [Identifier(T), SymbolToken(!), TupleType([])]`，而 `as T[]` 的产物是
// `As > [ArrayType > Identifier(T)]`——空下标对前面夹着一个 `!` 时括号上下文判成了元组。
// xl:round 1207
// xl:end
declare const f: any;
type T = any;

const q = f() as T![];
