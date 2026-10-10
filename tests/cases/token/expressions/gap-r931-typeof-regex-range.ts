// xl:note 正则字面量当一元运算符的操作数时，父节点的区间比 TS 长一格（第 931 轮片段普查量出）：
// `const t = typeof /re/;` 在 TS 那边 `TypeOfExpression` 是 `[10, 21)`（到收尾那个斜杠为止），
// 而产物是 `[10, 22)`——**把后面那个 `;` 也算进去了**（漂移 1 + 多 1，后面还有一条语句时同样）。
// 根因**尚未量清**：`RegexToken` 单元的区间比它投影出的 `RegularExpressionLiteral` 多一个字符
//（终结符被算进单元里，见 `tokens/regex-token.xl.md` 的 `PrintAst`）；
// 这一格是**父节点**按子单元的区间算的，于是多出来的那一格传到了 `TypeOfExpression` 上。
// 只有正则**自己**当二元左操作数那种能折的链不受影响（`/re/ / 2 / 3` 随本轮一起收掉了）。
// xl:known-gap 正则字面量单元比 TS 节点多一个字符的区间传给了父节点，根因尚未量清
const t = typeof /re/;
