// xl:note 括号类型里的类型实参：`(A<B> | C)[]` 里的 `<B>` 必须认成泛型实参，联合也跟着成形
// xl:expect UnionType,GenericType
let value: (A<B> | C)[]
