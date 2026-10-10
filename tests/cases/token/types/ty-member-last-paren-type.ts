// xl:note 成员的**类型 / 返回类型套一层圆括号**，而它是这一条成员的最后一格（第 956 轮片段普查量出）：
// `type T = { a: (B) }` / `interface I { m(): (B) }` / `type T = { get a(): (B) }` 里那对圆括号
// 是 `ParenthesizedType`，产物却把它收成一条无名 `<Signature kind="call">`（缺 `ParenthesizedType`
// + `TypeReference`、多 `CallSignature` + `Parameter`）。**根因**：`SignatureCloseRule.Previous`
// 看见「成员位置上的一对 `(`」就按「无名签名的形参表」收，而**后面没有别的成员**时
// `HasSignatureTail` 答真（有 `;` / `,` / 下一条成员时它答否，所以此前只有**最后一条**中）。
// **修法**：多问一句「上一个实义单元是不是 `:` / `?:`（成员的类型标注）」——签名语法里形参表
// 前面不会有冒号；软换行与注释都跳（`a:` 换行 `(B)` 与 `a: /*c*/ (B)` 同形），
// `?:` 在产物里是**一格** `SymbolToken`（`MethodDeclarationCloseRule.IsTypeContinuationBefore`
// 就是这么认的）。这一问仍长在本规则里，形状判据一条没新写。
// xl:round 956
// xl:expect TypeLiteral:5,ParenthesizedType:11,Interface:1
// xl:end
type A = { a: (B) };
interface I { m(): (C); readonly n?: (D) }
type E = { get g(): (F) };
class K { a: (H); m(): (I) {} }
type J = { [P in Q]: (R) };
type L = { a: ((M)) };
type N = { o: (P | Q) };
type O = { p:
(S) };
