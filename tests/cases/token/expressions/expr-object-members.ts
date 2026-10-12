// xl:note 值位对象字面量的成员（第 81 轮）：产物是一串平级单元（`[a, :, 1, ,, b, ,, …]`），投影层按顶层逗号切成成员——`a: 1` 是 PropertyAssignment、`b` 是 ShorthandPropertyAssignment、`...rest` 是 SpreadAssignment、`m() {}` 是 MethodDeclaration（`properties` 里不再混进 `ColonToken` / `CommaToken`）；值位括号 `(a + b)` 是 ParenthesizedExpression（钉产物那一侧：它必须是个 `Bracket`，不能被读成类型位）。
// xl:note 投影的成绩由 cases:tsast 与 samples 的 TS 形状夹具量，这条用例钉的是**产物那一侧**的形状。
// xl:expect ObjectLiteral,ArrayLiteral,Spread,MethodDeclaration,BinaryOperator:2,Bracket:2
// xl:absent Field,TypeDefine,ParenthesizedType
const o = { a: 1, b, [k]: 2, ...rest, m() { return 1; } };
const p = (a + b) * 2;
