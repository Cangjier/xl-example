// xl:expect Class,ClassBody,MethodDeclaration,MethodBody,Field
// xl:note 字符串字面量成员名：`"a-b"() {}` 是**方法声明**（`MethodDeclaration`，名字进属性）、
// `"c-d" = 2` 是字段（`Field`）。
// 这条用例原来的期望写着 `Method` + `String`——`Method` 是**调用**节点（这里是声明），
// `String` 是名字还没进属性时的形状；现在名字在 `name` / `fieldName` 属性里
class C {
  "a-b"() {
    return 1
  }
  "c-d" = 2
}
