// xl:note 接口索引签名：字符串 / 数字 / 只读
// xl:expect Interface,InterfaceBody
interface I {
  [key: string]: number
  readonly [index: number]: string
}
