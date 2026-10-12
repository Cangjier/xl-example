// xl:expect Function,GenericType,TypeLiteral,TypeLiteralBody
// xl:note 基线用例（来自缺口审计语料）
function f<T extends object = {}>(a: T): T {
  return a
}
