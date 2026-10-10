// xl:note 重载声明的**类型参数表与形参表之间**换行（第 933 轮片段普查量出）：
// `class A { m<T>` 换行 `(a:T):void; m(a) {} }` 在 TS 那边是一条 `MethodDeclaration`
//（形参表跨过那个换行），而产物把 `(a:T):void;` 判成了另一个成员
//（缺 `MethodDeclaration` + `TypeParameter`，多 `TypeReference` + `CallSignature`）。
// 与第 904 轮收掉的「抽象方法的泛型参数表换行」同一族（那一格根在 `SignatureCloseRule`
// 的泛型支），这一格的根**尚未量清**——量下来的是「过载那一份同样会中」。
// xl:known-gap 重载方法的类型参数表与形参表之间换行，根因尚未量清
class A { m<T>
(a:T):void; m(a) {} }
