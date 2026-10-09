// xl:note 索引签名的 `readonly` 与 `[` 之间换行（第 907 轮片段普查量出）：TS 那边是 `IndexSignature`（`readonly` 是它的修饰词），产物把 `readonly` 落成 `PropertySignature`、`[k:string]:number` 落成计算属性名（缺 `IndexSignature` / `Parameter` / `StringKeyword`）
// xl:round 907
// 第 912 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：**907 / 910 两轮把 TS 的读法记反了**——
// 实测 `ts.createSourceFile` 给的是「`PropertySignature`（名字就是 `readonly`）+ `IndexSignature`」两条，
// 也就是**索引签名的修饰词必须与 `[` 同一行**（同一行写才是带 `ReadonlyKeyword` 的那一条，
// 见 `ty-readonly-index-signature-line`）。两根：
// ① `FieldCloseRule.Previous` 第 910 轮那一支（「换行后面那个 `[` 是索引签名 ⇒ 这一格是修饰词」）
//    整个撤掉 —— 按 TS 的读法 `readonly` 就是**一条只有名字的字段**；
// ② 撤掉之后剩下的半边是**成员边界**：`IsMemberBoundary` 那道 `HasTypeColonBefore` 护栏
//    往回扫会撞上成员体的 `{`、答「表达式」⇒ 那个 `[` 被当成 `readonly` 的下标续接、
//    整条被收成一个字段。护栏因此多一条例外：**换行前面那一格是声明修饰词 ⇒ `[` 起的是下一条成员**。
// **本格还留着一个没登记的余量**（同一族、另开一轮）：`interface I { readonly` 换行
// ` [Symbol.iterator](): T }`（`[` 是**计算名**、不是索引签名）在 TS 那边也是两条
//（`PropertySignature` + `MethodSignature`），本仓仍收成一条字段——那一格里 `[` 已经是
// `ArrayLiteral` 单位的形态，护栏的例外与 `isNameLike` 都只认 `Bracket`。
// xl:end
interface I { readonly
 [k:string]:number }
