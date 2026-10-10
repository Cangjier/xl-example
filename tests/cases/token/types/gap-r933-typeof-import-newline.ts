// xl:note `typeof import` 与它的形参表之间换行（第 933 轮片段普查量出）：
// `type T = typeof import` 换行 `("m");` 在 TS 那边是一个 `ImportType`
//（`typeof import("m")` 整段，区间跨过那个换行），而产物把换行判成语句边界 ⇒
// 类型别名只到 `import`、`("m");` 另起一条语句
//（缺 `ImportType` + `LiteralType`，多 `TypeQuery` + `ParenthesizedExpression` + `ExpressionStatement`）。
// 与第 875 轮收掉的 `typeof` 与 `import(...)` 之间的**注释**那一格同族（那一格是 trivia 口径），
// 这一档差的是**软换行**。根因**第 934 轮量清了**：解析期那张「哪些词结束得了一条语句」的
// 表（`Statement.ExpectsOperand`）里没有 `import`——而 `import` 是保留字，它后面必须跟东西
//（子句 / 名字 / `(`），所以「一行以 `import` 收尾」永远不是写完了。补进那张表之后换行不再
// 收壳；**同一族的第二面**（`typeof import` 换行 `("m")` 落在成员位时，
// `SignatureCloseRule` 会把括号抢成无名签名）另有一格判据，见 `IsImportTypeArguments`。
// 第 934 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）。
type T = typeof import
("m");
