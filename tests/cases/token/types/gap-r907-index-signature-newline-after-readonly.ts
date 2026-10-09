// xl:note 索引签名的 `readonly` 与 `[` 之间换行（第 907 轮片段普查量出）：TS 那边是 `IndexSignature`（`readonly` 是它的修饰词），产物把 `readonly` 落成 `PropertySignature`、`[k:string]:number` 落成计算属性名（缺 `IndexSignature` / `Parameter` / `StringKeyword`）
// xl:round 907
// xl:known-gap 索引签名那一支的判据要求修饰词与 `[` 相邻（只跳软换行），换行之后 `readonly` 与 `[` 分成两格
// **第 910 轮**：收掉了**一半**——原来 `[k:string]:number` 整条认不出索引签名
//（缺 `IndexSignature` / `Parameter` / `StringKeyword`，多 `ComputedPropertyName`），
// 因为 `readonly` 那个换行先被 `FieldCloseRule.Previous` 当成「只有名字的字段」的延续、
// `readonly` 自己成了一条成员，`[` 那一趟再也看不到它。判据补在**换行那一格**上
//（下一格是 `[` 且里面真是索引签名形状 ⇒ 这一格是修饰词）。
// **剩下的半边是 TS 自己的读法**（实测 `ts.createSourceFile`）：`interface I { readonly` 换行
// ` [k:string]:number }` 里 TS 给的是 **`PropertySignature`（名字就是 `readonly`）
// + `IndexSignature`** 两条——也就是「换行之后 `readonly` 不是修饰词、是属性名」，
// 而那两条 TS 自己都报诊断（`ts.getPreEmitDiagnostics` 非空）。本仓现在给的是
// `IndexSignature` 带上一个 `ReadonlyKeyword` 修饰词 ⇒ 缺 `PropertySignature` + `Identifier`、
// 多 `ReadonlyKeyword`。这一半要「按 TS 的恢复形状投出两条成员」，另开一轮。
// xl:end
interface I { readonly
 [k:string]:number }
