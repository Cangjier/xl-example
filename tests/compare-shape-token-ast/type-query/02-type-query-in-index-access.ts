// token: TypeQuery
// xl:note 下标访问的类型位：`A[typeof x]` 里是类型查询（Keyword），不是一元运算
// xl:expect Keyword
// xl:absent UnaryOperator
let value: A[typeof x]
