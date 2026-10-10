// xl:note 第 929 轮片段普查量到的一族：被标语句的**头部与它自己体之间**换行。
// xl:round 930
// 第 930 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：根因在
// `statement.xl.md` 的 `StatementBranch.Condition` 「声明头里的换行不是语句边界」那一支 ——
// 它是**从段首**看第一个词的，而 `iface: interface I` 的段首是**标签名** `iface`
// ⇒ 词表问不到 `interface` / `enum` ⇒ 换行处收壳 ⇒ 被标的声明与它的体分家
//（`while` 那两格走的是另一条判据，第 930 轮同趟由 `HasTypeColonBefore` 那一侧收掉）。
// 现在那一支先跳过标签头（`LabelCloseRule.SkipLabelHeads`，与 `Previous` 同源）。
// xl:expect Label:3,While,WhileBody,Interface,InterfaceBody,MethodDeclaration,Enum,EnumBody,EnumMember,Keyword,TypeDefine
// xl:end
lbl: while
(a) { break lbl; }
iface: interface I
{ m(): void }
en: enum E
{ A }
