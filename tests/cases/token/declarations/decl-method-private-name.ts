// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
// xl:note 私有方法 `#m() {}`：名字是 `#m`，`#` 作为子单元留在节点里。
//（与私有字段同一套判定：`#` 在行首不再被预处理器分支吃掉）
class C {
  #m() {
    return 1
  }
}
