// xl:note 索引签名的 `readonly` 与 `[` 之间换行（第 907 轮片段普查量出）：TS 那边是 `IndexSignature`（`readonly` 是它的修饰词），产物把 `readonly` 落成 `PropertySignature`、`[k:string]:number` 落成计算属性名（缺 `IndexSignature` / `Parameter` / `StringKeyword`）
// xl:round 907
// xl:known-gap 索引签名那一支的判据要求修饰词与 `[` 相邻（只跳软换行），换行之后 `readonly` 与 `[` 分成两格
// xl:end
interface I { readonly
 [k:string]:number }
