// xl:note this is T 形式的类型判定
// xl:expect Interface,InterfaceBody,MethodDeclaration,Keyword
interface I {
  check(): this is Foo
}
