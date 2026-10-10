// xl:note 下一行以 `/` 开头（第 931 轮片段普查量出的那一族）：`const a = 1` 换行 `/ 2 / 3;`
// 在 TS 那边是**一条** `BinaryExpression`（除号接着上一行那个操作数写），
// 而解析期的续接表（`Statement.NextLineContinuesExpression`）里没有 `/`
// ⇒ 换行处收壳 ⇒ 后半截另起一条壳、`/ 2 /` 还被读成一条 `RegularExpressionLiteral`。
// 夹一条注释的那一档同根：`NextLineFirstCharAt` 走 `SkipSourceTriviaFrom`，注释本来就被跳过。
// xl:expect BinaryOperator:4
const a = 1
/ 2 / 3;
const b = 0b1010 /*c*/
/ 1_000 / 10n;
