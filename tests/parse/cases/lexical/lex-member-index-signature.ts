// xl:expect Interface,InterfaceBody,Field
// xl:note 索引签名（接口里、类型字面量里、类里）都收成 Field：
// `[key: string]: T` / `[index: number]: T`
interface I {
  [key: string]: number
}
