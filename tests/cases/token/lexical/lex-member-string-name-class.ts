// xl:expect Class,ClassBody,MethodDeclaration,MethodBody,Field
// xl:note 类里的字符串字面量方法名与字段名：`"m"() { }` / `"f" = 1`
class C {
  "m"() {
    return 1
  }
  "f" = 2
}
