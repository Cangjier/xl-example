// xl:note 非空断言 `expr!` 现在收成一个 `NotNull` 节点（原来是把 `!` 直接删掉，
// 于是 `a!` 与 `a` 的产物完全一样）。TypeScript 的 AST 里它就是 NonNullExpression
// xl:expect Let,Common,NotNull,Symbol
// xl:absent Field
const value = candidate!;
