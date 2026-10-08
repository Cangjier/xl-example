// xl:note 泛型类：约束 + 默认值
// xl:expect Class,ClassBody,GenericType,TypeLiteral,TypeLiteralBody
class Box<T extends object = {}> {
  value: T
}
