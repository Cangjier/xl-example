// xl:note 接口的 `extends` 也认**括号化的实体名**（第 955 轮）：`interface I extends (J) {}` 里那对圆括号
// 是**实体名的一部分**（TS 那边是 `HeritageClause > ExpressionWithTypeArguments >
// ParenthesizedExpression > Identifier`，`ExpressionWithTypeArguments` 的区间含括号）。
// 与类那一侧**同形**——`HeritageClause.ClauseEnd` 早写着「`(` 不是边界，括号属于那个实体名」，
// `decl-class-extends-parenthesized` 一直是好的。根因在 `InterfaceBranch.ScanHead`：
// `extends` 名单里实体名那一格只认 `Identifier`（走 `TakeDottedName`）⇒ 撞上 `(` 就答否
// ⇒ 整个接口头不成立 ⇒ **整条声明退回 `ExpressionStatement`**（缺 `InterfaceDeclaration` 6 项）。
// 修法：实体名那一格是 `(` 括号时跨过它（**名字文本不收**，与类那条路逐字一致：
// `class C extends (a.b) {}` 的 `extends=""`），括号里是什么由 `ExpressionWithTypeArguments.PrintAst`
// 自己投（它早就有括号那一支）。
// xl:round 955
// xl:expect Interface:3,HeritageClause:3,ExpressionWithTypeArguments:4,Bracket:4
// xl:absent ExpressionStatement
// xl:end
interface I extends (J) {}
interface K extends (A.B) {}
interface L extends (A<B>), (C) {}
