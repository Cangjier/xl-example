// xl:note 联合成员带类型实参：`X | Foo<Bar>` 里的 `<Bar>` 必须是 GenericType（曾经被判成比较运算符）
// xl:expect UnionType,GenericType,Identifier
type X = A | Foo<Bar>
