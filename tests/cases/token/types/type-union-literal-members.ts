// xl:note 字面量类型里的负号：`-1 | 0 | 1` 是一个联合，`-1` 不能被拆开
// xl:expect UnionType,Identifier:3
type T = -1 | 0 | 1
