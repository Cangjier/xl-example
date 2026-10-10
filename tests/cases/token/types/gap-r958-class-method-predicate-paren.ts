// xl:note 谓词里那个括号落在**类成员的返回类型位**、而那条成员**又带方法体**时，
// 整条 `MethodDeclaration` 仍然不成形（第 958 轮片段普查量出，同一族里剩下的最后一格）：
// `class C { m(x: unknown): x is (string) { return true; } }` 里 TS 是一条
// `MethodDeclaration`（形参表 `(x: unknown)` + `TypePredicate > ParenthesizedType` + `Block`），
// 而产物把 `(string)` 当成 `is` 的形参表、把 `{ return true; }` 当成它的体
// ⇒ 整条 `m` 塌成一个调用 `m(x: unknown)`（缺 `MethodDeclaration` / `Parameter` /
// `TypePredicate` / `ParenthesizedType` / `Block`，多 `CallExpression` / `TypeReference`）。
//
// **不带体的那三档都是好的**（都收在 `gap-r956-predicate-paren-type` 里）：
// `interface I { m(x: unknown): x is (string) }`、`type T = { m(x: unknown): x is (string) }`、
// `abstract class C { abstract m(x: unknown): x is (string); }` —— 差别只在**有没有体**：
// 有体时 `ScanDeclarationBody` 一路扫到那个 `{`，于是「名字 + `(` + 体」这个形状成立。
//
// **试过并撤回的一版**（记下来，别再试）：把闸门下在 `MethodDeclarationCloseRule.Previous`
// 的入口（判据与 `MethodCloseRule` 共用同一个 `Claim`）。两版都是**净回归**——
// 不再限定「这一格是圆括号」的一版把 18 条普通方法声明一起判否（片段 2 → 20 条对不上）；
// 限定之后再试，`const h = (x: unknown): x is (A | B) => true;` 那一条又开始塌
//（谓词区间漂到箭头右端）。本规则那一趟的 `index` 会落在**返回类型那一段自己**上
//（`[":", 名字, "is", 括号]`），在那里问一次谓词就把整条声明误判掉。
//
// **入手处**：根在 `BodyIndex` / `ScanDeclarationBody` 那条路径上（它判「形参表后面
// 是不是一个体」），不在规则的先后上——那一格要能认岀「这一对 `(` 是**谓词的类型**、
// 不是本签名的形参表」（`IsTypeContinuationBefore` 那一支已经在做同类的事）。
// xl:known-gap 谓词落在带方法体的类成员返回类型位上时整条 MethodDeclaration 不成形（缺 6 / 多 2）
// xl:end
class C {
  m(x: unknown): x is (string) { return true; }
}
class D {
  m(x: unknown): asserts x is (string) { return; }
}
