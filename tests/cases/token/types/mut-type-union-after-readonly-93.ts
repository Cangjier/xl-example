// xl:note 可选标记与冒号之间夹着注释：`refs?/* c */: readonly (A | B)[]`
// xl:expect UnionType,TypeOperator,ArrayType,ParenthesizedType
// 第 855 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `refs?/* c */:` 里那个 `:` 被判成**三元表达式的冒号**（`TypeDefineCloseRule.Previous`
// 原来问的是「往前找到过任何 `?`」）⇒ 整段类型标注不收，
// `TypeOperator` / `ArrayType` / `ParenthesizedType` / `UnionType` 四层一起丢。
// 修法两处：`type-define.xl.md` 的 `HasTernaryQuestion`（配对计数、只认同一层的 `?`）
// 与 `field.xl.md` 的 `PrintAst`（可选标记是 `TypeDefine` 的兄弟时要去兄弟里找它）。
interface I {
  refs?/* c */: readonly (A | B)[]
}
