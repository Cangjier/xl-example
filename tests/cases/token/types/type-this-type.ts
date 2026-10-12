// xl:note this 类型作为接口方法的返回类型（this 属于 Keyword 表）
// xl:expect Interface,InterfaceBody,MethodDeclaration,Keyword
interface I {
  clone(): this
}
