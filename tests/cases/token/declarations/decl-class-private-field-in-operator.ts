// xl:note #private 字段与 #x in obj 访问检查
// xl:expect Class,ClassBody,Field,MethodDeclaration,MethodBody
class C {
  #a = 1
  has(o: object) {
    return #a in o
  }
}
