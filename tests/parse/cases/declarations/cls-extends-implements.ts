// xl:expect Class,ClassBody,TypeLiteral,TypeLiteralBody
// xl:note 基线用例（来自缺口审计语料）
class A<T = {}> extends B<T> implements C, D {
  m() {}
}
