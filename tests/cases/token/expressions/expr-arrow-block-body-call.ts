// xl:note 箭头函数体里的调用是 Method，不是 MethodDeclaration（块体不再是类型字面量）
// xl:expect Lamda,Method
// xl:absent TypeLiteral,MethodDeclaration
const f = async () => {
  await g(a)
}
