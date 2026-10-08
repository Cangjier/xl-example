// xl:note 基线用例（来自缺口审计语料）
// xl:expect ExpressionWithTypeArguments,HeritageClause,MethodBody,MethodDeclaration
class A extends B {
  constructor() {
    super(1, 2)
  }
}
