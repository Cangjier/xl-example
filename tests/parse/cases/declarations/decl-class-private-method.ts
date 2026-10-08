// xl:note #private 方法（含 static #private 与 #private getter）
// xl:expect Class,ClassBody,MethodDeclaration,MethodBody
class C {
  #m() {
    return 1
  }
  static #n() {}
  get #v() {
    return 1
  }
}
