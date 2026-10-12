// xl:note 类方法的返回类型标注（方法声明应有自己的节点与返回类型段）
// xl:expect MethodDeclaration,MethodBody,ReturnType
class C {
  m(): number {
    return 1
  }
}
