// xl:note 泛型接口：约束 + 默认值
// xl:expect Interface,InterfaceBody,GenericType,TypeLiteral,TypeLiteralBody
interface I<T extends object = {}> {
  value: T
}
