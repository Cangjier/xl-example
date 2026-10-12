// xl:note 映射类型的**值那一格**换行（第 933 轮片段普查量出）：
// `type T = { [K in keyof U as `k${K}`]:U` 换行 `[K] };` 在 TS 那边值是一个
// `PropertySignature` 带 `ComputedPropertyName`（`[K]` 整体是名字），而产物把 `U\n[K]`
// 读成一个 `IndexedAccessType`（缺 `PropertySignature` + `ComputedPropertyName`、
// 多 `IndexedAccessType` + `TypeReference`，字段名那一栏也差一项）。
// **同一个构造的其它排版**（`as` 后换行、`]` 后换行、冒号后换行）都是对的——
// 差别是**名字 `U` 与下标 `[` 之间**那个换行。根因**第 934 轮量清了**，两半：
// ① TypeScript 的 `parsePostfixTypeOrHigher` 只在**同一行**上吃 `[`
//（`while (!scanner.hasPrecedingLineBreak())`）⇒ 换行之后的方括号不是下标访问；
// ② 映射类型在值类型之后照样 `parseTypeMembers()`（`parseMappedType`）⇒ 那个 `[K]`
// 是一条 `PropertySignature`（名字是 `ComputedPropertyName`）。
// 于是产物这一侧要两处对齐：`type-bracket` 的 `Previous` 跨行让路、
// `field` 的成员体白名单收下 `MappedType`（判据：值类型之后、换行或 `;` 之后），
// 投影那一侧 `MappedType` 多出 `members` 一格。第 934 轮转绿
//（`xl:known-gap` 按规矩撤掉，用例留着当守卫）。
type T = { [K in keyof U as `k${K}`]:U
[K] };
