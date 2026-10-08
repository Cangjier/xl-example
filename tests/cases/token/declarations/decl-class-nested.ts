// xl:note 方法体里定义嵌套类
// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
class Outer {
  m() {
    class Inner {
      n() {}
    }
    return Inner
  }
}
