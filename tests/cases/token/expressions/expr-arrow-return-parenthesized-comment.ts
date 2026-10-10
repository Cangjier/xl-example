// xl:note 返回类型那一格的两侧夹注释时，括号仍在类型位——注释与软换行是同一件事
// xl:round 928
// 第 928 轮第二趟普查（`tmp/r928/gen2.mjs`：12 个构造 × 每个相邻位置 × `/*c*/` / 换行 = 780 条，
// 534 条合法）量出的三格全是这一根：`const k = ():/*c*/(() => void) => …` 与
// `A extends/*c*/(() => infer R) ? R : never` 里，括号都是**类型位**，而
// `LamdaCloseRule.IsWrappedByTypeContext` 的那趟回扫只跳软换行 ⇒ 第一步撞上注释
// ⇒ 落到末尾那句 `return false`（值位）⇒ 括号里那段函数类型被收成**箭头函数**
//（实测缺 `FunctionType` / `InferType`，多 `ArrowFunction` + `EqualsGreaterThanToken`；
// 把注释换成换行一直是绿的）。修法照旧：**判据跨过什么，别处就得跨过什么**（第 873 轮那条线）。
// xl:expect Lamda,ParenthesizedType,FunctionType,InferType
// xl:end
const k = ():/*c*/(() => void) => { return; };
type X = A extends/*c*/(() => infer R) ? R : never;
