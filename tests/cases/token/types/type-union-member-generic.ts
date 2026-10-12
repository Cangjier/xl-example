// xl:note 类型位联合的成员带类型实参 / 限定名：`ArrayLike<number>` 与 `NodeJS.TypedArray` 必须各自成形（第 76 轮的投影层按 `|` 切成员后整段投，缺这一段会把实参丢成兄弟节点、把限定名拆成两个 `Identifier`）。
// xl:expect UnionType,GenericType,Identifier:4
type T = ArrayLike<number> | NodeJS.TypedArray;
