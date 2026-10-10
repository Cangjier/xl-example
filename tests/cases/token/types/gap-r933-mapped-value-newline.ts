// xl:note 映射类型的**值那一格**换行（第 933 轮片段普查量出）：
// `type T = { [K in keyof U as `k${K}`]:U` 换行 `[K] };` 在 TS 那边值是一个
// `PropertySignature` 带 `ComputedPropertyName`（`[K]` 整体是名字），而产物把 `U\n[K]`
// 读成一个 `IndexedAccessType`（缺 `PropertySignature` + `ComputedPropertyName`、
// 多 `IndexedAccessType` + `TypeReference`，字段名那一栏也差一项）。
// **同一个构造的其它排版**（`as` 后换行、`]` 后换行、冒号后换行）都是对的——
// 差别是**名字 `U` 与下标 `[` 之间**那个换行，根因**尚未量清**。
// xl:known-gap 映射类型的值那一格：名字与下标之间换行时 `[K]` 被读成 IndexedAccessType
type T = { [K in keyof U as `k${K}`]:U
[K] };
