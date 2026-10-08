// xl:note 自动访问器修饰符 `accessor`（TypeScript 4.9）：产物必须是 **Field 直接落在
// ClassBody 里**、且 `accessor` 进 `modifiers`。曾经它会被当成裸名字，成员退化成
// `<Statement><Identifier>accessor</Identifier><Field …/></Statement>`——多包一层 Statement，
// 而原来的期望只写了 `Class,ClassBody`，看不出这层错位（实测）。
// xl:expect Class,ClassBody,Field:3
abstract class C {
  accessor x = 1
  static accessor y = 2
  abstract accessor z: number
}
