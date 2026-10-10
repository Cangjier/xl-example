// xl:known-gap 第 985 轮第十批底样（嵌套宿主）量出：**类型位里的 `!`** 在 TypeScript 那边是 `JSDocNonNullableType`（`a!` 两格全包：`type T = a!` 缺 1 漂 0 多 0；`type T = (a!)` 缺 2 漂 0 多 1，那一格我们收成了 `NonNullExpression`）。入手处：类型位的 `!` 现在没有自己的节点（`NotNullCloseRule` 只在值位成形），投影侧也没有 `JSDocNonNullableType` 这一档。
// xl:note 类型位里的 `!`：TS 读成 `JSDocNonNullableType`（JSDoc 时代的那一档）
type T = a!;
type U = (a!);
type V = Box<a!>;
type W = a! | b!;
