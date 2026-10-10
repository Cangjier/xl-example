// xl:note 元组里的变长元素、空方括号里只有一条注释：`...number[/*c*/]`
// xl:round 922
// xl:known-gap 空方括号里只有注释时**内容判空是对的**（`IsEmptyContentUnit` 第 680 轮就跨 trivia 了），
// 出问题的是「**左操作数**」那一格：`...number` 先被 `SpreadCloseRule` 收成了一个 `Spread` 单元，
// 于是方括号规则把**整个 `...number`** 当成被数组化的类型（实测多出 `ArrayType[20,36)` 与
// `SpreadElement[20,29)`、缺 `RestType` / `ArrayType` / `NumberKeyword`）。
// 不带 `...`（`[string?, number[/*c*/]]`）与不带注释（`[...number[]]`）两种写法都是对的，
// 说明缺的是「展开规则在**类型位的空方括号**前面让路」那一格（与第 921 轮链规则那一格同形）。
// xl:expect TupleType:1
// xl:end
type T = [...number[/*c*/]];
