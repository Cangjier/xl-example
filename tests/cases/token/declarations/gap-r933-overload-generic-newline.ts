// xl:note 重载声明的**类型参数表与形参表之间**换行（第 933 轮片段普查量出）：
// `class A { m<T>` 换行 `(a:T):void; m(a) {} }` 在 TS 那边是一条 `MethodDeclaration`
//（形参表跨过那个换行），而产物把 `(a:T):void;` 判成了另一个成员
//（缺 `MethodDeclaration` + `TypeParameter`，多 `TypeReference` + `CallSignature`）。
// 与第 904 轮收掉的「抽象方法的泛型参数表换行」同一族（那一格根在 `SignatureCloseRule`
// 的泛型支），这一格的根**第 934 轮量清了**：同一条分工线上，`SignatureCloseRule` 的
// `(` 那一支靠 `NameOnPreviousLine` 让路，而那一问原来只看「换行前面那一格是不是名字」——
// `m<T>` 换行 `(…)` 里那一格是**类型参数段**（`<T>`）、名字在再往前一格 ⇒ 这一问答否
// ⇒ `(a:T):void;` 被抢成无名 `CallSignature`、`m` 只剩给类型位（`GenericType` 投成
// `TypeReference`）。判据收进那一份共用实现（`(` 与 `<T>` 两支问的是同一句话），
// 第 934 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）。
class A { m<T>
(a:T):void; m(a) {} }
