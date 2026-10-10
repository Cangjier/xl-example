// xl:note 类型谓词里**名字与 `is` 之间换行**（第 931 轮片段普查量出）：
// `declare function f(x: unknown): asserts x` 换行 `is string;` 在 TS 那边是一条
// `TypePredicate`（区间从 `asserts` 跨到 `string`），而产物在换行处收壳 ⇒ 谓词只到 `x`、
// `is string` 另起一条语句（缺 `StringKeyword`、多 `Identifier` + `ExpressionStatement`；
// 带体那一支还缺整个 `Block`）。
// **注意与第 907 轮那一条的分界**：`asserts` 与**名字**之间换行是 TS 自己就不收的写法
//（那一轮量过，是口径边界）；这里换行的是**名字与 `is` 之间**，TS 收得下。
// xl:known-gap 类型谓词的 `is` 前面那一格没有跨换行（解析期的续接表不认识它）
declare function f(x: unknown): asserts x
is string;
function g(x: unknown): asserts x
is string {}
