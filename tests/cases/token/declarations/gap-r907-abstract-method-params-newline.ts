// xl:note 抽象方法的形参表与名字之间换行（第 907 轮片段普查量出）：TS 那边是 `MethodDeclaration`，产物把 `abstract override m` 落成 `PropertyDeclaration`、`():void;` 落成一条无名 `CallSignature`
// xl:round 907
// 第 910 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：两根——
// ① `SignatureCloseRule.Previous` 的 `(` 那一支只认「`(` 前面紧挨着的是名字」，
//    而这里名字在上一行 ⇒ 那一问看不见 `m`，`()` 被抢成无名 `CallSignature`。
//    补法与它下面「名字写在上一行」那一格**同一份判据**（`NameOnPreviousLine`）。
// ② 那份判据的词表里**没有 `override`**（`abstract override m` 里名字前面正是它）
//    ⇒ 一并补上。
// xl:end
abstract class B extends A { abstract override m
():void; }
