// xl:note 接口合并：同名接口声明两次，两块接口体都要在
// xl:expect Interface,InterfaceBody
interface I {
  a: number
}
interface I {
  b: string
}
