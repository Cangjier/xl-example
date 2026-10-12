// xl:note 元组里的变长元素、空方括号里只有一条注释：`...number[/*c*/]`
// xl:round 922
// 第 923 轮收掉（已知缺口）：缺 `RestType` / `ArrayType` / `NumberKeyword`，
// 多出 `SpreadElement` 与 `Identifier`——`...number` 先被 `SpreadCloseRule` 收成了 `Spread`。
// 根因是 `IsTupleRest` 的「空方括号」判据写成了 `Data.length === 0`：这个方括号里装着
// 一条注释 ⇒ 长度是 1 ⇒ 判否。注释是 trivia，`number[/*c*/]` 与 `number[]` 是同一个类型，
// 所以改成与方括号那三条规则**同一个** `IsEmptyContentUnit`（它从第 680 轮起就跨 trivia）。
// `[...number[]]`（不带注释）与 `[string?, number[/*c*/]]`（不带 `...`）照旧。
// xl:expect TupleType:1
// xl:end
type T = [...number[/*c*/]];
