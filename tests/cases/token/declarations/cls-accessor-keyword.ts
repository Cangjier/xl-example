// xl:note `accessor` 是修饰符而不是名字：`accessor x = 1` 里 `x` 才是字段名，
// 产物不能出现「名字为 accessor 的成员」，也不能多出一层 `<Statement>` 包住成员。
// xl:expect Field
// xl:absent MethodDeclaration
class A {
  accessor x = 1
}
