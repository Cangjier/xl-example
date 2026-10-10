// xl:note 第 959 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 谓词里那个括号落在**类成员的返回类型位**、而那条成员**又带方法体**时，整条
// `MethodDeclaration` 不成形——`class C { m(x: unknown): x is (string) { return true; } }`
// 里 TS 是一条 `MethodDeclaration`（形参表 + `TypePredicate > ParenthesizedType` + `Block`），
// 而产物把 `(string)` 当成 `is` 的形参表、把 `{ return true; }` 当成它的体
// ⇒ 整条 `m` 塌成一次调用（缺 `MethodDeclaration` / `Parameter` / `TypePredicate` /
// `ParenthesizedType` / `Block`，多 `CallExpression` / `TypeReference`）。
//
// **根因在 `BodyIndex` 往回走那一趟的第 598 轮边界上**：`ScanDeclarationBody` 一路扫到
// 那个 `{`，往回走撞上的第一对 `(` 是谓词里那对 `(string)`——它前面是 `is`、
// **不是一个类型续接符**，所以 `IsTypeContinuationBefore` 给假；于是那一趟拿它跟
// 「本签名自己的形参表」比原文。而 `m` 那一趟往回走得多一格：`(x: unknown)` 与它逐字相同
// ⇒ 中途 `break`、跳过 `is` 与 `(string)` 直接答真 ⇒ `is` 被认成「名字 + `(` + 体」。
//
// **修法**：往回走那一趟多认一格——**「这一对括号是谓词里的类型」时接着往回找**
//（与类型续接符那一支同一个去处），由真正的形参表决定这一条声明有没有体。
// 判据**转发**给谓词那条规则的同一份实现（`TypePredicateCloseRule.Claim`，第 957 轮
// 起装在 `MethodCloseRule.PredicateShape` 上；第 959 轮把同一个箭头函数也装到
// `MethodDeclarationCloseRule.PredicateShape`）——第 875 轮的规矩：判据只有一份。
// 那一份判据答真的同时会把括号当场收成 `ParenthesizedType`，所以**先取括号、再去问**。
//
// **为什么不是第 958 轮撤回的那一版**：那一版把闸门下在 `Previous` 的入口（问「这一格
// 整体是不是一条方法声明」），一次普通调用 `m(x: unknown)` 也在覆盖之内——实测 18 条
// 普通方法声明一起判否（片段 2 → 20 条对不上）。这里问的是**往回走的那一对括号**，
// 只在「已经认定这一格有一个体」之后才轮到它。
//
// 两档守卫：带方法体的类成员（`C`）与 `asserts` 那一档（`D`）；
// 不带的体那三档在 `gap-r956-predicate-paren-type` 里。
// xl:end
class C {
  m(x: unknown): x is (string) { return true; }
}
class D {
  m(x: unknown): asserts x is (string) { return; }
}
