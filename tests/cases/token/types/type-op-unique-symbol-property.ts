// xl:note unique symbol 类型的属性（readonly + typeof 查询）
// xl:expect Interface,InterfaceBody,TypeDefine,Keyword
declare const tag: unique symbol
interface I {
  readonly t: typeof tag
}
