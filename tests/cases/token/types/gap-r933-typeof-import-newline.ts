// xl:note `typeof import` 与它的形参表之间换行（第 933 轮片段普查量出）：
// `type T = typeof import` 换行 `("m");` 在 TS 那边是一个 `ImportType`
//（`typeof import("m")` 整段，区间跨过那个换行），而产物把换行判成语句边界 ⇒
// 类型别名只到 `import`、`("m");` 另起一条语句
//（缺 `ImportType` + `LiteralType`，多 `TypeQuery` + `ParenthesizedExpression` + `ExpressionStatement`）。
// 与第 875 轮收掉的 `typeof` 与 `import(...)` 之间的**注释**那一格同族（那一格是 trivia 口径），
// 这一档差的是**软换行**，根因**尚未量清**。
// xl:known-gap `typeof import` 与形参表之间的换行被解析期判成语句边界
type T = typeof import
("m");
