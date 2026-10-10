// xl:note 带符号的数字字面量类型：`-` 与数字之间夹一条注释（第 948 轮片段普查量出）。
// `type T = -/*c*/1;` 在 TS 那边是一个 `LiteralType > PrefixUnaryExpression{ - , NumericLiteral }`，
// 而 `IsSignedNumberStart` 原来只跳**软换行**（`SkipNextWrapSymbol`）⇒ 夹注释时判否
// ⇒ `-` 留在外面当 `SymbolToken`、只有数字被包成 `LiteralType`
//（实测 `type A = -/*c*/1 | 0 | 1;`：缺 `LiteralType` / `PrefixUnaryExpression` / `NumericLiteral`
// 各 1、多 `MinusToken` 1）。修成 `SkipNextTrivia`——「下一个实义单元」的统一口径。
// **中间那条注释要跟着搬进新节点**：`ReplaceCountAt` 是整段替换，只把 `-` 与数字加进来
// 就把注释从树上抹掉了（它在 XML / AST JSON 两个出口里是真实存在的文本）；软换行照旧不进。
// 三条各一个排版：夹区域注释、夹行注释、注释两侧留空格。
// xl:expect LiteralType:5,AreaAnnotation:2,LineAnnotation
// xl:absent UnaryOperator
type T = -/*c*/1 | 0 | 1;
type U = -//c
2;
type V = - /*c*/ 3;
