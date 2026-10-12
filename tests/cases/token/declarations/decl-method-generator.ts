// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
// xl:note 生成器方法（`*g() {}`）：`*` 在**名字前面**，它作为子单元留在节点里
//（丢了就分不出生成器方法与普通方法）；类里与接口里的两种写法都要成形
class C {
  *g() {
    yield 1
  }
}
