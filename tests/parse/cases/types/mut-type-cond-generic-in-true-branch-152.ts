// xl:note 条件类型真分支里的类型实参：`? F<A, B> : C` 的泛型段必须成形（第 66 轮）
// xl:expect ConditionalType,Keyword
// xl:absent TernaryOperator
// xl:known-gap 注释夹在条件类型真分支的类型名与实参段之间：`F<A, B>` 不成形（r660 探针池 mut-type-cond-generic-in-true-branch-152）
type X = T extends U ? F/* c */<A, B> : C
