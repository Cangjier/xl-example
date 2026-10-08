// xl:note 顶层 `asserts x is A` 谓词
// xl:known-gap 断言谓词只在返回类型那一位成形，落到类型别名右边就不成形（缺 5 多 2）
// xl:expect TypeAssign,Keyword
type T9 = asserts x is A;
