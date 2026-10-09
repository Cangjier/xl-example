// xl:note 顶层：`abstract` 与 `class` 之间换行（657 审计语料那一族的顶层版）
// xl:expect Class,ClassBody,Keyword,Root
// xl:known-gap 修饰词换行：`abstract` 已经不再收进 `modifiers` 了，可它作为**散词**被 `KeywordCloseRule` 升级成 `<Keyword>` ⇒ 投影多一个 `AbstractKeyword`；TS 那边是 `ExpressionStatement > Identifier`（顶层那个词的归宿是语句层，不在这一轮）
abstract
class A {}
