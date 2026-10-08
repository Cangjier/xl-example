// xl:note 接口里的两个重载签名
// xl:expect Interface,InterfaceBody,MethodDeclaration,TypeDefine
// xl:known-gap 注释夹在接口重载名与参数表之间：第二条签名认不出（r660 探针池 mut-type-overload-interface-126）
interface I {
  f(x: number): void
  f/* c */(x: string): void
}
