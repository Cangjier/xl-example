// xl:note 非空断言：`a` 与 `!` 之间夹一条注释。注释是 trivia，
// 断言照样成形，而且注释被**包进** `NotNull`（TS 的 `NonNullExpression` 区间就是 `a/*a*/!`）
// xl:expect NotNull,Identifier,SymbolToken
a/*a*/!
