// xl:expect Interface,GenericType,TypeLiteral,TypeLiteralBody
// xl:note 基线用例（来自缺口审计语料）
interface I<T extends object = {}> {
  m(): void
}
